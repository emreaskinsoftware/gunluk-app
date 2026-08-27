import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useVault, VAULT_STATUS } from "../context/VaultContext";
import PageLoader from "./PageLoader";

/**
 * Kasa açık değilse sayfayı hiç render etmez.
 *
 * Bu bir "yetki" denetimi değil, anahtar denetimidir: kasa kilitliyken şifre
 * çözme anahtarı bellekte yoktur, dolayısıyla bu sayfaların gösterecek hiçbir
 * verisi olamaz. Adresi elle yazmak da işe yaramaz.
 */

/**
 * Kilit yüzünden yarıda kalan adres.
 *
 * Bilinçli olarak modül değişkeninde tutuluyor, localStorage'da değil:
 * sayfa kapandığında birlikte kayboluyor ve okunan günlüğün kimliği diske
 * hiç yazılmıyor.
 */
let pendingPath = null;

/**
 * Bekleyen adresi okur ama TEMİZLEMEZ.
 *
 * React StrictMode geliştirme modunda her bileşeni iki kez render eder.
 * Değeri render sırasında tüketseydik ikinci render'da boş bulur ve
 * yönlendirme hiç gerçekleşmezdi. Bu yüzden okuma ile temizleme ayrıldı:
 * temizleme, yönlendirme yapıldıktan sonra bir efekt içinde olur.
 */
export function peekPendingPath() {
  return pendingPath;
}

export function clearPendingPath() {
  pendingPath = null;
}

export default function RequireVault({ children }) {
  const { status } = useVault();
  const location = useLocation();

  if (status === VAULT_STATUS.CHECKING) return <PageLoader label="Kasa açılıyor" />;

  if (status !== VAULT_STATUS.UNLOCKED) {
    // Kilit açıldıktan sonra kullanıcıyı okuduğu yere geri götürebilmek için
    // hedefi hatırla.
    pendingPath = `${location.pathname}${location.search}`;
    return <Navigate to="/" replace />;
  }

  return children;
}
