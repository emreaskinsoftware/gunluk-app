import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { FiSave, FiPaperclip, FiTrash2, FiFileText, FiAlertCircle } from "react-icons/fi";

import Masthead from "../components/Masthead";
import StarRating from "../components/StarRating";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { KIND, deleteEntryById, saveEntry } from "../services/vault";
import { toFriendlyMessage } from "../utils/errors";
import { htmlToPlainText } from "../utils/sanitize";
import { formatBytes, formatLongDate } from "../utils/format";
import {
  MAX_CONTENT_CHARS,
  MAX_FILES,
  MAX_FILE_MB,
  validateFileBatch,
} from "../utils/validation";
import "../styles/Write.css";

/** Araç çubuğu — yalnızca sanitize edilebilen biçimler. */
const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block", "link"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};

const FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "list", "blockquote", "code-block", "link",
];

export default function Write() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { key } = useVault();

  /**
   * Bu sayfa üç durumda açılır:
   *   1. Boş sayfa            (state yok)
   *   2. Taslağı sürdürme     (state.draft.kind === "draft")
   *   3. Kayıtlı günlüğü düzenleme (state.draft.kind === "diary")
   *
   * Üçüncü durumda "Taslak" düğmesi gizlenir; aksi halde yayımlanmış bir
   * günlük yanlışlıkla taslağa geri döner ve listeden kaybolurdu.
   */
  const source = location.state?.draft || null;
  const editingDiary = source?.kind === KIND.DIARY;

  const [content, setContent] = useState(source?.content || "");
  const [files, setFiles] = useState(source?.files || []);
  const [rating, setRating] = useState(source?.rating || 0);
  const [entryId, setEntryId] = useState(source?.id || null);

  const [saving, setSaving] = useState(null); // "diary" | "draft" | null
  const [progress, setProgress] = useState(0);
  const [dirty, setDirty] = useState(false);

  const fileInput = useRef(null);

  const plainText = useMemo(() => htmlToPlainText(content), [content]);
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const isEmpty = plainText.length === 0;
  const tooLong = content.length > MAX_CONTENT_CHARS;

  /* Kaydedilmemiş yazı varken sekmeyi kapatmaya çalışanı uyar */
  useEffect(() => {
    if (!dirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleChange = useCallback((value) => {
    setContent(value);
    setDirty(true);
  }, []);

  /* ---- Dosya seçimi ---- */
  const handleFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (picked.length === 0) return;

    const { accepted, errors } = validateFileBatch(picked, files.length);
    errors.forEach((message) => toast.error(message));

    if (accepted.length > 0) {
      setFiles((current) => [...current, ...accepted]);
      setDirty(true);
    }
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setDirty(true);
  };

  /* ---- Kaydetme ---- */
  const persist = async (asDraft) => {
    if (saving) return;

    if (isEmpty) {
      toast.error("Boş bir günlük kaydedilemez.");
      return;
    }
    if (tooLong) {
      toast.error("Günlük çok uzun. Lütfen kısaltın.");
      return;
    }
    if (!asDraft && rating === 0) {
      toast.error("Kaydetmeden önce günü puanla.");
      return;
    }

    setSaving(asDraft ? "draft" : "diary");
    setProgress(0);

    try {
      if (asDraft) {
        const id = await saveEntry(
          key,
          { id: entryId || undefined, kind: KIND.DRAFT, content, rating, files },
          setProgress
        );
        setEntryId(id);
        setDirty(false);
        toast.success("Taslak kaydedildi. 24 saat içinde tamamlamayı unutma.");
        return;
      }

      // Taslaktan geliyorsak AYNI kaydın türünü değiştiriyoruz. Böylece
      // dosyalar yeniden şifrelenmez ve ortada artık bir taslak kalmaz —
      // eski sürümdeki "kaydettim ama taslak hâlâ duruyor" sorunu bu.
      await saveEntry(
        key,
        { id: entryId || undefined, kind: KIND.DIARY, content, rating, files },
        setProgress
      );

      setDirty(false);
      toast.success("Günlüğün kaydedildi.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Kaydedilemedi."));
    } finally {
      setSaving(null);
      setProgress(0);
    }
  };

  const discardDraft = async () => {
    if (!entryId) return;
    try {
      await deleteEntryById(entryId);
      toast.info("Taslak silindi.");
      navigate("/taslaklar", { replace: true });
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Taslak silinemedi."));
    }
  };

  const busy = Boolean(saving);

  return (
    <div className="sheet page">
      <Masthead
        title={editingDiary ? "Düzenle" : entryId ? "Taslak" : "Yeni sayfa"}
        eyebrow={formatLongDate(source?.createdAt ?? Date.now())}
        backTo="/"
        showLock={false}
        showSettings={false}
      >
        {!editingDiary && (
          <button
            type="button"
            className="btn"
            onClick={() => persist(true)}
            disabled={busy || isEmpty}
            title="Taslak olarak kaydet"
          >
            {saving === "draft" ? <span className="spinner" /> : <FiFileText size={15} aria-hidden="true" />}
            <span className="btn-text">Taslak</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => persist(false)}
          disabled={busy || isEmpty}
          title="Günlüğü kaydet"
        >
          {saving === "diary" ? <span className="spinner" /> : <FiSave size={15} aria-hidden="true" />}
          <span className="btn-text">Kaydet</span>
        </button>
      </Masthead>

      {busy && progress > 0 && progress < 100 && (
        <div className="progress" role="progressbar" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
          <em className="num">Dosyalar şifreleniyor · %{progress}</em>
        </div>
      )}

      <div className="desk">
        {/* --- Yazma alanı --- */}
        <section className="editor">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={handleChange}
            modules={MODULES}
            formats={FORMATS}
            placeholder="Bugün nasıl geçti?"
            readOnly={busy}
          />

          <footer className="editor-status">
            <span className="meta">
              {words} kelime · {plainText.length} karakter
            </span>

            {tooLong && (
              <span className="field-error">
                <FiAlertCircle size={13} aria-hidden="true" />
                Sınır aşıldı
              </span>
            )}

            {dirty && !busy && !tooLong && (
              <span className="unsaved">Kaydedilmedi</span>
            )}
          </footer>
        </section>

        {/* --- Yan sütun --- */}
        <aside className="margin-notes">
          <section className="margin-block">
            <h2 className="section-head">
              <span className="label">Günün puanı</span>
            </h2>
            <div className="rating-row">
              <StarRating value={rating} onChange={(value) => { setRating(value); setDirty(true); }} size={22} />
              <span className="meta">{rating > 0 ? `${rating} / 5` : "gerekli"}</span>
            </div>
          </section>

          <section className="margin-block">
            <h2 className="section-head">
              <span className="label">Ekler</span>
              <span className="count">
                {files.length}/{MAX_FILES}
              </span>
            </h2>

            <button
              type="button"
              className="btn btn-block attach-btn"
              onClick={() => fileInput.current?.click()}
              disabled={busy || files.length >= MAX_FILES}
            >
              <FiPaperclip size={15} aria-hidden="true" />
              Dosya ekle
            </button>

            <input
              ref={fileInput}
              type="file"
              multiple
              className="sr-only"
              accept="image/*,audio/*,application/pdf,text/plain"
              onChange={handleFiles}
              disabled={busy}
            />

            <p className="side-note">
              Resim, ses, PDF veya TXT · dosya başına en fazla{" "}
              <span className="num">{MAX_FILE_MB} MB</span>. Dosyalar da
              günlüğünle aynı anahtarla şifrelenir.
            </p>

            {files.length > 0 && (
              <ul className="attachments">
                {files.map((file, index) => {
                  const isNew = file instanceof File;
                  return (
                    <li
                      className="attachment stagger"
                      key={isNew ? `${file.name}-${index}` : file.id}
                      style={{ "--i": index }}
                    >
                      <span className="attachment-info">
                        <strong title={file.name}>{file.name}</strong>
                        <span className="meta">
                          {formatBytes(file.size)}
                          {isNew ? " · yeni" : " · şifreli"}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-quiet btn-danger btn-icon"
                        onClick={() => removeFile(index)}
                        disabled={busy}
                        aria-label={`${file.name} dosyasını kaldır`}
                      >
                        <FiTrash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {entryId && !editingDiary && (
            <section className="margin-block">
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={discardDraft}
                disabled={busy}
              >
                <FiTrash2 size={15} aria-hidden="true" />
                Taslağı sil
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
