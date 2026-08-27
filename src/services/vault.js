import {
  PBKDF2_ITERATIONS,
  base64ToBytes,
  bytesToBase64,
  checkVerifier,
  createVerifier,
  decryptBytes,
  decryptJson,
  deriveKey,
  encryptBytes,
  encryptJson,
  newSalt,
} from "../lib/crypto";
import * as idb from "../lib/idb";
import { STORES } from "../lib/idb";
import { sanitizeHtml, htmlToPlainText } from "../utils/sanitize";
import { MAX_CONTENT_CHARS, MAX_FILES } from "../utils/validation";

/**
 * Kasa — uygulamanın tek veri kapısı.
 *
 * Diskte (IndexedDB) ne duruyor:
 *
 *   meta:        { salt, iterations, verifier }      <- parola YOK
 *   entries:     { id, kind, createdAt, rating,
 *                  cipher }                          <- içerik şifreli
 *   attachments: { id, entryId, size, cipher }        <- dosya şifreli
 *
 * Açık (şifresiz) tutulan tek şey tarih, puan ve dosya boyutu; bunlar takvim
 * ve sıralama için gerekli. Yazdığın metin ve dosya adları dahil geri kalan
 * her şey AES-GCM ile şifreli.
 */

const VAULT_KEY = "vault";
const SCHEMA_VERSION = 1;
const BACKUP_FORMAT = "gunluk-backup-v1";

export const KIND = { DIARY: "diary", DRAFT: "draft" };

/** Taslakların yaşam süresi: 24 saat. */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** Parola yanlış olduğunda fırlatılır — çağıran taraf ayırt edebilsin diye. */
export class WrongPassphraseError extends Error {
  constructor() {
    super("Parola hatalı.");
    this.name = "WrongPassphraseError";
  }
}

const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ==========================================================================
   Kasa yaşam döngüsü
   ========================================================================== */

export async function getVaultMeta() {
  return (await idb.get(STORES.META, VAULT_KEY)) || null;
}

export async function hasVault() {
  return Boolean(await getVaultMeta());
}

/**
 * İlk kurulumda kasayı oluşturur.
 * @returns {Promise<CryptoKey>} açık kasa anahtarı
 */
export async function createVault(passphrase) {
  if (await hasVault()) {
    throw new Error("Bu cihazda zaten bir kasa var.");
  }

  const salt = newSalt();
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);

  await idb.put(STORES.META, {
    key: VAULT_KEY,
    schemaVersion: SCHEMA_VERSION,
    salt,
    iterations: PBKDF2_ITERATIONS,
    verifier: await createVerifier(key),
    createdAt: Date.now(),
  });

  // Tarayıcıdan veriyi kalıcı işaretlemesini iste (kendiliğinden silinmesin)
  idb.requestPersistence();

  return key;
}

/**
 * Kasayı açar.
 * @throws {WrongPassphraseError}
 */
export async function unlockVault(passphrase) {
  const meta = await getVaultMeta();
  if (!meta) throw new Error("Bu cihazda kasa bulunamadı.");

  const key = await deriveKey(passphrase, meta.salt, meta.iterations);

  if (!(await checkVerifier(key, meta.verifier))) {
    throw new WrongPassphraseError();
  }

  return key;
}

/**
 * Parolayı değiştirir: yeni bir tuz üretir ve TÜM kayıtları yeni anahtarla
 * yeniden şifreler. Tek bir işlemde yapılır; yarıda kalırsa hiçbir şey değişmez.
 */
export async function changePassphrase(currentKey, newPassphrase) {
  const meta = await getVaultMeta();
  if (!meta) throw new Error("Kasa bulunamadı.");

  const salt = newSalt();
  const nextKey = await deriveKey(newPassphrase, salt, PBKDF2_ITERATIONS);

  const entries = await idb.getAll(STORES.ENTRIES);
  const attachments = await idb.getAll(STORES.ATTACHMENTS);

  const reEncryptedEntries = await Promise.all(
    entries.map(async (row) => ({
      ...row,
      cipher: await encryptJson(nextKey, await decryptJson(currentKey, row.cipher)),
    }))
  );

  const reEncryptedAttachments = await Promise.all(
    attachments.map(async (row) => ({
      ...row,
      cipher: await encryptBytes(nextKey, await decryptBytes(currentKey, row.cipher)),
    }))
  );

  await idb.putMany(STORES.ENTRIES, reEncryptedEntries);
  await idb.putMany(STORES.ATTACHMENTS, reEncryptedAttachments);

  await idb.put(STORES.META, {
    ...meta,
    salt,
    iterations: PBKDF2_ITERATIONS,
    verifier: await createVerifier(nextKey),
    passphraseChangedAt: Date.now(),
  });

  return nextKey;
}

/** Kasayı ve içindeki her şeyi kalıcı olarak siler. */
export async function destroyVault() {
  await idb.deleteDatabase();
}

/* ==========================================================================
   Kayıtlar
   ========================================================================== */

async function decryptRow(key, row) {
  const payload = await decryptJson(key, row.cipher);
  return {
    id: row.id,
    kind: row.kind,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    rating: row.rating,
    content: payload.content || "",
    plainText: payload.plainText || "",
    files: payload.files || [],
  };
}

/**
 * Belirtilen türdeki tüm kayıtları çözerek döndürür (yeniden eskiye).
 * @param {CryptoKey} key
 * @param {"diary"|"draft"} kind
 */
export async function listEntries(key, kind) {
  const rows = await idb.getAllByIndex(STORES.ENTRIES, "byKind", kind);

  const decrypted = await Promise.all(
    rows.map(async (row) => {
      try {
        return await decryptRow(key, row);
      } catch {
        // Tek bozuk kayıt tüm listeyi çökertmesin
        console.error("[gunluk] kayıt çözülemedi:", row.id);
        return null;
      }
    })
  );

  return decrypted.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getEntry(key, id) {
  const row = await idb.get(STORES.ENTRIES, id);
  if (!row) return null;
  return decryptRow(key, row);
}

/**
 * Kayıt oluşturur veya günceller. Yeni dosyalar şifrelenip ayrı depoya yazılır.
 *
 * @param {CryptoKey} key
 * @param {object} input
 * @param {(percent:number)=>void} [onProgress] dosya şifreleme ilerlemesi
 * @returns {Promise<string>} kayıt kimliği
 */
export async function saveEntry(key, input, onProgress) {
  const {
    id = newId(),
    kind = KIND.DIARY,
    rating = 0,
    content = "",
    files = [],
    createdAt,
  } = input;

  const safeContent = sanitizeHtml(content).slice(0, MAX_CONTENT_CHARS);
  if (!safeContent.trim()) throw new Error("İçerik boş olamaz.");

  /* --- Dosyaları şifrele --- */
  const limited = files.slice(0, MAX_FILES);
  const pending = limited.filter((file) => file instanceof File);
  const totalBytes = pending.reduce((sum, file) => sum + file.size, 0);

  let doneBytes = 0;
  const attachmentRows = [];
  const fileMeta = [];

  for (const file of limited) {
    if (!(file instanceof File)) {
      // Zaten kayıtlı dosya — olduğu gibi taşı
      fileMeta.push(file);
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const attachmentId = newId();

    attachmentRows.push({
      id: attachmentId,
      entryId: id,
      size: file.size,
      createdAt: Date.now(),
      cipher: await encryptBytes(key, bytes),
    });

    fileMeta.push({
      id: attachmentId,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    doneBytes += file.size;
    if (totalBytes > 0) onProgress?.(Math.round((doneBytes / totalBytes) * 100));
  }

  /* --- Artık kullanılmayan dosyaları temizle --- */
  const keptIds = new Set(fileMeta.map((file) => file.id));
  const existing = await idb.getAllByIndex(STORES.ATTACHMENTS, "byEntryId", id);
  const orphans = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id);

  /* --- Yaz --- */
  const now = Date.now();
  const previous = await idb.get(STORES.ENTRIES, id);

  const row = {
    id,
    kind,
    createdAt: createdAt ?? previous?.createdAt ?? now,
    updatedAt: now,
    rating: Math.max(0, Math.min(5, Number(rating) || 0)),
    cipher: await encryptJson(key, {
      content: safeContent,
      plainText: htmlToPlainText(safeContent).slice(0, MAX_CONTENT_CHARS),
      files: fileMeta,
    }),
  };

  if (attachmentRows.length > 0) await idb.putMany(STORES.ATTACHMENTS, attachmentRows);
  await idb.put(STORES.ENTRIES, row);
  if (orphans.length > 0) await idb.removeMany(STORES.ATTACHMENTS, orphans);

  onProgress?.(100);
  return id;
}

/** Kaydı ve ona bağlı tüm dosyaları siler. */
export async function deleteEntryById(id) {
  const attachments = await idb.getAllByIndex(STORES.ATTACHMENTS, "byEntryId", id);
  await idb.remove(STORES.ENTRIES, id);
  if (attachments.length > 0) {
    await idb.removeMany(STORES.ATTACHMENTS, attachments.map((row) => row.id));
  }
}

/**
 * 24 saati dolan taslakları gerçekten siler.
 * @returns {Promise<number>} silinen taslak sayısı
 */
export async function purgeExpiredDrafts() {
  const rows = await idb.getAllByIndex(STORES.ENTRIES, "byKind", KIND.DRAFT);
  const cutoff = Date.now() - DRAFT_TTL_MS;
  const expired = rows.filter((row) => row.createdAt < cutoff);

  for (const row of expired) {
    await deleteEntryById(row.id);
  }

  return expired.length;
}

/* ==========================================================================
   Dosya ekleri
   ========================================================================== */

/**
 * Şifreli dosyayı çözer ve tarayıcıda kullanılabilir bir Blob döndürür.
 * @returns {Promise<Blob|null>}
 */
export async function readAttachment(key, attachmentId, mimeType) {
  const row = await idb.get(STORES.ATTACHMENTS, attachmentId);
  if (!row) return null;

  const bytes = await decryptBytes(key, row.cipher);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

/* ==========================================================================
   Yedekleme
   ========================================================================== */

/**
 * Tüm kasayı tek bir şifreli JSON dosyasına aktarır.
 *
 * Dosya, kasanın tuzunu ve tur sayısını içerir; başka bir cihazda AYNI parola
 * ile açılır. İçerik hiçbir zaman şifresiz diske yazılmaz.
 */
export async function exportBackup(key) {
  const meta = await getVaultMeta();
  if (!meta) throw new Error("Kasa bulunamadı.");

  const entries = await idb.getAll(STORES.ENTRIES);
  const attachments = await idb.getAll(STORES.ATTACHMENTS);

  const payload = {
    entries: await Promise.all(
      entries.map(async (row) => ({
        id: row.id,
        kind: row.kind,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        rating: row.rating,
        data: await decryptJson(key, row.cipher),
      }))
    ),
    attachments: await Promise.all(
      attachments.map(async (row) => ({
        id: row.id,
        entryId: row.entryId,
        size: row.size,
        bytes: bytesToBase64(await decryptBytes(key, row.cipher)),
      }))
    ),
  };

  // Yedeğin tamamı tek blok halinde yeniden şifrelenir
  const cipher = await encryptJson(key, payload);

  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    kdf: {
      name: "PBKDF2-SHA256",
      salt: bytesToBase64(meta.salt),
      iterations: meta.iterations,
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(cipher.iv),
      data: bytesToBase64(cipher.data),
    },
  };
}

/**
 * Yedek dosyasını okur ve içeri aktarır.
 *
 * @param {object} backup ayrıştırılmış JSON
 * @param {string} passphrase yedeğin alındığı andaki parola
 * @param {"merge"|"replace"} mode
 * @returns {Promise<{entries:number, attachments:number}>}
 */
export async function importBackup(backup, passphrase, mode = "merge") {
  if (backup?.format !== BACKUP_FORMAT) {
    throw new Error("Bu dosya bir Günlük yedeği değil.");
  }

  const salt = base64ToBytes(backup.kdf.salt);
  const backupKey = await deriveKey(passphrase, salt, backup.kdf.iterations);

  let payload;
  try {
    payload = await decryptJson(backupKey, {
      iv: base64ToBytes(backup.cipher.iv),
      data: base64ToBytes(backup.cipher.data),
    });
  } catch {
    throw new WrongPassphraseError();
  }

  // Kasa yoksa yedeğin anahtar türetme ayarlarıyla yeni bir kasa kur
  let currentKey;
  if (await hasVault()) {
    currentKey = await unlockVault(passphrase);
  } else {
    await idb.put(STORES.META, {
      key: VAULT_KEY,
      schemaVersion: SCHEMA_VERSION,
      salt,
      iterations: backup.kdf.iterations,
      verifier: await createVerifier(backupKey),
      createdAt: Date.now(),
      restoredAt: Date.now(),
    });
    currentKey = backupKey;
  }

  if (mode === "replace") {
    await idb.clear([STORES.ENTRIES, STORES.ATTACHMENTS]);
  }

  const entryRows = await Promise.all(
    (payload.entries || []).map(async (entry) => ({
      id: entry.id,
      kind: entry.kind,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      rating: entry.rating,
      cipher: await encryptJson(currentKey, entry.data),
    }))
  );

  const attachmentRows = await Promise.all(
    (payload.attachments || []).map(async (attachment) => ({
      id: attachment.id,
      entryId: attachment.entryId,
      size: attachment.size,
      createdAt: Date.now(),
      cipher: await encryptBytes(currentKey, base64ToBytes(attachment.bytes)),
    }))
  );

  if (entryRows.length > 0) await idb.putMany(STORES.ENTRIES, entryRows);
  if (attachmentRows.length > 0) await idb.putMany(STORES.ATTACHMENTS, attachmentRows);

  return { entries: entryRows.length, attachments: attachmentRows.length };
}

/* ==========================================================================
   İstatistik
   ========================================================================== */

export async function getStats() {
  const [entryCount, attachmentCount, usage, meta] = await Promise.all([
    idb.count(STORES.ENTRIES),
    idb.count(STORES.ATTACHMENTS),
    idb.estimateUsage(),
    getVaultMeta(),
  ]);

  return {
    entryCount,
    attachmentCount,
    usage,
    createdAt: meta?.createdAt || null,
    passphraseChangedAt: meta?.passphraseChangedAt || null,
    persisted: await navigator.storage?.persisted?.().catch(() => null),
  };
}
