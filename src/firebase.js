import { initializeApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { ATTACHMENTS_ENABLED } from "./utils/validation";

/* --------------------------------------------------------------------------
   Yapılandırma
   --------------------------------------------------------------------------
   Bu anahtarlar GİZLİ DEĞİLDİR — Firebase Web SDK'sı bunları zaten tarayıcıya
   gönderir. Uygulamanın gerçek güvenliği firestore.rules / storage.rules
   dosyalarından gelir. Yine de .env dosyası commit EDİLMEZ; böylece herkes
   kendi Firebase projesini bağlayabilir.
   -------------------------------------------------------------------------- */
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

/**
 * Eksik ortam değişkenlerini erkenden yakala.
 *
 * Eski sürümde .env yoksa uygulama anlaşılmaz bir Firebase hatasıyla beyaz
 * ekran veriyordu. Artık ne yapılması gerektiğini net söylüyoruz.
 */
export const missingEnvKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => `REACT_APP_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`);

export const isFirebaseConfigured = missingEnvKeys.length === 0;

if (!isFirebaseConfigured) {
  console.error(
    "[gunluk] Firebase yapılandırması eksik. `.env.example` dosyasını `.env` " +
      "olarak kopyalayıp değerleri doldurun, ardından sunucuyu yeniden başlatın.\n" +
      "Eksik değişkenler:\n  " +
      missingEnvKeys.join("\n  ")
  );
}

/* --------------------------------------------------------------------------
   Servisler
   -------------------------------------------------------------------------- */
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

/** Arayüz dilini Türkçe yap (parola sıfırlama e-postaları dahil). */
auth.languageCode = "tr";

export const db = getFirestore(app);

/**
 * Storage yalnızca dosya ekleri açıkken başlatılır.
 * Ücretsiz (Spark) planda kalmak isteyenler REACT_APP_ENABLE_ATTACHMENTS=false
 * yaparak bu servisi hiç devreye almaz.
 */
export const storage = ATTACHMENTS_ENABLED ? getStorage(app) : null;

/**
 * Oturum kalıcılığını ayarlar.
 *
 * - remember = true  → tarayıcı kapansa bile oturum sürer (localStorage)
 * - remember = false → sekme kapanınca oturum biter (ortak bilgisayarlar için)
 *
 * Bu, kişisel bir günlük uygulamasında önemli bir güvenlik tercihidir.
 */
export function applyPersistence(remember) {
  return setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence
  );
}
