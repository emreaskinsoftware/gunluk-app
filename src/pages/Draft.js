import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEdit3, FiTrash2, FiClock, FiPlus } from "react-icons/fi";

import TopBar from "../components/TopBar";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  DRAFTS,
  DRAFT_TTL_MS,
  deleteEntry,
  fetchDrafts,
  purgeExpiredDrafts,
} from "../services/diaries";
import { toFriendlyMessage } from "../utils/errors";
import { htmlToPlainText } from "../utils/sanitize";
import { formatDateTime, toDate, truncate } from "../utils/format";
import "../styles/Draft.css";

/** Taslağın silinmesine kalan süreyi "5s 20dk" biçiminde verir. */
function remainingLabel(createdAt) {
  const created = toDate(createdAt);
  if (!created) return null;

  const left = DRAFT_TTL_MS - (Date.now() - created.getTime());
  if (left <= 0) return "Süresi doldu";

  const hours = Math.floor(left / 3600000);
  const minutes = Math.floor((left % 3600000) / 60000);

  return hours > 0 ? `${hours} sa ${minutes} dk kaldı` : `${minutes} dk kaldı`;
}

export default function Draft() {
  const navigate = useNavigate();
  const toast = useToast();
  const { userId } = useAuth();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [clearAll, setClearAll] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ------------------------------------------------------------------
     Yükleme

     KRİTİK DÜZELTME: Eski sürüm `getDocs(collection(db, "drafts"))`
     çağırıyordu — yani koleksiyonun TAMAMINI. Her kullanıcı diğer
     kullanıcıların taslaklarını görüyor, "Tümünü Sil" düğmesi de
     herkesin taslağını siliyordu. Artık sorgu userId ile sınırlı ve
     firestore.rules bunu zorunlu kılıyor.
     ------------------------------------------------------------------ */
  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const rows = await fetchDrafts(userId);

      // Süresi dolanları gerçekten sil (eskiden sadece gizleniyorlardı)
      const purged = await purgeExpiredDrafts(rows);
      if (purged > 0) {
        toast.info(`${purged} süresi dolmuş taslak temizlendi.`);
      }

      const now = Date.now();
      setDrafts(
        rows.filter((draft) => {
          const created = toDate(draft.createdAt);
          return created && now - created.getTime() <= DRAFT_TTL_MS;
        })
      );
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Taslaklar yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...drafts].sort(
        (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)
      ),
    [drafts]
  );

  /* ------------------------------------------------------------------
     İşlemler
     ------------------------------------------------------------------ */
  const confirmDeleteOne = async () => {
    if (!pendingDelete) return;

    setBusy(true);
    try {
      await deleteEntry(DRAFTS, pendingDelete);
      setDrafts((current) => current.filter((d) => d.id !== pendingDelete.id));
      toast.success("Taslak silindi.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Taslak silinemedi."));
    } finally {
      setBusy(false);
    }
  };

  const confirmClearAll = async () => {
    setBusy(true);
    try {
      // Yalnızca EKRANDA GÖRÜNEN, yani bu kullanıcıya ait taslaklar silinir.
      await Promise.all(drafts.map((draft) => deleteEntry(DRAFTS, draft)));
      setDrafts([]);
      toast.success("Tüm taslakların silindi.");
      setClearAll(false);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Taslaklar silinemedi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell page-enter">
      <TopBar title="Taslaklar" subtitle="Tamamlanmamış günlükler" backTo="/home">
        {drafts.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost danger-ghost"
            onClick={() => setClearAll(true)}
          >
            <FiTrash2 size={17} aria-hidden="true" />
            <span className="btn-label">Tümünü sil</span>
          </button>
        )}
      </TopBar>

      <div className="draft-warning">
        <FiClock size={17} aria-hidden="true" />
        <span>
          Taslaklar oluşturulduktan <strong>24 saat</strong> sonra otomatik olarak
          silinir. Saklamak istediklerini günlük olarak kaydet.
        </span>
      </div>

      {loading && (
        <div className="draft-grid">
          {[0, 1, 2].map((index) => (
            <div className="draft-card" key={index}>
              <div className="skeleton" style={{ height: 16, width: "55%" }} />
              <div className="skeleton" style={{ height: 12, width: "100%" }} />
              <div className="skeleton" style={{ height: 12, width: "80%" }} />
              <div className="skeleton" style={{ height: 36, width: "100%" }} />
            </div>
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="card empty-state">
          <span className="empty-icon" aria-hidden="true">
            📝
          </span>
          <h3>Taslak yok</h3>
          <p>
            Bir günlüğü yazarken bitiremezsen &quot;Taslak&quot; düğmesiyle
            kaydedebilirsin. Burada seni bekler.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/diary")}
          >
            <FiPlus size={18} aria-hidden="true" />
            Yazmaya başla
          </button>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="draft-grid">
          {sorted.map((draft, index) => {
            const preview = truncate(
              draft.plainText || htmlToPlainText(draft.content),
              150
            );
            const left = remainingLabel(draft.createdAt);

            return (
              <article
                className="draft-card stagger"
                key={draft.id}
                style={{ "--i": Math.min(index, 12) }}
              >
                <header>
                  <h3>{formatDateTime(draft.createdAt)}</h3>
                  {left && (
                    <span className="badge badge-amber">
                      <FiClock size={11} aria-hidden="true" />
                      {left}
                    </span>
                  )}
                </header>

                <p className="draft-preview">
                  {preview || "Boş taslak"}
                </p>

                <footer className="draft-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate("/diary", { state: { draft } })}
                  >
                    <FiEdit3 size={16} aria-hidden="true" />
                    Düzenlemeye devam et
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost danger-ghost"
                    onClick={() => setPendingDelete(draft)}
                    aria-label="Taslağı sil"
                  >
                    <FiTrash2 size={16} aria-hidden="true" />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Taslak silinsin mi?"
        description="Bu taslak ve ekli dosyaları kalıcı olarak silinecek."
        busy={busy}
        onConfirm={confirmDeleteOne}
        onCancel={() => !busy && setPendingDelete(null)}
      />

      <ConfirmDialog
        open={clearAll}
        title="Tüm taslaklar silinsin mi?"
        description={`${drafts.length} taslağın tamamı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Evet, hepsini sil"
        busy={busy}
        onConfirm={confirmClearAll}
        onCancel={() => !busy && setClearAll(false)}
      />
    </div>
  );
}
