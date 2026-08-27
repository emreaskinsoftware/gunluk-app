import DOMPurify from "dompurify";

/**
 * XSS koruması.
 *
 * Günlük içeriği zengin metin (HTML) olarak saklanıyor ve ekranda
 * dangerouslySetInnerHTML ile basılıyor. Temizlenmemiş HTML basmak,
 * kaydedilmiş bir <img onerror=...> veya <script> etiketinin kullanıcının
 * oturumunda çalışmasına yol açar (stored XSS).
 *
 * Bu yüzden içerik İKİ kez temizlenir:
 *   1. Kaydetmeden önce   -> veritabanına asla kirli HTML girmez
 *   2. Ekrana basmadan önce -> eskiden kaydedilmiş kirli veri de zararsızlaşır
 */

/** Editörün ürettiği, güvenli kabul edilen etiketler. */
const ALLOWED_TAGS = [
  "p", "br", "span", "div",
  "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "hr", "sub", "sup",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class", "style"];

/**
 * Zengin metni güvenli HTML'e dönüştürür.
 * @param {string} dirty
 * @returns {string}
 */
export function sanitizeHtml(dirty) {
  if (typeof dirty !== "string" || dirty.length === 0) return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // javascript: / data: gibi protokollerle çalışan bağlantıları engelle
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
    // <form>, <input>, <iframe>, <object>, <embed> vb. tamamen dışarıda
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "srcdoc", "formaction"],
    // NOT: USE_PROFILES bilerek kullanılmıyor. ALLOWED_TAGS ile birlikte
    // verildiğinde DOMPurify iki listeyi BİRLEŞTİRİR ve <img>, <video>,
    // <table> gibi hiç istemediğimiz etiketler de geçerli hale gelir.
    // Beyaz listenin tek yetkili kaynağı ALLOWED_TAGS olmalı.
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // SVG/MathML tamamen kapalı: bu ad alanları klasik XSS kaçış yollarıdır.
    SVG: false,
    MATHML: false,
  });
}

/**
 * HTML'i düz metne indirger. Arama, önizleme ve .txt indirme için kullanılır.
 * (string-strip-html paketinin yerini alır - sıfır ek bağımlılık.)
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlainText(html) {
  if (typeof html !== "string" || html.length === 0) return "";

  // Blok etiketlerinden sonra boşluk bırak ki kelimeler birbirine yapışmasın
  const spaced = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/gi, "$& ");

  const text = DOMPurify.sanitize(spaced, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dosya adını indirme/yükleme için güvenli hale getirir.
 * Yol geçişi (../) ve dosya sisteminde yasak karakterleri temizler.
 * @param {string} name
 * @returns {string}
 */
export function safeFileName(name) {
  const base = String(name || "dosya")
    .split(/[\\/]/)
    .pop();

  return (
    base
      // İzin listesi yaklaşımı: yalnızca harf (Türkçe dahil), rakam ve
      // güvenli noktalama kalır. Kontrol karakterleri, yol ayraçları ve
      // dosya sisteminde sorun çıkaran işaretler otomatik olarak elenir.
      .replace(/[^\p{L}\p{N}._()\- ]/gu, "_")
      // Başta nokta -> gizli dosya veya yol geçişi denemesi
      .replace(/^\.+/, "")
      .trim()
      .slice(0, 120) || "dosya"
  );
}
