/**
 * Uygulama simgelerini üretir: favicon.svg, favicon.ico, logo192.png, logo512.png
 *
 *   node scripts/make-icons.js
 *
 * Neden elle kodlanmış bir üretici: simgeyi bir tasarım dosyasından dışa
 * aktarmak yerine burada tanımlamak, renkleri tasarım sistemine bağlı tutar
 * ve projeye bir bağımlılık eklemeden her boyutu yeniden üretebilmemizi sağlar.
 * Node'un yerleşik zlib'i dışında hiçbir şey kullanılmıyor.
 *
 * Simge: kiremit rengi yuvarlatılmış kare üzerinde iki krem çizgi —
 * bir başlık satırı ve bir metin satırı. Soyut ama tarayıcı sekmesinde
 * 16 pikselde bile okunur ve uygulamanın paletini taşır.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT = path.join(__dirname, "..", "public");

/* --------------------------------------------------------------------------
   Palet (src/styles/theme.css ile aynı)
   -------------------------------------------------------------------------- */
const TERRACOTTA = [156, 66, 33]; // #9c4221
const CREAM = [250, 247, 240]; // #faf7f0

/* --------------------------------------------------------------------------
   Geometri — 0..1 birim uzayında tanımlı, her çözünürlükte aynı görünür
   -------------------------------------------------------------------------- */
const BACKGROUND = { x0: 0, y0: 1, x1: 0, y1: 1, radius: 0.19 };

const BARS = [
  // başlık satırı (uzun)
  { x0: 0.25, x1: 0.75, y0: 0.33, y1: 0.44, radius: 0.045 },
  // metin satırı (kısa)
  { x0: 0.25, x1: 0.58, y0: 0.56, y1: 0.67, radius: 0.045 },
];

/** Yuvarlatılmış dikdörtgen içinde mi? (imzalı mesafe alanı yaklaşımı) */
function inRoundedRect(u, v, x0, y0, x1, y1, radius) {
  const halfW = (x1 - x0) / 2;
  const halfH = (y1 - y0) / 2;
  const cx = x0 + halfW;
  const cy = y0 + halfH;

  const r = Math.min(radius, halfW, halfH);
  const dx = Math.max(Math.abs(u - cx) - (halfW - r), 0);
  const dy = Math.max(Math.abs(v - cy) - (halfH - r), 0);

  return Math.hypot(dx, dy) <= r;
}

/** Bir noktanın rengini döndürür: [r, g, b, a] */
function sample(u, v) {
  if (!inRoundedRect(u, v, 0, 0, 1, 1, BACKGROUND.radius)) return [0, 0, 0, 0];

  for (const bar of BARS) {
    if (inRoundedRect(u, v, bar.x0, bar.y0, bar.x1, bar.y1, bar.radius)) {
      return [...CREAM, 255];
    }
  }

  return [...TERRACOTTA, 255];
}

/** Kenar yumuşatma için her pikseli 4x4 örnekler. */
function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const SS = 4;
  const samples = SS * SS;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const [sr, sg, sb, sa] = sample(
            (x + (sx + 0.5) / SS) / size,
            (y + (sy + 0.5) / SS) / size
          );
          // Alfa ile ağırlıklandır: saydam kenarlarda renk kirlenmesin
          r += sr * sa;
          g += sg * sa;
          b += sb * sa;
          a += sa;
        }
      }

      const offset = (y * size + x) * 4;
      if (a === 0) {
        pixels.writeUInt32BE(0, offset);
      } else {
        pixels[offset] = Math.round(r / a);
        pixels[offset + 1] = Math.round(g / a);
        pixels[offset + 2] = Math.round(b / a);
        pixels[offset + 3] = Math.round(a / samples);
      }
    }
  }

  return pixels;
}

/* --------------------------------------------------------------------------
   PNG kodlayıcı
   -------------------------------------------------------------------------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); // genişlik
  header.writeUInt32BE(size, 4); // yükseklik
  header[8] = 8; // bit derinliği
  header[9] = 6; // renk tipi: RGBA
  header[10] = 0; // sıkıştırma
  header[11] = 0; // filtre
  header[12] = 0; // interlace

  // Her satırın başına filtre baytı (0 = filtresiz)
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------------------
   ICO kabı (içinde PNG taşır — tüm modern tarayıcılar destekler)
   -------------------------------------------------------------------------- */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // ayrılmış
  header.writeUInt16LE(1, 2); // tip: simge
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const at = index * 16;
    directory[at] = image.size >= 256 ? 0 : image.size; // 0 => 256
    directory[at + 1] = image.size >= 256 ? 0 : image.size;
    directory[at + 2] = 0; // palet rengi yok
    directory[at + 3] = 0; // ayrılmış
    directory.writeUInt16LE(1, at + 4); // renk düzlemi
    directory.writeUInt16LE(32, at + 6); // piksel başına bit
    directory.writeUInt32LE(image.data.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, directory, ...images.map((i) => i.data)]);
}

/* --------------------------------------------------------------------------
   SVG — modern tarayıcılar bunu tercih eder, her ölçekte keskindir
   -------------------------------------------------------------------------- */
function buildSvg() {
  const hex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  const bars = BARS.map(
    (b) =>
      `  <rect x="${b.x0 * 100}" y="${b.y0 * 100}" width="${((b.x1 - b.x0) * 100).toFixed(2)}" ` +
      `height="${((b.y1 - b.y0) * 100).toFixed(2)}" rx="${(b.radius * 100).toFixed(2)}" fill="${hex(CREAM)}"/>`
  ).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Günlük">
  <rect width="100" height="100" rx="${BACKGROUND.radius * 100}" fill="${hex(TERRACOTTA)}"/>
${bars}
</svg>
`;
}

/* --------------------------------------------------------------------------
   Üret
   -------------------------------------------------------------------------- */
const png = (size) => encodePng(size, render(size));

const outputs = [
  ["favicon.svg", Buffer.from(buildSvg(), "utf8")],
  ["favicon.ico", encodeIco([16, 32, 48].map((size) => ({ size, data: png(size) })))],
  ["logo192.png", png(192)],
  ["logo512.png", png(512)],
  ["apple-touch-icon.png", png(180)],
];

for (const [name, data] of outputs) {
  fs.writeFileSync(path.join(OUT, name), data);
  console.log(`  ${name.padEnd(22)} ${String(data.length).padStart(7)} bayt`);
}

console.log("[gunluk] simgeler üretildi.");
