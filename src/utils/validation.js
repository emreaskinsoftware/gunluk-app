/**
 * Girdi doğrulama ve sınırlar.
 *
 * Uygulama sunucusuz çalıştığı için "sunucu tarafı doğrulama" diye bir katman
 * yok — veri zaten kullanıcının kendi cihazında ve kendi anahtarıyla şifreli.
 * Buradaki kurallar veri bütünlüğü, depolama kotası ve kullanıcı deneyimi için.
 */

/* --------------------------------------------------------------------------
   Sınırlar
   -------------------------------------------------------------------------- */

/** Bir günlüğün azami HTML uzunluğu. */
export const MAX_CONTENT_CHARS = 200000;

/** Tek dosya için üst sınır. Tarayıcı depolama kotasını korur. */
export const MAX_FILE_MB = 5;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/** Bir günlüğe eklenebilecek azami dosya sayısı. */
export const MAX_FILES = 5;

/** Şifreleme parolası için asgari uzunluk. */
export const MIN_PASSPHRASE_LENGTH = 10;

/* --------------------------------------------------------------------------
   Parola
   --------------------------------------------------------------------------
   Bu parola bir hesap parolası değil, ŞİFRELEME ANAHTARININ kaynağı.
   Unutulursa kurtarma yolu yoktur; bu yüzden uzunluğu öne çıkarıyoruz.
   Uzun bir cümle ("kirmizi bisiklet pazar sabahi 7"), kısa ve karmaşık bir
   paroladan ("Ab1!x") kırılması çok daha zordur.
   -------------------------------------------------------------------------- */

const COMMON_PASSPHRASES = new Set([
  "1234567890", "parola1234", "sifre12345", "password12", "qwertyuiop",
  "1234512345", "gunlukparola", "benimparolam", "123456789012",
]);

/**
 * Parola gücünü 0–4 arası puanlar.
 * @returns {{score:number, label:string, hints:string[], ok:boolean}}
 */
export function scorePassphrase(passphrase) {
  const value = String(passphrase || "");
  const hints = [];
  let score = 0;

  if (value.length >= MIN_PASSPHRASE_LENGTH) score += 1;
  else hints.push(`en az ${MIN_PASSPHRASE_LENGTH} karakter`);

  if (value.length >= 16) score += 1;
  else if (value.length >= MIN_PASSPHRASE_LENGTH) hints.push("daha uzun (16+ ideal)");

  if (value.length >= 24) score += 1;

  // Çeşitlilik: harf, rakam, sembol, boşluk
  const variety =
    Number(/[a-zçğıöşü]/.test(value)) +
    Number(/[A-ZÇĞİÖŞÜ]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^\w\s]/.test(value)) +
    Number(/\s/.test(value));

  if (variety >= 3) score += 1;
  else hints.push("farklı karakter türleri veya birkaç kelime");

  // Aynı karakterin tekrarı ("aaaaaaaaaa") uzunluğu sahte şişirir
  if (value.length > 0 && new Set(value).size <= 3) {
    score = Math.min(score, 1);
    hints.unshift("çok tekrarlı");
  }

  if (COMMON_PASSPHRASES.has(value.toLowerCase().replace(/\s/g, ""))) {
    score = 0;
    hints.unshift("bu parola çok yaygın");
  }

  score = Math.max(0, Math.min(4, score));

  return {
    score,
    label: ["Çok zayıf", "Zayıf", "Orta", "Güçlü", "Çok güçlü"][score],
    hints,
    ok: validatePassphrase(value) === null,
  };
}

/** @returns {string|null} hata mesajı ya da null */
export function validatePassphrase(passphrase) {
  const value = String(passphrase || "");

  if (!value) return "Parola gerekli.";
  if (value.length < MIN_PASSPHRASE_LENGTH)
    return `Parola en az ${MIN_PASSPHRASE_LENGTH} karakter olmalı.`;
  if (value.length > 256) return "Parola en fazla 256 karakter olabilir.";
  if (new Set(value).size <= 3)
    return "Parola çok tekrarlı. Farklı karakterler kullanın.";
  if (COMMON_PASSPHRASES.has(value.toLowerCase().replace(/\s/g, "")))
    return "Bu parola çok yaygın kullanılıyor, farklı bir tane seçin.";

  return null;
}

/* --------------------------------------------------------------------------
   Dosya ekleri
   -------------------------------------------------------------------------- */

const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/heic",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a",
  "application/pdf",
  "text/plain",
];

const ALLOWED_EXT = [
  "png", "jpg", "jpeg", "gif", "webp", "heic",
  "mp3", "wav", "ogg", "m4a",
  "pdf", "txt",
];

/**
 * Tek bir dosyayı doğrular.
 * @returns {string|null} hata mesajı ya da null
 */
export function validateFile(file) {
  if (!file) return "Dosya okunamadı.";
  if (file.size === 0) return `"${file.name}" boş bir dosya.`;

  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1).replace(".", ",");
    return `"${file.name}" çok büyük (${mb} MB). Üst sınır ${MAX_FILE_MB} MB.`;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Hem MIME hem uzantı denetlenir: biri sahteyse diğeri yakalar
  if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
    return `"${file.name}" desteklenmiyor. İzin verilenler: resim, ses, PDF, TXT.`;
  }

  return null;
}

/**
 * Yeni seçilen dosyaları mevcut listeyle birlikte doğrular.
 * @returns {{accepted: File[], errors: string[]}}
 */
export function validateFileBatch(newFiles, existingCount = 0) {
  const accepted = [];
  const errors = [];

  for (const file of newFiles) {
    if (existingCount + accepted.length >= MAX_FILES) {
      errors.push(`En fazla ${MAX_FILES} dosya ekleyebilirsiniz.`);
      break;
    }

    const error = validateFile(file);
    if (error) errors.push(error);
    else accepted.push(file);
  }

  return { accepted, errors };
}
