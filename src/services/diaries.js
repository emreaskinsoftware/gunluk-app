import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { sanitizeHtml, htmlToPlainText } from "../utils/sanitize";
import { MAX_CONTENT_CHARS, MAX_FILES } from "../utils/validation";
import { deleteFiles } from "./storage";

/**
 * Firestore veri katmanı.
 *
 * TÜM sorgular `where("userId", "==", uid)` içerir. Bu bir tercih değil,
 * zorunluluktur: firestore.rules bu filtreyi taşımayan sorguları reddeder.
 * (Eski Draft sayfası koleksiyonun tamamını çekiyor ve herkesin taslağını
 * gösteriyordu — kural + sorgu birlikte bu açığı kapatıyor.)
 */

export const DIARIES = "diaries";
export const DRAFTS = "drafts";

/** Tek seferde çekilecek azami kayıt — firestore.rules ile uyumlu. */
const PAGE_LIMIT = 200;

/** Taslakların yaşam süresi: 24 saat. */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/* --------------------------------------------------------------------------
   Okuma
   -------------------------------------------------------------------------- */

function mapSnapshot(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Kullanıcının günlüklerini en yeniden eskiye getirir.
 * Sıralama/filtreleme bellekte yapılır: tek dizin yeterli olur,
 * ek Firestore okuması ve maliyet oluşmaz.
 */
export async function fetchDiaries(userId) {
  const q = query(
    collection(db, DIARIES),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(PAGE_LIMIT)
  );
  return mapSnapshot(await getDocs(q));
}

/** Kullanıcının taslaklarını getirir. */
export async function fetchDrafts(userId) {
  const q = query(
    collection(db, DRAFTS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(PAGE_LIMIT)
  );
  return mapSnapshot(await getDocs(q));
}

/**
 * Tek bir kaydı kimliğiyle getirir ve SAHİPLİĞİ DOĞRULAR.
 *
 * DiaryView artık router state'ine değil bu fonksiyona dayanıyor; böylece
 * sayfa yenilendiğinde "Günlük bulunamadı" hatası oluşmuyor.
 */
export async function fetchEntry(collectionName, id, userId) {
  const snapshot = await getDoc(doc(db, collectionName, id));
  if (!snapshot.exists()) return null;

  const data = { id: snapshot.id, ...snapshot.data() };

  // Kurallar zaten engelliyor; bu ikinci kontrol savunma derinliği sağlar.
  if (data.userId !== userId) return null;

  return data;
}

/* --------------------------------------------------------------------------
   Yazma
   -------------------------------------------------------------------------- */

/**
 * Kaydedilecek veriyi normalleştirir ve temizler.
 * firestore.rules'taki `isValidEntry` ile aynı sınırları uygular.
 */
function buildEntry({ userId, content, rating, files, isDraft, createdAt }) {
  const safeContent = sanitizeHtml(content).slice(0, MAX_CONTENT_CHARS);
  const plainText = htmlToPlainText(safeContent).slice(0, MAX_CONTENT_CHARS);

  return {
    userId,
    content: safeContent,
    // Arama için düz metin kopyası: her aramada HTML çözümlemeye gerek kalmaz
    plainText,
    rating: Math.max(0, Math.min(5, Number(rating) || 0)),
    files: (Array.isArray(files) ? files : [])
      .filter((f) => typeof f === "string")
      .slice(0, MAX_FILES),
    isDraft: Boolean(isDraft),
    createdAt: createdAt || Timestamp.now(),
    updatedAt: serverTimestamp(),
  };
}

/** Yeni günlük oluşturur. */
export async function createDiary(payload) {
  const entry = buildEntry({ ...payload, isDraft: false });
  if (!entry.content) throw new Error("Günlük metni boş olamaz.");

  const created = await addDoc(collection(db, DIARIES), entry);
  return created.id;
}

/** Taslak oluşturur ya da mevcut taslağı günceller. Taslak kimliğini döndürür. */
export async function saveDraft(payload) {
  const entry = buildEntry({ ...payload, isDraft: true });
  if (!entry.content) throw new Error("Taslak metni boş olamaz.");

  if (payload.draftId) {
    await updateDoc(doc(db, DRAFTS, payload.draftId), entry);
    return payload.draftId;
  }

  const created = await addDoc(collection(db, DRAFTS), entry);
  return created.id;
}

/**
 * Bir kaydı ve ona bağlı dosyaları siler.
 * Storage'daki dosyalar da temizlenir; aksi halde ücretsiz kota
 * yetim dosyalarla zamanla dolar.
 */
export async function deleteEntry(collectionName, entry) {
  await deleteDoc(doc(db, collectionName, entry.id));
  await deleteFiles(entry.files);
}

/**
 * 24 saati dolan taslakları gerçekten siler.
 *
 * Eski sürümde "Taslaklar 24 saat içinde silinecektir" yazıyordu ama silme
 * hiç yapılmıyordu; sadece listede gizleniyorlardı. Kayıtlar (ve dosyaları)
 * sonsuza dek kotada duruyordu.
 *
 * @returns {Promise<number>} silinen taslak sayısı
 */
export async function purgeExpiredDrafts(drafts) {
  const now = Date.now();

  const expired = drafts.filter((draft) => {
    const created = draft.createdAt?.seconds
      ? draft.createdAt.seconds * 1000
      : new Date(draft.createdAt || 0).getTime();
    return created > 0 && now - created > DRAFT_TTL_MS;
  });

  if (expired.length === 0) return 0;

  await Promise.all(
    expired.map((draft) =>
      deleteEntry(DRAFTS, draft).catch((error) =>
        console.warn("[gunluk] süresi dolan taslak silinemedi:", error?.code || error)
      )
    )
  );

  return expired.length;
}
