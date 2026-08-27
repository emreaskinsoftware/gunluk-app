# 📔 Günlüğüm

Kişisel dijital günlük uygulaması. Günlerini zengin metin editörüyle yaz, yıldızla
puanla, takvimde geriye dönüp bak. Reklam yok, takip yok, üçüncü taraf analitik yok.

**React 18 + Firebase** ile geliştirildi ve **tamamen ücretsiz** planlarda çalışacak
şekilde tasarlandı.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Kurulum](#kurulum)
- [Güvenlik kuralları (zorunlu adım)](#güvenlik-kuralları-zorunlu-adım)
- [Ücretsiz kalmak](#ücretsiz-kalmak)
- [Yayına alma](#yayına-alma)
- [Güvenlik mimarisi](#güvenlik-mimarisi)
- [Proje yapısı](#proje-yapısı)
- [Komutlar](#komutlar)
- [Sorun giderme](#sorun-giderme)

---

## Özellikler

| | |
|---|---|
| ✍️ **Zengin metin editörü** | Başlık, kalın/italik, renk, liste, alıntı, kod bloğu |
| ⭐ **Günlük puanlama** | Her güne 1–5 yıldız; klavyeyle de kullanılabilir |
| 📅 **Takvim görünümü** | Yazdığın günler işaretli; bir güne tıklayınca liste filtrelenir |
| 🔍 **Tam metin arama** | Sadece tarihte değil, günlük içeriğinde de arar |
| 📎 **Dosya ekleri** | Resim, ses, PDF, TXT — boyut ve tür denetimli |
| 📝 **Taslaklar** | Yarım kalan yazılar 24 saat saklanır, sonra gerçekten silinir |
| 🌗 **Açık / koyu tema** | Sistem tercihini algılar, seçim hatırlanır |
| ⬇️ **Dışa aktarma** | Günlüğü `.txt` olarak indir |
| ♿ **Erişilebilirlik** | Klavye navigasyonu, odak halkaları, `prefers-reduced-motion` desteği |
| 📱 **Mobil uyumlu** | Tek elle kullanılabilir yerleşim, hızlı erişim düğmesi |

---

## Kurulum

### 1. Gereksinimler

- Node.js 18 veya üzeri
- Ücretsiz bir [Firebase](https://console.firebase.google.com) hesabı

### 2. Projeyi indir ve bağımlılıkları kur

```bash
git clone https://github.com/emreaskinsoftware/gunluk-app.git
```

```bash
cd gunluk-app && npm install
```

### 3. Firebase projesi oluştur

1. [Firebase Console](https://console.firebase.google.com) → **Proje ekle**
2. **Build → Authentication → Get started → Sign-in method → E-posta/Parola**'yı etkinleştir
3. **Build → Firestore Database → Create database** → *production mode* seç
4. (İsteğe bağlı, dosya ekleri için) **Build → Storage → Get started**
5. **⚙️ Proje ayarları → Genel → Uygulamalarınız → Web (`</>`)** ile bir web uygulaması ekle

### 4. Ortam değişkenlerini ayarla

```bash
cp .env.example .env
```

`.env` dosyasını aç ve Firebase Console'daki `firebaseConfig` değerlerini yapıştır.
Eksik bırakırsan uygulama açıldığında ne yapman gerektiğini anlatan bir kurulum
ekranı gösterir (beyaz ekran vermez).

### 5. Çalıştır

```bash
npm start
```

---

## Güvenlik kuralları (zorunlu adım)

> ⚠️ **Bu adımı atlarsan uygulama çalışmaz.** Firestore sorguları dizin (index)
> gerektirir ve varsayılan kurallar tüm erişimi reddeder.

```bash
npm install -g firebase-tools
```

```bash
firebase login && firebase use --add
```

```bash
npm run rules:deploy
```

Bu komut üç şeyi birden yayınlar:

| Dosya | Görevi |
|---|---|
| `firestore.rules` | Kimin hangi veriyi okuyup yazabileceği |
| `firestore.indexes.json` | `userId + createdAt` bileşik dizinleri |
| `storage.rules` | Dosya sahipliği, boyut ve MIME tipi denetimi |

Dosya eklerini kullanacaksan CORS ayarını da uygula (`cors.json` içindeki alan
adını kendi adresinle değiştir):

```bash
gsutil cors set cors.json gs://SENIN-BUCKET-ADIN.firebasestorage.app
```

---

## Ücretsiz kalmak

Bu proje **hiçbir ücretli servis kullanmaz**. Maliyet çıkmaması için alınan
önlemler:

- **Firebase Data Connect kaldırıldı.** Eski sürümde bulunan `dataconnect/`
  klasörü, ücretli bir **Cloud SQL** örneği gerektiriyordu. İçi tamamen örnek
  yorum satırlarından oluşuyordu ve hiç kullanılmıyordu.
- **Sorgu başına 200 kayıt sınırı.** Sıralama ve filtreleme tarayıcıda yapılır;
  her sıralama değişikliğinde yeniden okuma yapılmaz.
- **Tek bileşik dizin.** Dört ayrı sıralama sorgusu yerine tek sorgu kullanılır.
- **Dosya sınırları.** Dosya başına 5 MB, günlük başına 5 dosya (hem istemcide
  hem `storage.rules` içinde zorunlu).
- **Silinen günlüğün dosyaları da silinir.** Yetim dosyalar kotada birikmez.
- **Süresi dolan taslaklar gerçekten silinir.**

### Storage kullanmadan çalıştırmak

Firebase Storage **yeni projelerde Blaze (kredi kartı) planı** ister. Spark
(ücretsiz) planda kalmak istiyorsan `.env` dosyasında:

```
REACT_APP_ENABLE_ATTACHMENTS=false
```

Bu durumda dosya ekleme arayüzü kapanır, Storage servisi hiç başlatılmaz ve
uygulamanın geri kalanı sorunsuz çalışır.

### Ücretsiz kota (Spark planı)

| Kaynak | Günlük ücretsiz sınır |
|---|---|
| Firestore okuma | 50.000 |
| Firestore yazma | 20.000 |
| Firestore depolama | 1 GiB |
| Authentication | Sınırsız (e-posta/parola) |

Kişisel kullanımda bu sınırlara yaklaşmak neredeyse imkânsızdır.

---

## Yayına alma

Her iki seçenek de ücretsiz plan sunar.

### Vercel

Depoyu Vercel'e bağlaman yeterli. `vercel.json` dosyası şunları hazır getirir:

- SPA yönlendirmesi (sayfa yenilenince 404 olmaz)
- **Content-Security-Policy**, `X-Frame-Options`, `HSTS`, `Referrer-Policy` başlıkları
- Statik dosyalar için uzun süreli önbellek

Ortam değişkenlerini **Settings → Environment Variables** bölümüne eklemeyi unutma.

### Firebase Hosting

```bash
npm run build && firebase deploy --only hosting
```

---

## Güvenlik mimarisi

Uygulama **sıfır güven (zero-trust)** ilkesiyle kurgulanmıştır: istemci kodu her
zaman atlatılabilir kabul edilir, asıl denetim sunucu tarafındadır.

### Sunucu tarafı (atlatılamaz)

| Katman | Ne yapar |
|---|---|
| `firestore.rules` | Her kayıt sahibine kilitli. Liste sorguları `userId` filtresi ve `limit()` olmadan **çalışmaz**. İçerik boyutu, puan aralığı ve dosya sayısı sunucuda doğrulanır. Fazladan alan eklenemez. |
| `storage.rules` | Dosyalar `users/{uid}/...` altında. Başkasının klasörüne yazma/okuma yok. 5 MB üst sınır ve MIME tipi beyaz listesi. `text/html` yüklenip depolama üzerinden XSS servis edilmesi engellenir. |
| HTTP başlıkları | CSP, HSTS, `X-Frame-Options: DENY` (clickjacking), `nosniff`, kısıtlayıcı `Permissions-Policy`. |

### İstemci tarafı (savunma derinliği)

| Katman | Ne yapar |
|---|---|
| **XSS temizliği** | Zengin metin, DOMPurify ile **hem kaydederken hem ekrana basarken** temizlenir. Katı beyaz liste: `<script>`, `<iframe>`, `<img onerror>`, `javascript:` bağlantıları ve SVG/MathML tamamen elenir. |
| **Rota koruması** | Oturum gerektiren sayfalar `ProtectedRoute` ile sarmalıdır; giriş yapmış kullanıcı giriş sayfasını göremez. |
| **Deneme sınırlaması** | 5 başarısız girişten sonra kademeli kilit (30 sn → 15 dk). |
| **Hesap numaralandırma koruması** | "Kullanıcı yok" ile "parola yanlış" aynı mesajı döndürür. Parola sıfırlama, adresin kayıtlı olup olmadığını sızdırmaz. |
| **Hareketsizlik kilidi** | 30 dakika işlem yapılmazsa oturum otomatik kapanır. |
| **Oturum kalıcılığı** | "Beni hatırla" işaretlenmezse oturum sekme kapanınca biter (ortak bilgisayarlar için). |
| **Parola politikası** | En az 8 karakter + harf + rakam; yaygın parolalar reddedilir; canlı güç göstergesi. |
| **E-posta doğrulama** | Kayıtta doğrulama bağlantısı gönderilir, doğrulanmamış hesaplar uyarılır. |
| **Dosya doğrulama** | MIME tipi **ve** uzantı birlikte kontrol edilir; biri sahteyse diğeri yakalar. |
| **Dosya adı temizliği** | Yol geçişi (`../`) ve kontrol karakterleri elenir; yalnızca harf/rakam/güvenli noktalama kalır. |
| **Hata mesajları** | Ham Firebase hataları kullanıcıya gösterilmez; iç yapı sızdırılmaz. |
| **`noindex`** | Kişisel içerik arama motorlarına indekslenmez. |

> **Firebase Web API anahtarı gizli değildir.** Firebase SDK bu anahtarı zaten
> tarayıcıya gönderir; sızması bir güvenlik açığı değildir. Güvenlik tamamen
> yukarıdaki kural dosyalarından gelir. Yine de `.env` deposu commit edilmez.

### Önerilen Firebase Console ayarları

- **Authentication → Settings → E-posta numaralandırma korumasını etkinleştir**
- **Authentication → Settings → Yetkili alan adları**: yalnızca kendi alan adını bırak
- **App Check** (isteğe bağlı, ücretsiz): reCAPTCHA ile bot koruması

---

## Proje yapısı

```
src/
├── components/          Yeniden kullanılabilir arayüz parçaları
│   ├── AuthLayout.js        Giriş/kayıt ekranlarının ortak çerçevesi
│   ├── AuroraBackground.js  Animasyonlu arka plan
│   ├── ConfigError.js       .env eksikse gösterilen kurulum ekranı
│   ├── ConfirmDialog.js     Erişilebilir onay penceresi
│   ├── ErrorBoundary.js     Beklenmeyen hatalarda beyaz ekran yerine mesaj
│   ├── ProtectedRoute.js    Rota koruması
│   ├── StarRating.js        Yıldız puanlama (sıfır bağımlılık)
│   ├── ThemeToggle.js       Açık/koyu tema düğmesi
│   └── TopBar.js            Yapışkan üst çubuk
├── context/             Uygulama geneli durum
│   ├── AuthContext.js       Oturum + hareketsizlik kilidi
│   ├── ThemeContext.js      Tema tercihi
│   └── ToastContext.js      Bildirimler (alert() yerine)
├── hooks/
│   └── useLoginThrottle.js  Giriş deneme sınırlaması
├── pages/               Rota bileşenleri
├── services/            Firebase erişim katmanı
│   ├── diaries.js           Firestore okuma/yazma (her sorgu userId ile sınırlı)
│   └── storage.js           Dosya yükleme/silme
├── styles/              Tasarım sistemi + sayfa stilleri
│   └── theme.css            Tüm renk, boşluk, animasyon değişkenleri
└── utils/
    ├── errors.js            Firebase hata kodları → Türkçe mesaj
    ├── format.js            Tarih/sayı biçimlendirme
    ├── sanitize.js          XSS temizliği
    └── validation.js        Girdi doğrulama kuralları
```

---

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm start` | Geliştirme sunucusu (http://localhost:3000) |
| `npm run build` | Üretim derlemesi (`build/` klasörü) |
| `npm test` | Testleri çalıştır |
| `npm run rules:deploy` | Firestore kuralları + dizinleri + Storage kuralları yayınla |
| `npm run emulators` | Firebase emülatörlerini yerelde başlat |

---

## Sorun giderme

**"Kurulum tamamlanmamış" ekranı görüyorum**
`.env` dosyası yok veya eksik. `.env.example` dosyasını kopyalayıp doldur,
ardından sunucuyu **yeniden başlat** (CRA ortam değişkenlerini yalnızca
başlangıçta okur).

**"Veritabanı dizini eksik" hatası**
`npm run rules:deploy` komutunu çalıştır. Dizinlerin oluşması birkaç dakika sürebilir.

**"Bu işlem için yetkiniz yok"**
Güvenlik kuralları yayınlanmamış olabilir. `npm run rules:deploy` çalıştır.

**Dosya yükleme başarısız**
Firebase Storage etkinleştirilmemiş olabilir (Blaze planı gerektirir).
`.env` dosyasında `REACT_APP_ENABLE_ATTACHMENTS=false` yaparak özelliği kapatabilirsin.

**Günlükler listelenmiyor**
Tarayıcı konsolunu aç. `failed-precondition` görüyorsan dizin eksiktir;
`permission-denied` görüyorsan kurallar yayınlanmamıştır.

---

## Lisans

Kişisel kullanım için. — [emreaskinsoftware](https://github.com/emreaskinsoftware)
