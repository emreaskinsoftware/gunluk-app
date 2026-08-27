/**
 * IndexedDB üzerine ince bir Promise sarmalayıcı.
 *
 * Neden hazır bir kütüphane değil: bu uygulamanın ihtiyacı üç basit depo ve
 * birkaç işlem. Bir bağımlılık eklemek paketi büyütür ve bakım yükü getirir.
 * Buradaki ~120 satır aynı işi yapıyor.
 *
 * localStorage değil IndexedDB kullanılıyor çünkü:
 *   - localStorage yalnızca metin tutar; şifreli ikili veri için uygun değil
 *   - localStorage ~5 MB ile sınırlı; IndexedDB yüzlerce MB'a çıkabilir
 *   - localStorage eşzamanlıdır ve büyük yazmalarda arayüzü dondurur
 */

const DB_NAME = "gunluk";
const DB_VERSION = 1;

export const STORES = {
  META: "meta",
  ENTRIES: "entries",
  ATTACHMENTS: "attachments",
};

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Bu tarayıcı IndexedDB desteklemiyor."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // Kasa ayarları: tuz, tur sayısı, doğrulama bloğu
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }

      // Günlükler ve taslaklar (içerik şifreli)
      if (!db.objectStoreNames.contains(STORES.ENTRIES)) {
        const store = db.createObjectStore(STORES.ENTRIES, { keyPath: "id" });
        store.createIndex("byCreatedAt", "createdAt");
        store.createIndex("byKind", "kind");
      }

      // Ekli dosyalar (içerik şifreli)
      if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) {
        const store = db.createObjectStore(STORES.ATTACHMENTS, { keyPath: "id" });
        store.createIndex("byEntryId", "entryId");
      }

      if (event.oldVersion > 0) {
        console.warn(`[gunluk] veritabanı ${event.oldVersion} -> ${DB_VERSION} yükseltildi`);
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // Başka bir sekme yükseltme isterse bu bağlantıyı kapat
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Veritabanı başka bir sekme tarafından kilitli. Diğer sekmeleri kapatın."));
  });

  return dbPromise;
}

/** Bir işlemi çalıştırır ve tamamlanmasını bekler. */
async function withStore(storeNames, mode, run) {
  const db = await openDatabase();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let result;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("İşlem iptal edildi."));

    try {
      result = run(
        names.length === 1
          ? tx.objectStore(names[0])
          : Object.fromEntries(names.map((n) => [n, tx.objectStore(n)])),
        tx
      );

      // run() bir istek döndürdüyse sonucunu yakala
      if (result && typeof result.then !== "function" && "onsuccess" in result) {
        const request = result;
        request.onsuccess = () => {
          result = request.result;
        };
      }
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

const promisify = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/* --------------------------------------------------------------------------
   Genel amaçlı işlemler
   -------------------------------------------------------------------------- */

export async function get(storeName, key) {
  const db = await openDatabase();
  return promisify(db.transaction(storeName, "readonly").objectStore(storeName).get(key));
}

export async function getAll(storeName) {
  const db = await openDatabase();
  return promisify(db.transaction(storeName, "readonly").objectStore(storeName).getAll());
}

export async function getAllByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  const index = db.transaction(storeName, "readonly").objectStore(storeName).index(indexName);
  return promisify(index.getAll(value));
}

export async function put(storeName, value) {
  return withStore(storeName, "readwrite", (store) => store.put(value));
}

/** Birden çok kaydı tek işlemde yazar (ya hepsi ya hiçbiri). */
export async function putMany(storeName, values) {
  return withStore(storeName, "readwrite", (store) => {
    values.forEach((value) => store.put(value));
  });
}

export async function remove(storeName, key) {
  return withStore(storeName, "readwrite", (store) => store.delete(key));
}

export async function removeMany(storeName, keys) {
  return withStore(storeName, "readwrite", (store) => {
    keys.forEach((key) => store.delete(key));
  });
}

export async function clear(storeNames) {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  return withStore(names, "readwrite", (stores) => {
    if (names.length === 1) stores.clear();
    else names.forEach((name) => stores[name].clear());
  });
}

export async function count(storeName) {
  const db = await openDatabase();
  return promisify(db.transaction(storeName, "readonly").objectStore(storeName).count());
}

/** Veritabanını tamamen siler (kasayı yok etme işlemi için). */
export async function deleteDatabase() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Silme engellendi. Uygulamanın açık olduğu diğer sekmeleri kapatın."));
  });
}

/** Tarayıcının bu siteye ayırdığı alan ve kullanım miktarı. */
export async function estimateUsage() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage: usage || 0, quota: quota || 0 };
  } catch {
    return null;
  }
}

/**
 * Tarayıcıdan verinin "kalıcı" işaretlenmesini ister.
 *
 * Bu izin verilmezse tarayıcı, disk dolduğunda site verisini kendiliğinden
 * temizleyebilir. Bir günlük uygulamasında bu veri kaybı demektir.
 */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
