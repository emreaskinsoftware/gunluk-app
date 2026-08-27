import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEdit3, FiTrash2, FiClock, FiPlus } from "react-icons/fi";

import Masthead from "../components/Masthead";
import ConfirmDialog from "../components/ConfirmDialog";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { KIND, DRAFT_TTL_MS, deleteEntryById, listEntries, purgeExpiredDrafts } from "../services/vault";
import { toFriendlyMessage } from "../utils/errors";
import { formatDateTime, truncate } from "../utils/format";
import "../styles/Drafts.css";

/** Silinmeye kalan süre: "5 sa 20 dk". */
function timeLeft(createdAt) {
  const remaining = DRAFT_TTL_MS - (Date.now() - createdAt);
  if (remaining <= 0) return "süresi doldu";

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return hours > 0 ? `${hours} sa ${minutes} dk` : `${minutes} dk`;
}

export default function Drafts() {
  const navigate = useNavigate();
  const toast = useToast();
  const { key } = useVault();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [clearAll, setClearAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;

    setLoading(true);
    try {
      // "24 saat sonra silinir" uyarısını gerçekten uygula.
      // Eski sürümde taslaklar yalnızca listeden gizleniyor, kayıtlar
      // sonsuza dek duruyordu.
      const purged = await purgeExpiredDrafts();
      if (purged > 0) toast.info(`${purged} süresi dolmuş taslak silindi.`);

      setDrafts(await listEntries(key, KIND.DRAFT));
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Taslaklar açılamadı."));
    } finally {
      setLoading(false);
    }
  }, [key, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDeleteOne = async () => {
    if (!pendingDelete) return;

    setBusy(true);
    try {
      await deleteEntryById(pendingDelete.id);
      setDrafts((current) => current.filter((draft) => draft.id !== pendingDelete.id));
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
      for (const draft of drafts) {
        await deleteEntryById(draft.id);
      }
      setDrafts([]);
      toast.success("Tüm taslaklar silindi.");
      setClearAll(false);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Taslaklar silinemedi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet sheet-narrow page">
      <Masthead title="Taslaklar" eyebrow="Tamamlanmamış" backTo="/" showSettings={false}>
        {drafts.length > 0 && (
          <button
            type="button"
            className="btn btn-quiet btn-danger"
            onClick={() => setClearAll(true)}
          >
            <FiTrash2 size={15} aria-hidden="true" />
            <span className="btn-text">Tümünü sil</span>
          </button>
        )}
      </Masthead>

      <div className="note note-warning">
        <FiClock size={16} aria-hidden="true" />
        <span>
          Taslaklar oluşturulduktan <strong>24 saat</strong> sonra otomatik
          silinir. Saklamak istediğini günlük olarak kaydet.
        </span>
      </div>

      {loading && (
        <div className="draft-list">
          {[0, 1].map((index) => (
            <article className="draft" key={index}>
              <div className="skeleton" style={{ height: 11, width: "34%" }} />
              <div className="skeleton" style={{ height: 13, width: "100%", marginTop: 12 }} />
              <div className="skeleton" style={{ height: 13, width: "72%", marginTop: 6 }} />
            </article>
          ))}
        </div>
      )}

      {!loading && drafts.length === 0 && (
        <div className="empty">
          <span className="label">Boş</span>
          <h3>Bekleyen taslak yok</h3>
          <p>
            Bir günlüğü yazarken bitiremezsen &quot;Taslak&quot; düğmesiyle
            kaydedebilirsin. Burada seni bekler.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/yaz")}>
            <FiPlus size={16} aria-hidden="true" />
            Yazmaya başla
          </button>
        </div>
      )}

      {!loading && drafts.length > 0 && (
        <div className="draft-list">
          {drafts.map((draft, index) => (
            <article className="draft stagger" key={draft.id} style={{ "--i": index }}>
              <div className="draft-head">
                <span className="meta">{formatDateTime(draft.createdAt)}</span>
                <span className="tag tag-warning">
                  <FiClock size={10} aria-hidden="true" />
                  {timeLeft(draft.createdAt)}
                </span>
              </div>

              <p className="draft-excerpt">
                {truncate(draft.plainText, 200) || "Boş taslak"}
              </p>

              <div className="draft-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => navigate("/yaz", { state: { draft } })}
                >
                  <FiEdit3 size={14} aria-hidden="true" />
                  Devam et
                </button>
                <button
                  type="button"
                  className="btn btn-quiet btn-danger"
                  onClick={() => setPendingDelete(draft)}
                >
                  <FiTrash2 size={14} aria-hidden="true" />
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        eyebrow="Kalıcı silme"
        title="Taslak silinsin mi?"
        description="Bu taslak ve ekli dosyaları kalıcı olarak silinecek."
        busy={busy}
        onConfirm={confirmDeleteOne}
        onCancel={() => !busy && setPendingDelete(null)}
      />

      <ConfirmDialog
        open={clearAll}
        eyebrow="Kalıcı silme"
        title="Tüm taslaklar silinsin mi?"
        description={`${drafts.length} taslağın tamamı kalıcı olarak silinecek. Geri alınamaz.`}
        confirmLabel="Hepsini sil"
        busy={busy}
        onConfirm={confirmClearAll}
        onCancel={() => !busy && setClearAll(false)}
      />
    </div>
  );
}
