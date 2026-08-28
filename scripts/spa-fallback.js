/**
 * SPA yönlendirmesi için 404.html üretir. `npm run build` sonrası
 * otomatik çalışır (package.json > postbuild).
 *
 * Sorun: Bu uygulama istemci tarafında yönlendirme yapıyor. /yaz veya
 * /gunluk/<id> adresine doğrudan gidildiğinde ya da o sayfada yenileme
 * yapıldığında sunucu diskte böyle bir dosya arar ve bulamaz.
 *
 * Vercel bunu `vercel.json` içindeki rewrite kuralıyla çözer. GitHub Pages'te
 * ise yönlendirme kuralı tanımlanamaz — ama bilinmeyen adreslerde 404.html
 * dosyasını servis eder ve TARAYICIDAKİ ADRESİ DEĞİŞTİRMEZ. index.html'in
 * birebir kopyasını 404.html olarak koyarsak uygulama açılır, React Router
 * adresi okur ve doğru sayfayı gösterir.
 *
 * (Yanıtın HTTP durum kodu 404 kalır. Arama motorları için sorun olurdu ama
 * bu uygulama zaten "noindex" işaretli kişisel bir defter.)
 */
const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "..", "build");
const source = path.join(buildDir, "index.html");
const target = path.join(buildDir, "404.html");

if (!fs.existsSync(source)) {
  console.error("[gunluk] build/index.html bulunamadı — önce `npm run build` çalıştırın.");
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log("[gunluk] build/404.html oluşturuldu (GitHub Pages SPA yönlendirmesi).");
