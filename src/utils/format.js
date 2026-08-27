import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * Firestore Timestamp / Date / sayı → Date.
 * Bozuk veya eksik alanlarda null döner; çağıran taraf çökmez.
 *
 * (Eski kodda `data.createdAt.seconds` doğrudan okunuyordu; createdAt'i
 * olmayan tek bir kayıt tüm listeyi patlatıyordu.)
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value === "number") return new Date(value);

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** "12 Mart 2025 Çarşamba" */
export function formatLongDate(value) {
  const date = toDate(value);
  return date ? format(date, "d MMMM yyyy EEEE", { locale: tr }) : "Tarihsiz";
}

/** "12 Mart 2025" */
export function formatDate(value) {
  const date = toDate(value);
  return date ? format(date, "d MMMM yyyy", { locale: tr }) : "Tarihsiz";
}

/** "12 Mart 2025, 14:35" */
export function formatDateTime(value) {
  const date = toDate(value);
  return date ? format(date, "d MMMM yyyy, HH:mm", { locale: tr }) : "Tarihsiz";
}

/** "Bugün" / "Dün" / "3 gün önce" */
export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return "Tarihsiz";
  if (isToday(date)) return "Bugün";
  if (isYesterday(date)) return "Dün";
  return formatDistanceToNow(date, { addSuffix: true, locale: tr });
}

/** Dosya adı için sıralanabilir zaman damgası. */
export function fileStamp(date = new Date()) {
  return format(date, "yyyy-MM-dd_HH-mm-ss");
}

/** Takvim eşleştirmesi için yerel gün anahtarı ("2025-03-12"). */
export function dayKey(value) {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : null;
}

/** 1234 → "1.234" */
export function formatNumber(n) {
  return new Intl.NumberFormat("tr-TR").format(n || 0);
}

/** Bayt → "2,4 MB" */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1).replace(".", ",")} ${units[i]}`;
}

/** Uzun metni "…" ile kısaltır. */
export function truncate(text, max = 160) {
  const value = String(text || "");
  return value.length <= max ? value : `${value.slice(0, max).trimEnd()}…`;
}
