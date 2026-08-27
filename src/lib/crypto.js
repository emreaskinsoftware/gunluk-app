/**
 * Şifreleme katmanı — Web Crypto API (tarayıcının yerleşik kriptografisi).
 *
 * Tasarım:
 *   parola --PBKDF2/SHA-256--> anahtar --AES-GCM--> şifreli günlük
 *
 * Anahtar yalnızca bellekte tutulur ve `extractable: false` olarak türetilir;
 * yani JavaScript ham anahtar baytlarını hiçbir zaman okuyamaz. Diske sadece
 * şifreli veri, rastgele tuz (salt) ve doğrulama bloğu yazılır.
 *
 * AES-GCM seçildi çünkü aynı anda hem gizlilik hem bütünlük sağlar: şifreli
 * veriyi bir baytını bile değiştirmek çözmeyi başarısız kılar.
 */

/** OWASP 2023 önerisi: PBKDF2-HMAC-SHA256 için asgari 600.000 tur. */
export const PBKDF2_ITERATIONS = 600000;

const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM için standart uzunluk
const VERIFIER_PLAINTEXT = "gunluk-kasa-dogrulama-v1";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Kriptografik olarak güvenli rastgele baytlar. */
export function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

export const newSalt = () => randomBytes(SALT_BYTES);

/**
 * Paroladan AES-GCM anahtarı türetir.
 *
 * Yavaşlığı bilinçlidir: 600.000 tur, parolayı kaba kuvvetle denemeyi
 * saldırgan için pratik olmaktan çıkarır. Kullanıcı bunu yalnızca kilidi
 * açarken bir kez öder (~0,3 sn).
 *
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @param {number} iterations
 * @returns {Promise<CryptoKey>} dışa aktarılamaz anahtar
 */
export async function deriveKey(passphrase, salt, iterations = PBKDF2_ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, // extractable: false -> ham anahtar asla okunamaz
    ["encrypt", "decrypt"]
  );
}

/* --------------------------------------------------------------------------
   Ham bayt şifreleme
   -------------------------------------------------------------------------- */

/**
 * @returns {Promise<{iv: Uint8Array, data: Uint8Array}>}
 */
export async function encryptBytes(key, bytes) {
  const iv = randomBytes(IV_BYTES);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv, data: new Uint8Array(cipher) };
}

/**
 * @returns {Promise<Uint8Array>}
 * @throws Parola yanlışsa veya veri bozulmuşsa hata fırlatır (GCM bütünlük denetimi).
 */
export async function decryptBytes(key, { iv, data }) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new Uint8Array(plain);
}

/* --------------------------------------------------------------------------
   JSON şifreleme
   -------------------------------------------------------------------------- */

export async function encryptJson(key, value) {
  return encryptBytes(key, encoder.encode(JSON.stringify(value)));
}

export async function decryptJson(key, payload) {
  return JSON.parse(decoder.decode(await decryptBytes(key, payload)));
}

/* --------------------------------------------------------------------------
   Parola doğrulama
   --------------------------------------------------------------------------
   Parolayı (veya karmasını) hiçbir yerde saklamıyoruz. Bunun yerine bilinen
   bir metni şifreleyip saklıyoruz: girilen parola bu bloğu çözebiliyorsa
   doğrudur. Çözemezse AES-GCM hata verir.
   -------------------------------------------------------------------------- */

export async function createVerifier(key) {
  return encryptBytes(key, encoder.encode(VERIFIER_PLAINTEXT));
}

export async function checkVerifier(key, verifier) {
  try {
    const plain = await decryptBytes(key, verifier);
    return decoder.decode(plain) === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------------------
   Yedek dosyası için bayt <-> metin dönüşümü
   -------------------------------------------------------------------------- */

export function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000; // büyük dosyalarda yığın taşmasını önler
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Tarayıcının Web Crypto desteğini denetler (eski tarayıcılar için). */
export function isCryptoAvailable() {
  return Boolean(
    typeof crypto !== "undefined" &&
      crypto.subtle &&
      typeof crypto.subtle.deriveKey === "function"
  );
}
