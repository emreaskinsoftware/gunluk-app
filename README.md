# Günlük

Uçtan uca şifreli, sunucusuz kişisel günlük.

Hesap yok. Sunucu yok. Bulut yok. Yazdıkların cihazının dışına **hiç çıkmıyor**:
tarayıcıda AES-256-GCM ile şifreleniyor ve yine tarayıcıda saklanıyor.
Şifre çözme anahtarı senin parolandan üretiliyor ve yalnızca bellekte duruyor.

Hiçbir ücretli servise bağlı değil — ne bugün ne de ileride bir fatura üretir.

```bash
npm install && npm start
```

Kurulum bu kadar. Yapılandırma dosyası, API anahtarı, veritabanı ayarı yok.

---

## İçindekiler

- [Nasıl çalışıyor](#nasıl-çalışıyor)
- [Özellikler](#özellikler)
- [Güvenlik modeli](#güvenlik-modeli)
- [Neyi bilmen gerekiyor](#neyi-bilmen-gerekiyor)
- [Yayına alma](#yayına-alma)
- [Proje yapısı](#proje-yapısı)
- [Tasarım](#tasarım)
- [Sık sorulanlar](#sık-sorulanlar)

---

## Nasıl çalışıyor

```
   parolan
      │
      ▼  PBKDF2-SHA256 · 600.000 tur
   anahtar ──────────────► yalnızca BELLEKTE
      │                    (diske hiç yazılmaz)
      ▼  AES-256-GCM
   şifreli günlük ───────► IndexedDB (bu tarayıcı)

   yedek: dışa aktar → gunluk-yedek-....json (yine şifreli)
```

Uygulama açıldığında kasa kilitlidir. Parolanı girersin, anahtar yeniden
türetilir (~0,3 sn), günlükler çözülür. Sekmeyi kapattığında anahtar yok olur.

**Ağ trafiği:** İlk yüklemede uygulama dosyaları ve Google Fonts'tan yazı
tipleri. Sonrası yok. Günlük içeriği hiçbir koşulda bir isteğe konmaz.

---

## Özellikler

| | |
|---|---|
| **Şifreli kasa** | AES-256-GCM · PBKDF2 600.000 tur · anahtar yalnızca bellekte |
| **Zengin metin** | Başlık, kalın/italik, liste, alıntı, kod, bağlantı |
| **Günlük puanlama** | 1–5 yıldız, klavyeyle de kullanılabilir |
| **Takvim** | Yazılan günler işaretli; bir güne tıklayınca liste daralır |
| **Tam metin arama** | Tarihte ve günlük metninde arar |
| **Dosya ekleri** | Resim, ses, PDF, TXT — bunlar da şifrelenir |
| **Taslaklar** | 24 saat saklanır, sonra **gerçekten** silinir |
| **Şifreli yedek** | Tek `.json` dosyası; başka cihazda aynı parolayla açılır |
| **Otomatik kilit** | 10 dakika işlem yapılmazsa kasa kilitlenir |
| **Gündüz / gece** | Sistem tercihini algılar, seçim hatırlanır |
| **Çevrimdışı** | İnternet olmadan çalışır |
| **Erişilebilirlik** | Klavye navigasyonu, odak halkaları, `prefers-reduced-motion` |

---

## Güvenlik modeli

### Neye karşı koruyor

| Tehdit | Koruma |
|---|---|
| Bilgisayarını eline geçiren biri | Kayıtlar diskte şifreli. Parola olmadan okunamaz. |
| Tarayıcı profilini kopyalayan biri | IndexedDB'de yalnızca şifreli veri var (aşağıda kanıt). |
| Kaba kuvvetle parola denemesi | Her deneme PBKDF2 nedeniyle ~0,3 sn. Üstüne 5 yanlıştan sonra katlanan kilit (20 sn → 30 dk). |
| Açık bırakılmış ekran | 10 dakika hareketsizlikte otomatik kilit. |
| Kayıtlı içerikteki zararlı HTML (stored XSS) | İçerik **hem yazarken hem okurken** DOMPurify ile temizlenir. Katı beyaz liste; `<script>`, `<iframe>`, `<img onerror>`, `javascript:` ve SVG/MathML tamamen elenir. |
| Sunucu sızıntısı / veri ihlali | Sunucu yok. |
| Şirketin verini okuması | Veri şirkete hiç ulaşmıyor. |

### Diskte gerçekten ne duruyor

Şifrelemenin çalıştığını kendin doğrulayabilirsin: tarayıcıda
**F12 → Application → IndexedDB → gunluk → entries**. Bir kaydın içi şöyledir:

```js
{
  id: "255188dd-…",
  kind: "diary",
  createdAt: 1787...,   // takvim ve sıralama için açık
  rating: 4,            // takvim işaretleri için açık
  cipher: { iv: Uint8Array(12), data: Uint8Array(382) }   // ← yazdığın her şey
}
```

Yazdığın metin, dosya adları ve dosya içerikleri `cipher` içinde. Açıkta kalan
tek şey tarih ve puan — bunlar takvimi ve sıralamayı çözmeden yapabilmek için.

### Ek katmanlar

- **Content-Security-Policy** `script-src 'self'` kadar sıkı (satır içi betik
  yok — bkz. `.env.production`), `connect-src 'self'`, `frame-ancestors 'none'`
- `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS
- Dosya yüklemede MIME tipi **ve** uzantı birlikte denetlenir
- Dosya adlarında yalnızca harf/rakam/güvenli noktalama kalır (yol geçişi, kontrol karakterleri elenir)
- `noindex, nofollow` — kişisel içerik arama motorlarına düşmez
- Kaynak haritaları üretim derlemesinde kapalı

### Neye karşı korumaz

Dürüst olmak gerekirse:

- **Cihazındaki bir zararlı yazılım** kasa açıkken belleği okuyabilir.
- **Zayıf bir parola** şifrelemeyi anlamsızlaştırır. Birkaç kelimelik bir cümle kullan.
- **Kilit açıkken** ekranına bakan biri günlüklerini okur.
- Tarayıcı eklentileri sayfa içeriğine erişebilir.

---

## Neyi bilmen gerekiyor

> ### ⚠ Parolanı unutursan veriler kurtarılamaz
>
> Anahtar yalnızca senin parolandan üretiliyor ve hiçbir yerde saklanmıyor.
> "Parolamı sıfırla" diye bir şey yok — çünkü sıfırlayacak bir sunucu yok.
> Bu, tasarımın bir sonucu, eksiği değil.

> ### ⚠ Tarayıcı verisi silinirse günlükler gider
>
> "Site verilerini temizle", "geçmişi sil" veya tarayıcı profilini silmek
> kasayı da siler. **Düzenli olarak Ayarlar → Şifreli yedek indir** yap ve
> dosyayı güvenli bir yerde tut.
>
> Uygulama ilk kurulumda tarayıcıdan veriyi *kalıcı* işaretlemesini ister
> (`navigator.storage.persist`). Tarayıcı bu izni vermezse Ayarlar sayfasında
> uyarı görürsün.

> ### ℹ Cihazlar arası otomatik senkron yok
>
> Sunucu olmadığı için telefonun ve bilgisayarın kendiliğinden eşitlenmez.
> Taşıma yolu: bir cihazda **yedek indir**, diğerinde **yedekten geri yükle**.

---

## Yayına alma

Statik bir site olduğu için her yerde ücretsiz barınır.

### Vercel

Depoyu bağla, hazır. `vercel.json` şunları getirir: SPA yönlendirmesi,
güvenlik başlıkları (CSP dahil), statik dosyalar için uzun önbellek.
Ortam değişkeni girmene gerek yok — uygulamanın hiç yok.

### GitHub Pages / Netlify / herhangi bir statik sunucu

```bash
npm run build
```

`build/` klasörünü yayınla. Tek gereklilik: bilinmeyen adresleri
`index.html`'e yönlendiren bir kural (SPA yönlendirmesi).

### Sadece kendi bilgisayarında

Yayınlamak zorunda değilsin. `npm start` yeterli — hatta internet bağlantısı
olmadan da çalışır.

---

## Proje yapısı

```
src/
├── lib/
│   ├── crypto.js        PBKDF2 + AES-GCM (Web Crypto API)
│   └── idb.js           IndexedDB sarmalayıcı (bağımlılık yok)
├── services/
│   └── vault.js         Kasa: kur / aç / oku / yaz / yedekle
├── context/
│   ├── VaultContext.js  Kasa durumu + hareketsizlik kilidi
│   ├── ThemeContext.js  Gündüz / gece
│   └── ToastContext.js  Bildirimler (alert() yerine)
├── hooks/
│   └── useUnlockThrottle.js   Deneme sınırlaması
├── components/          Masthead, StarRating, ConfirmDialog, RequireVault …
├── pages/
│   ├── Setup.js         İlk kurulum (parola belirleme)
│   ├── Unlock.js        Kilit ekranı
│   ├── Home.js          Günlük listesi + takvim
│   ├── Write.js         Editör
│   ├── Read.js          Okuma
│   ├── Drafts.js        Taslaklar
│   └── Settings.js      Yedek, parola, kasayı sil
├── styles/
│   └── theme.css        Tüm renk / ölçü / hareket değerleri
└── utils/               sanitize · validation · format · errors
```

**Bağımlılıklar (10 adet):** react, react-dom, react-router-dom,
react-quill-new, react-calendar, react-icons, date-fns, dompurify,
web-vitals, react-scripts.

Şifreleme ve veritabanı için ek paket kullanılmıyor — ikisi de tarayıcının
kendi API'leri.

---

## Tasarım

Yön: **basılı defter / edebiyat dergisi**.

| Kural | |
|---|---|
| Gradyan | yok |
| Cam efekti (backdrop-blur) | yok |
| Kutu gölgesi | yalnızca modalda, o da çok kısık |
| Köşe yarıçapı | en fazla 3px |
| Ayırıcı | kutu değil, saç teli çizgi |
| Aksan rengi | tek: kiremit `#9c4221` |
| Gövde metni | serif (Source Serif 4) |
| Arayüz etiketleri | sans, büyük harf, harf aralıklı (IBM Plex Sans) |
| Tarih ve sayılar | monospace, hizalı (IBM Plex Mono) |
| Hareket | 4–8px kayma, çizgi çizilmesi, mürekkep dolması |

Gece teması siyah değil: lamba ışığında kararmış kağıt.

Tüm animasyonlar `prefers-reduced-motion` tercihine uyar ve yalnızca
`transform` / `opacity` üzerinden çalışır.

### Yazı tiplerini yerelleştirme

Tek dış istek Google Fonts'a gidiyor. Bunu da istemiyorsan:

1. [google-webfonts-helper](https://gwfh.mranftl.com) ile `Source Serif 4`,
   `IBM Plex Sans`, `IBM Plex Mono` woff2 dosyalarını indir
2. `public/fonts/` altına koy
3. `src/styles/theme.css` içindeki `@import` satırını `@font-face`
   tanımlarıyla değiştir
4. `vercel.json` içindeki CSP'den `fonts.googleapis.com` ve
   `fonts.gstatic.com` satırlarını sil

---

## Sık sorulanlar

**Verilerim gerçekten sunucuya gitmiyor mu?**
Gitmiyor. Ağ isteği yapan hiçbir kod yok. Tarayıcının Network sekmesini açık
tutup günlük yazabilirsin — uygulama dosyaları ve yazı tipleri dışında istek
görmezsin.

**Parolamı değiştirebilir miyim?**
Evet. Ayarlar → Parola. Tüm kayıtlar yeni anahtarla baştan şifrelenir.
*Eski yedek dosyaların eski parolayla açılmaya devam eder.*

**Ne kadar yer kaplayabilir?**
Tarayıcının verdiği kota kadar (genellikle diskin %10'u, birkaç GB).
Ayarlar sayfasında ne kadar kullandığını görürsün. Dosya başına 5 MB,
günlük başına 5 dosya sınırı var.

**Gizli sekmede çalışır mı?**
Çalışır ama sekmeyi kapattığında her şey silinir. Kalıcı kullanım için
normal pencere kullan.

**Aynı cihazda iki farklı kasa olur mu?**
Olmaz — tarayıcı profili başına bir kasa. İkinci bir kasa için farklı bir
tarayıcı profili kullan.

**Eski Firebase sürümündeki verilerim ne olacak?**
Bu sürüm Firebase'i tamamen kaldırdı. Eski verilerin Firestore konsolunda
duruyorsa dışa aktarıp elle taşıman gerekir; otomatik göç yolu yok.

---

## Komutlar

| Komut | |
|---|---|
| `npm start` | Geliştirme sunucusu (http://localhost:3000) |
| `npm run build` | Üretim derlemesi (`build/`) |
| `npm test` | Testler |

---

Kişisel kullanım için. — [emreaskinsoftware](https://github.com/emreaskinsoftware)
