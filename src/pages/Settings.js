import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiDownload,
  FiUploadCloud,
  FiKey,
  FiShield,
  FiTrash2,
  FiHardDrive,
  FiCheck,
} from "react-icons/fi";

import Masthead from "../components/Masthead";
import ConfirmDialog from "../components/ConfirmDialog";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { exportBackup, getStats } from "../services/vault";
import { requestPersistence } from "../lib/idb";
import { toFriendlyMessage } from "../utils/errors";
import { formatBytes, formatDateTime, fileStamp } from "../utils/format";
import { scorePassphrase, validatePassphrase } from "../utils/validation";
import "../styles/Settings.css";

export default function Settings() {
  const navigate = useNavigate();
  const toast = useToast();
  const { key, changePassphrase, restore, destroy } = useVault();

  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(null);

  // Parola değiştirme
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passError, setPassError] = useState(null);

  // Geri yükleme
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePass, setRestorePass] = useState("");
  const [restoreMode, setRestoreMode] = useState("merge");
  const fileInput = useRef(null);

  const [confirmDestroy, setConfirmDestroy] = useState(false);

  const strength = useMemo(() => scorePassphrase(newPass), [newPass]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats());
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Bilgiler okunamadı."));
    }
  }, [toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /* ---- Yedek al ---- */
  const handleExport = async () => {
    setBusy("export");
    try {
      const backup = await exportBackup(key);

      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `gunluk-yedek-${fileStamp()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`${backup.entryCount} kayıt şifreli olarak dışa aktarıldı.`);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Yedek alınamadı."));
    } finally {
      setBusy(null);
    }
  };

  /* ---- Parola değiştir ---- */
  const handlePassphrase = async (event) => {
    event.preventDefault();
    if (busy) return;

    const error = validatePassphrase(newPass);
    if (error) return setPassError(error);
    if (newPass !== confirmPass) return setPassError("Parolalar eşleşmiyor.");

    setPassError(null);
    setBusy("passphrase");

    try {
      await changePassphrase(newPass);
      setNewPass("");
      setConfirmPass("");
      await loadStats();
      toast.success("Parola değişti ve tüm kayıtlar yeniden şifrelendi.");
    } catch (err) {
      toast.error(toFriendlyMessage(err, "Parola değiştirilemedi."));
    } finally {
      setBusy(null);
    }
  };

  /* ---- Geri yükle ---- */
  const handleRestore = async (event) => {
    event.preventDefault();
    if (busy || !restoreFile || !restorePass) return;

    setBusy("restore");
    try {
      const backup = JSON.parse(await restoreFile.text());
      const result = await restore(backup, restorePass, restoreMode);

      setRestoreFile(null);
      setRestorePass("");
      await loadStats();
      toast.success(`${result.entries} kayıt geri yüklendi.`);
      navigate("/");
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Yedek geri yüklenemedi."));
    } finally {
      setBusy(null);
    }
  };

  /* ---- Kalıcı depolama izni ---- */
  const handlePersist = async () => {
    const granted = await requestPersistence();
    await loadStats();

    if (granted) toast.success("Tarayıcı verini kalıcı olarak işaretledi.");
    else toast.info("Tarayıcı bu izni vermedi. Düzenli yedek almanı öneririz.");
  };

  const handleDestroy = async () => {
    setBusy("destroy");
    try {
      await destroy();
      toast.info("Kasa ve tüm veriler silindi.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Kasa silinemedi."));
      setBusy(null);
    }
  };

  const usedPercent =
    stats?.usage?.quota > 0
      ? Math.min(100, Math.round((stats.usage.usage / stats.usage.quota) * 100))
      : null;

  return (
    <div className="sheet sheet-narrow page">
      <Masthead title="Ayarlar" eyebrow="Kasa" backTo="/" showSettings={false} />

      {/* ---------- Durum ---------- */}
      <section className="settings-block">
        <h2 className="section-head">
          <span className="label">Kasa durumu</span>
        </h2>

        <dl className="facts">
          <div>
            <dt className="label">Kayıt</dt>
            <dd className="num">{stats ? stats.entryCount : "—"}</dd>
          </div>
          <div>
            <dt className="label">Ekli dosya</dt>
            <dd className="num">{stats ? stats.attachmentCount : "—"}</dd>
          </div>
          <div>
            <dt className="label">Kullanılan alan</dt>
            <dd className="num">{stats?.usage ? formatBytes(stats.usage.usage) : "—"}</dd>
          </div>
          <div>
            <dt className="label">Kurulum</dt>
            <dd className="num">{stats?.createdAt ? formatDateTime(stats.createdAt) : "—"}</dd>
          </div>
        </dl>

        {usedPercent !== null && (
          <div className="quota">
            <div className="quota-bar">
              <span style={{ width: `${Math.max(1, usedPercent)}%` }} />
            </div>
            <span className="meta">
              Tarayıcı kotasının %{usedPercent} kadarı kullanılıyor
              {stats?.usage?.quota ? ` (${formatBytes(stats.usage.quota)})` : ""}
            </span>
          </div>
        )}

        {stats?.persisted === false && (
          <div className="note note-warning">
            <FiHardDrive size={16} aria-hidden="true" />
            <span>
              Tarayıcı bu sitenin verisini <strong>kalıcı</strong> olarak
              işaretlememiş. Disk dolduğunda kendiliğinden silebilir.
              <button
                type="button"
                className="btn btn-quiet"
                onClick={handlePersist}
                style={{ marginLeft: "var(--s2)" }}
              >
                İzin iste
              </button>
            </span>
          </div>
        )}

        {stats?.persisted === true && (
          <div className="note">
            <FiCheck size={16} aria-hidden="true" />
            <span>Veri kalıcı olarak işaretli. Tarayıcı kendiliğinden silmez.</span>
          </div>
        )}
      </section>

      {/* ---------- Yedek ---------- */}
      <section className="settings-block">
        <h2 className="section-head">
          <span className="label">Yedekleme</span>
        </h2>

        <p className="settings-lede">
          Yedek dosyası da şifrelidir; aynı parolayla açılır. Cihaz değiştirirken
          ya da tarayıcı verisi silindiğinde tek kurtarma yolun budur.
        </p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleExport}
          disabled={Boolean(busy)}
        >
          {busy === "export" ? <span className="spinner" /> : <FiDownload size={15} aria-hidden="true" />}
          Şifreli yedek indir
        </button>

        <form className="settings-form" onSubmit={handleRestore}>
          <h3 className="settings-sub">Yedekten geri yükle</h3>

          <button
            type="button"
            className="btn btn-block attach-btn"
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(busy)}
          >
            <FiUploadCloud size={15} aria-hidden="true" />
            {restoreFile ? restoreFile.name : "Yedek dosyası seç (.json)"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) setRestoreFile(file);
            }}
          />

          {restoreFile && (
            <>
              <input
                className="input input-mono"
                type="password"
                autoComplete="off"
                placeholder="Yedeğin parolası"
                value={restorePass}
                onChange={(event) => setRestorePass(event.target.value)}
                aria-label="Yedek parolası"
                disabled={Boolean(busy)}
              />

              <div className="radio-row">
                <label className="checkbox">
                  <input
                    type="radio"
                    name="restore-mode"
                    checked={restoreMode === "merge"}
                    onChange={() => setRestoreMode("merge")}
                  />
                  <span className="checkbox-box" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Birleştir</strong> — mevcut günlükler kalsın
                  </span>
                </label>

                <label className="checkbox">
                  <input
                    type="radio"
                    name="restore-mode"
                    checked={restoreMode === "replace"}
                    onChange={() => setRestoreMode("replace")}
                  />
                  <span className="checkbox-box" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <strong>Değiştir</strong> — mevcut her şeyi sil, yedeği yükle
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-block"
                disabled={Boolean(busy) || !restorePass}
              >
                {busy === "restore" && <span className="spinner" />}
                Geri yükle
              </button>
            </>
          )}
        </form>
      </section>

      {/* ---------- Parola ---------- */}
      <section className="settings-block">
        <h2 className="section-head">
          <span className="label">Parola</span>
        </h2>

        <p className="settings-lede">
          Parolayı değiştirmek tüm kayıtları yeni anahtarla baştan şifreler.
          Kayıt sayısına göre birkaç saniye sürebilir. <strong>Eski yedek
          dosyaların eski parolayla açılmaya devam eder.</strong>
        </p>

        <form className="settings-form" onSubmit={handlePassphrase}>
          <div className="field">
            <label className="label" htmlFor="new-pass">
              Yeni parola
            </label>
            <input
              id="new-pass"
              className="input input-mono"
              type="password"
              autoComplete="new-password"
              value={newPass}
              onChange={(event) => setNewPass(event.target.value)}
              disabled={Boolean(busy)}
            />

            {newPass && (
              <div className={`strength strength-${strength.score}`}>
                <div className="strength-track" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`strength-seg${index < strength.score ? " on" : ""}`}
                    />
                  ))}
                </div>
                <div className="strength-read">
                  <strong>{strength.label}</strong>
                  {strength.hints.length > 0 && <span>{strength.hints[0]}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="field">
            <label className="label" htmlFor="confirm-pass">
              Yeni parola tekrar
            </label>
            <input
              id="confirm-pass"
              className="input input-mono"
              type="password"
              autoComplete="new-password"
              value={confirmPass}
              onChange={(event) => setConfirmPass(event.target.value)}
              disabled={Boolean(busy)}
            />
          </div>

          {passError && <span className="field-error">{passError}</span>}

          <button
            type="submit"
            className="btn"
            disabled={Boolean(busy) || !newPass || !confirmPass}
          >
            {busy === "passphrase" ? <span className="spinner" /> : <FiKey size={15} aria-hidden="true" />}
            Parolayı değiştir
          </button>
        </form>
      </section>

      {/* ---------- Güvenlik özeti ---------- */}
      <section className="settings-block">
        <h2 className="section-head">
          <span className="label">Şifreleme</span>
        </h2>

        <dl className="facts facts-wide">
          <div>
            <dt className="label">Algoritma</dt>
            <dd className="num">AES-256-GCM</dd>
          </div>
          <div>
            <dt className="label">Anahtar türetme</dt>
            <dd className="num">PBKDF2-SHA256</dd>
          </div>
          <div>
            <dt className="label">Tur sayısı</dt>
            <dd className="num">600.000</dd>
          </div>
          <div>
            <dt className="label">Parola değişimi</dt>
            <dd className="num">
              {stats?.passphraseChangedAt ? formatDateTime(stats.passphraseChangedAt) : "hiç"}
            </dd>
          </div>
        </dl>

        <div className="note">
          <FiShield size={16} aria-hidden="true" />
          <span>
            Anahtar yalnızca bellekte tutulur ve sayfa kapandığında yok olur.
            Parolan hiçbir yere yazılmaz; kasa 10 dakika işlem yapılmazsa
            kendini kilitler.
          </span>
        </div>
      </section>

      {/* ---------- Tehlikeli bölge ---------- */}
      <section className="settings-block danger-zone">
        <h2 className="section-head">
          <span className="label">Kasayı sil</span>
        </h2>

        <p className="settings-lede">
          Bu cihazdaki tüm günlükleri, taslakları ve ekleri kalıcı olarak siler.
          Geri alınamaz — önce yedek almanı öneririz.
        </p>

        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setConfirmDestroy(true)}
          disabled={Boolean(busy)}
        >
          <FiTrash2 size={15} aria-hidden="true" />
          Kasayı ve tüm verileri sil
        </button>
      </section>

      <ConfirmDialog
        open={confirmDestroy}
        eyebrow="Geri alınamaz"
        title="Her şey silinsin mi?"
        description={`${stats?.entryCount ?? 0} kayıt ve ${stats?.attachmentCount ?? 0} dosya bu cihazdan kalıcı olarak silinecek. Yedeğin yoksa geri getirilemez.`}
        confirmLabel="Evet, hepsini sil"
        busy={busy === "destroy"}
        onConfirm={handleDestroy}
        onCancel={() => busy !== "destroy" && setConfirmDestroy(false)}
      />
    </div>
  );
}
