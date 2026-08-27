/**
 * Firebase hata kodlarını Türkçeye çevirir.
 *
 * Güvenlik notu: "kullanıcı yok" ile "parola yanlış" ayrımı, saldırganın
 * hangi e-postaların kayıtlı olduğunu öğrenmesini sağlar (hesap numaralandırma).
 * Bu yüzden giriş hataları tek bir nötr mesajda birleştirilmiştir.
 */
const MESSAGES = {
  // --- Giriş: bilinçli olarak aynı mesaj ---
  "auth/invalid-credential": "E-posta veya parola hatalı.",
  "auth/wrong-password": "E-posta veya parola hatalı.",
  "auth/user-not-found": "E-posta veya parola hatalı.",
  "auth/invalid-email": "E-posta veya parola hatalı.",

  "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
  "auth/too-many-requests":
    "Çok fazla deneme yapıldı. Güvenlik için bir süre beklemeniz gerekiyor.",
  "auth/network-request-failed":
    "İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edin.",

  // --- Kayıt ---
  "auth/email-already-in-use": "Bu e-posta adresi zaten kayıtlı.",
  "auth/weak-password": "Parola çok zayıf. Daha güçlü bir parola seçin.",
  "auth/operation-not-allowed":
    "E-posta ile kayıt kapalı. Firebase Console > Authentication bölümünden açın.",

  // --- Oturum ---
  "auth/requires-recent-login":
    "Güvenlik için tekrar giriş yapmanız gerekiyor.",

  // --- Firestore ---
  "permission-denied":
    "Bu işlem için yetkiniz yok. Sadece kendi kayıtlarınıza erişebilirsiniz.",
  unauthenticated: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.",
  "failed-precondition":
    "Veritabanı dizini eksik. Terminalde `npm run rules:deploy` komutunu çalıştırın.",
  unavailable: "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edin.",
  "resource-exhausted":
    "Günlük ücretsiz kota doldu. Yarın tekrar deneyin.",
  cancelled: "İşlem iptal edildi.",
  "deadline-exceeded": "İşlem zaman aşımına uğradı. Tekrar deneyin.",

  // --- Storage ---
  "storage/unauthorized": "Bu dosyaya erişim izniniz yok.",
  "storage/canceled": "Dosya yükleme iptal edildi.",
  "storage/quota-exceeded": "Depolama alanı kotası doldu.",
  "storage/retry-limit-exceeded":
    "Dosya yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.",
  "storage/unauthenticated": "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.",
  "storage/object-not-found": "Dosya bulunamadı.",
};

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string} kullanıcıya gösterilebilir Türkçe mesaj
 */
export function toFriendlyMessage(error, fallback = "Beklenmeyen bir hata oluştu.") {
  const code = error?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];

  // Ham Firebase mesajını kullanıcıya gösterme: iç yapı sızdırır.
  if (process.env.NODE_ENV === "development" && error) {
    console.error("[gunluk] işlenmemiş hata:", error);
  }

  return fallback;
}

/** Eksik Firestore dizini hatasını ayırt eder (geliştiriciye yol göstermek için). */
export function isMissingIndexError(error) {
  return (
    error?.code === "failed-precondition" &&
    String(error?.message || "").includes("index")
  );
}
