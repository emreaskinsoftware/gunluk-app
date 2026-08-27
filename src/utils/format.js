import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * Tarih ve sayı biçimlendirme.
 *
 * Kasa kayıtlarında tarihler milisaniye cinsinden sayı olarak tutulur.
 * `toDate` her biçimi (sayı, Date, ISO metni) kabul eder ve bozuk değerde
 * null döner — tek hatalı kayıt tüm listeyi çökertmesin diye.
 */

export function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** "27 Ağustos 2026 Perşembe" */
export function formatLongDate(value) {
  const date = toDate(value);
  return date ? format(date, "d MMMM yyyy EEEE", { locale: tr }) : "Tarihsiz";
}

/** "27.08.2026" — tablolarda ve künyelerde hizalı dursun diye sayısal */
export function formatShortDate(value) {
  const date = toDate(value);
  return date ? format(date, "dd.MM.yyyy") : "—";
}

/** "27.08.2026 14:35" */
export function formatDateTime(value) {
  const date = toDate(value);
  return date ? format(date, "dd.MM.yyyy HH:mm") : "—";
}

/** "Perşembe" */
export function weekday(value) {
  const date = toDate(value);
  return date ? format(date, "EEEE", { locale: tr }) : "";
}

/** "Bugün" / "Dün" / "3 gün önce" */
export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return "";
  if (isToday(date)) return "Bugün";
  if (isYesterday(date)) return "Dün";
  return formatDistanceToNow(date, { addSuffix: true, locale: tr });
}

/** Dosya adları için sıralanabilir zaman damgası. */
export function fileStamp(date = new Date()) {
  return format(date, "yyyy-MM-dd_HHmm");
}

/** Takvim eşleştirmesi için yerel gün anahtarı: "2026-08-27" */
export function dayKey(value) {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : null;
}

/** 1234 → "1.234" */
export function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR").format(value || 0);
}

/** Bayt → "2,4 MB" */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1).replace(".", ",")} ${units[index]}`;
}

/** Uzun metni kelime ortasından kesmeden kısaltır. */
export function truncate(text, max = 180) {
  const value = String(text || "");
  if (value.length <= max) return value;

  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
