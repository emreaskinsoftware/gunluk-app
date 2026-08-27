/**
 * Girdi doğrulama kuralları.
 *
 * NOT: Buradaki kontroller sadece KULLANICI DENEYİMİ içindir. Gerçek
 * zorlayıcı sınırlar firestore.rules ve storage.rules dosyalarındadır;
 * istemci kodu her zaman atlatılabilir.
 */

/* --------------------------------------------------------------------------
   Ortam ayarları (.env)
   -------------------------------------------------------------------------- */
export const ATTACHMENTS_ENABLED =
  process.env.REACT_APP_ENABLE_ATTACHMENTS !== "false";

export const MAX_FILE_MB = Number(process.env.REACT_APP_MAX_FILE_MB) || 5;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
export const MAX_FILES = Number(process.env.REACT_APP_MAX_FILES) || 5;

/** İçerik üst sınırı — firestore.rules ile birebir aynı olmalı. */
export const MAX_CONTENT_CHARS = 200000;

/* --------------------------------------------------------------------------
   E-posta
   -------------------------------------------------------------------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function validateEmail(email) {
  const value = String(email || "").trim();
  if (!value) return "E-posta adresi gerekli.";
  if (value.length > 254) return "E-posta adresi çok uzun.";
  if (!EMAIL_RE.test(value)) return "Geçerli bir e-posta adresi girin.";
  return null;
}

/* --------------------------------------------------------------------------
   Parola
   -------------------------------------------------------------------------- */

/** Sızıntı listelerinde en sık görülen parolalar. */
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "qwerty123",
  "11111111", "iloveyou", "sifre123", "parola123", "admin123", "abcd1234",
  "qwertyui", "123123123", "112233445", "asdasdasd", "türkiye1", "galatasaray",
  "fenerbahce", "besiktas1", "trabzonspor",
]);

/**
 * Parola gücünü 0–4 arası puanlar ve eksikleri döndürür.
 * @returns {{score:number, label:string, hints:string[], ok:boolean}}
 */
export function scorePassword(password) {
  const value = String(password || "");
  const hints = [];
  let score = 0;

  if (value.length >= 8) score++;
  else hints.push("en az 8 karakter");

  if (/[a-zçğıöşü]/.test(value) && /[A-ZÇĞİÖŞÜ]/.test(value)) score++;
  else hints.push("büyük ve küçük harf");

  if (/\d/.test(value)) score++;
  else hints.push("en az bir rakam");

  if (/[^A-Za-z0-9]/.test(value)) score++;
  else hints.push("bir sembol (!, ?, # …)");

  if (value.length >= 14) score = Math.min(4, score + 1);

  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    score = 0;
    hints.unshift("bu parola çok yaygın, tahmin edilmesi kolay");
  }

  const labels = ["Çok zayıf", "Zayıf", "Orta", "Güçlü", "Çok güçlü"];

  return {
    score,
    label: labels[score],
    hints,
    // Kayıt için asgari eşik: 8 karakter + harf + rakam
    ok: value.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value) && /\d/.test(value) &&
        !COMMON_PASSWORDS.has(value.toLowerCase()),
  };
}

export function validatePassword(password) {
  const value = String(password || "");
  if (!value) return "Parola gerekli.";
  if (value.length < 8) return "Parola en az 8 karakter olmalı.";
  if (value.length > 128) return "Parola en fazla 128 karakter olabilir.";
  if (!/\d/.test(value)) return "Parola en az bir rakam içermeli.";
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value)) return "Parola en az bir harf içermeli.";
  if (COMMON_PASSWORDS.has(value.toLowerCase()))
    return "Bu parola çok yaygın kullanılıyor, farklı bir tane seçin.";
  return null;
}

/* --------------------------------------------------------------------------
   Dosya yükleme
   -------------------------------------------------------------------------- */

/** storage.rules ile aynı liste — sunucu tarafı da bunu zorunlu kılar. */
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
 * @param {File} file
 * @returns {string|null} hata mesajı ya da null
 */
export function validateFile(file) {
  if (!file) return "Dosya okunamadı.";

  if (file.size === 0) return `"${file.name}" boş bir dosya.`;

  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `"${file.name}" çok büyük (${mb} MB). Üst sınır ${MAX_FILE_MB} MB.`;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Hem MIME hem uzantı kontrolü: biri sahteyse diğeri yakalar.
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
