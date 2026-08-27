import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";
import { fileStamp } from "../utils/format";
import { safeFileName } from "../utils/sanitize";
import { ATTACHMENTS_ENABLED, validateFile } from "../utils/validation";

/**
 * Dosya yükleme katmanı.
 *
 * Güvenlik notu: Eski sürümde dosyalar `uploads/{ad}` yoluna yazılıyordu.
 * Bu yol kullanıcıya göre ayrılmadığı için:
 *   - iki kullanıcının aynı adlı dosyası birbirini eziyordu,
 *   - "sadece kendi dosyana eriş" kuralı YAZILAMIYORDU.
 *
 * Artık her dosya `users/{uid}/{diaries|drafts}/...` altında. storage.rules
 * bu yola göre sahiplik, boyut ve MIME tipi kontrolü yapıyor.
 */

/** Zaten yüklenmiş dosyalar string (URL) olarak tutulur. */
const isUploaded = (file) => typeof file === "string";

/**
 * Dosya listesini yükler ve indirme URL'lerini döndürür.
 *
 * @param {string} userId
 * @param {"diaries"|"drafts"} category
 * @param {(File|string)[]} files
 * @param {(percent:number)=>void} [onProgress]
 * @returns {Promise<string[]>}
 */
export async function uploadFiles(userId, category, files, onProgress) {
  if (!Array.isArray(files) || files.length === 0) return [];

  const pending = files.filter((f) => !isUploaded(f));

  if (pending.length > 0) {
    if (!ATTACHMENTS_ENABLED || !storage) {
      throw new Error(
        "Dosya ekleme kapalı. Açmak için .env dosyasında REACT_APP_ENABLE_ATTACHMENTS=true yapın."
      );
    }
    if (!userId) throw new Error("Oturum bulunamadı.");
  }

  const totalBytes = pending.reduce((sum, f) => sum + f.size, 0);
  const uploadedBytes = new Array(pending.length).fill(0);

  const report = () => {
    if (!onProgress || totalBytes === 0) return;
    const done = uploadedBytes.reduce((a, b) => a + b, 0);
    onProgress(Math.min(100, Math.round((done / totalBytes) * 100)));
  };

  let pendingIndex = 0;

  const results = await Promise.all(
    files.map(async (file) => {
      if (isUploaded(file)) return file;

      // İstemci tarafı doğrulama (storage.rules sunucu tarafında tekrar eder)
      const error = validateFile(file);
      if (error) throw new Error(error);

      const slot = pendingIndex++;
      const name = `${fileStamp()}_${slot}_${safeFileName(file.name)}`;
      const objectRef = ref(storage, `users/${userId}/${category}/${name}`);

      const task = uploadBytesResumable(objectRef, file, {
        contentType: file.type,
        // Tarayıcının dosyayı çalıştırmak yerine indirmesini zorlar
        contentDisposition: `attachment; filename="${safeFileName(file.name)}"`,
        cacheControl: "private, max-age=3600",
      });

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) => {
            uploadedBytes[slot] = snapshot.bytesTransferred;
            report();
          },
          reject,
          resolve
        );
      });

      return getDownloadURL(task.snapshot.ref);
    })
  );

  onProgress?.(100);
  return results;
}

/**
 * Yüklenmiş bir dosyayı indirme URL'i üzerinden siler.
 * Hata fırlatmaz: dosya zaten yoksa veya izin yoksa sessizce geçer,
 * çünkü asıl işlem (günlüğü silmek) bu yüzden durmamalı.
 */
export async function deleteFileByUrl(url) {
  if (!storage || typeof url !== "string" || !url.startsWith("https://")) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") {
      console.warn("[gunluk] dosya silinemedi:", error?.code || error);
    }
  }
}

/** Bir günlüğe ait tüm dosyaları siler. */
export async function deleteFiles(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  await Promise.all(urls.map(deleteFileByUrl));
}

/** İndirme URL'inden okunabilir dosya adını çıkarır. */
export function fileNameFromUrl(url) {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const raw = path.split("/").pop() || "dosya";
    // "2025-03-12_14-00-00_0_tatil.jpg" -> "tatil.jpg"
    return raw.replace(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d+_/, "");
  } catch {
    return "dosya";
  }
}
