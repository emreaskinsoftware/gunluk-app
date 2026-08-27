/**
 * Hataları kullanıcının anlayacağı Türkçe mesaja çevirir.
 *
 * Uygulama sunucusuz olduğu için hataların hemen tamamı tarayıcı kaynaklı:
 * depolama kotası, gizli sekme kısıtı, bozuk yedek dosyası, yanlış parola.
 */

const BY_NAME = {
  WrongPassphraseError: "Parola hatalı.",

  // IndexedDB / depolama
  QuotaExceededError:
    "Tarayıcı depolama alanı doldu. Ayarlar sayfasından yedek alıp eski günlükleri silin.",
  NotFoundError: "Aranan kayıt bulunamadı.",
  InvalidStateError:
    "Depolama kullanılamıyor. Gizli (incognito) sekmede olabilirsiniz.",
  VersionError:
    "Veritabanı sürümü uyuşmuyor. Uygulamanın açık olduğu diğer sekmeleri kapatıp yenileyin.",
  SecurityError:
    "Tarayıcı bu siteye veri kaydetme izni vermiyor. Site ayarlarından çerez/veri iznini açın.",
  AbortError: "İşlem yarıda kesildi.",

  // Web Crypto
  OperationError:
    "Veri çözülemedi. Parola yanlış olabilir ya da dosya bozulmuş olabilir.",
  DataError: "Veri biçimi geçersiz.",
};

const BY_TEXT = [
  [/quota|exceeded the quota|storage/i,
    "Tarayıcı depolama alanı doldu. Ayarlar sayfasından yedek alıp yer açın."],
  [/JSON|Unexpected token/i,
    "Dosya okunamadı. Geçerli bir yedek dosyası seçtiğinizden emin olun."],
  [/indexedDB|IDBDatabase/i,
    "Tarayıcı veritabanına erişilemedi. Sayfayı yenilemeyi deneyin."],
];

/**
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
export function toFriendlyMessage(error, fallback = "Beklenmeyen bir hata oluştu.") {
  if (!error) return fallback;

  if (error.name && BY_NAME[error.name]) return BY_NAME[error.name];

  const text = String(error.message || error);

  for (const [pattern, message] of BY_TEXT) {
    if (pattern.test(text)) return message;
  }

  // Kendi fırlattığımız, zaten Türkçe ve kullanıcıya uygun mesajlar
  if (error instanceof Error && /[çğıöşüÇĞİÖŞÜ]|olamaz|bulunamadı|gerekli/.test(text)) {
    return text;
  }

  if (process.env.NODE_ENV === "development") {
    console.error("[gunluk] işlenmemiş hata:", error);
  }

  return fallback;
}
