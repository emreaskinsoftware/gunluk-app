import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  FiSave,
  FiPaperclip,
  FiTrash2,
  FiFileText,
  FiAlertCircle,
} from "react-icons/fi";

import TopBar from "../components/TopBar";
import StarRating from "../components/StarRating";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { DRAFTS, createDiary, deleteEntry, saveDraft } from "../services/diaries";
import { fileNameFromUrl, uploadFiles } from "../services/storage";
import { toFriendlyMessage } from "../utils/errors";
import { htmlToPlainText } from "../utils/sanitize";
import { formatBytes } from "../utils/format";
import {
  ATTACHMENTS_ENABLED,
  MAX_CONTENT_CHARS,
  MAX_FILES,
  MAX_FILE_MB,
  validateFileBatch,
} from "../utils/validation";
import "../styles/DiaryEntry.css";

/** Quill araç çubuğu — güvenli, sanitize edilebilir biçimlerle sınırlı. */
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block", "link"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};

const QUILL_FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "blockquote", "code-block", "link",
];

export default function DiaryEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { userId } = useAuth();

  const draft = location.state?.draft || null;

  const [content, setContent] = useState(draft?.content || "");
  const [files, setFiles] = useState(draft?.files || []);
  const [rating, setRating] = useState(draft?.rating || 0);
  const [draftId, setDraftId] = useState(draft?.id || null);

  const [saving, setSaving] = useState(null); // "diary" | "draft" | null
  const [progress, setProgress] = useState(0);
  const [dirty, setDirty] = useState(false);

  const fileInputRef = useRef(null);

  const plainText = useMemo(() => htmlToPlainText(content), [content]);
  const charCount = plainText.length;
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const isEmpty = charCount === 0;
  const tooLong = content.length > MAX_CONTENT_CHARS;

  /* Kaydedilmemiş değişiklik varken sekmeyi kapatmaya çalışan kullanıcıyı uyar */
  useEffect(() => {
    if (!dirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleContentChange = useCallback((value) => {
    setContent(value);
    setDirty(true);
  }, []);

  /* ------------------------------------------------------------------
     Dosya seçimi — boyut, tür ve adet doğrulaması
     ------------------------------------------------------------------ */
  const handleFileSelect = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = ""; // aynı dosyayı tekrar seçebilmek için sıfırla

    if (picked.length === 0) return;

    const { accepted, errors } = validateFileBatch(picked, files.length);
    errors.forEach((message) => toast.error(message));

    if (accepted.length > 0) {
      setFiles((current) => [...current, ...accepted]);
      setDirty(true);
      toast.success(
        `${accepted.length} dosya eklendi. Kaydettiğinizde yüklenecek.`
      );
    }
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
    setDirty(true);
  };

  /* ------------------------------------------------------------------
     Kaydetme
     ------------------------------------------------------------------ */
  const persist = async (asDraft) => {
    if (saving) return;

    if (isEmpty) {
      toast.error("Günlük metni boş olamaz.");
      return;
    }

    if (tooLong) {
      toast.error("Günlük çok uzun. Lütfen kısaltın.");
      return;
    }

    if (!asDraft && rating === 0) {
      toast.error("Kaydetmeden önce günü yıldızla puanlayın.");
      return;
    }

    setSaving(asDraft ? "draft" : "diary");
    setProgress(0);

    try {
      const fileUrls = await uploadFiles(
        userId,
        asDraft ? "drafts" : "diaries",
        files,
        setProgress
      );

      if (asDraft) {
        const id = await saveDraft({
          userId,
          content,
          rating,
          files: fileUrls,
          draftId,
        });
        setDraftId(id);
        setFiles(fileUrls);
        setDirty(false);
        toast.success("Taslak kaydedildi. 24 saat içinde tamamlamayı unutma.");
        return;
      }

      await createDiary({ userId, content, rating, files: fileUrls });

      // Taslaktan geliyorsak taslağı temizle.
      // (Eski sürümde taslak duruyor ve aynı gün iki kez listeleniyordu.)
      if (draftId) {
        await deleteEntry(DRAFTS, { id: draftId, files: [] }).catch(() => {});
        setDraftId(null);
      }

      setDirty(false);
      toast.success("Günlüğün kaydedildi.");
      navigate("/home", { replace: true });
    } catch (error) {
      toast.error(toFriendlyMessage(error, error?.message || "Kaydedilemedi."));
    } finally {
      setSaving(null);
      setProgress(0);
    }
  };

  const busy = Boolean(saving);

  return (
    <div className="shell page-enter">
      <TopBar
        title={draftId ? "Taslağı düzenle" : "Yeni günlük"}
        subtitle={new Date().toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        backTo="/home"
        showLogout={false}
      >
        <button
          type="button"
          className="btn"
          onClick={() => persist(true)}
          disabled={busy || isEmpty}
          title="Taslak olarak kaydet"
        >
          {saving === "draft" ? (
            <span className="spinner" style={{ width: 16, height: 16 }} />
          ) : (
            <FiFileText size={17} aria-hidden="true" />
          )}
          <span className="btn-label">Taslak</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => persist(false)}
          disabled={busy || isEmpty}
          title="Günlüğü kaydet"
        >
          {saving === "diary" ? (
            <span className="spinner" style={{ width: 16, height: 16 }} />
          ) : (
            <FiSave size={17} aria-hidden="true" />
          )}
          <span className="btn-label">Kaydet</span>
        </button>
      </TopBar>

      {busy && progress > 0 && progress < 100 && (
        <div className="upload-bar" role="progressbar" aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
          <em>Dosyalar yükleniyor… %{progress}</em>
        </div>
      )}

      <div className="editor-layout">
        {/* --- Yazma alanı --- */}
        <section className="editor-panel card">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={QUILL_MODULES}
            formats={QUILL_FORMATS}
            placeholder="Bugün nasıl geçti? Aklından geçenleri yaz…"
            readOnly={busy}
          />

          <footer className="editor-status">
            <span>
              {wordCount} kelime · {charCount} karakter
            </span>
            {tooLong && (
              <span className="field-error">
                <FiAlertCircle size={14} aria-hidden="true" />
                Sınır aşıldı
              </span>
            )}
            {dirty && !busy && <span className="dot-pulse">Kaydedilmedi</span>}
          </footer>
        </section>

        {/* --- Yan panel --- */}
        <aside className="editor-side">
          <div className="card side-block">
            <h2 className="section-title">Bugünü puanla</h2>
            <div className="rating-box">
              <StarRating
                value={rating}
                onChange={(value) => {
                  setRating(value);
                  setDirty(true);
                }}
                size={30}
              />
              <span className="rating-hint">
                {rating > 0 ? `${rating} / 5` : "Kaydetmek için gerekli"}
              </span>
            </div>
          </div>

          <div className="card side-block">
            <h2 className="section-title">
              Ekli dosyalar
              <span className="count">
                {files.length}/{MAX_FILES}
              </span>
            </h2>

            {!ATTACHMENTS_ENABLED ? (
              <p className="side-note">
                Dosya ekleme kapalı. Açmak için <code>.env</code> dosyasında{" "}
                <code>REACT_APP_ENABLE_ATTACHMENTS=true</code> yapın.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-block dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy || files.length >= MAX_FILES}
                >
                  <FiPaperclip size={18} aria-hidden="true" />
                  Dosya ekle
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  accept="image/*,audio/*,application/pdf,text/plain"
                  onChange={handleFileSelect}
                  disabled={busy}
                />

                <p className="side-note">
                  Resim, ses, PDF veya TXT · dosya başına en fazla {MAX_FILE_MB} MB
                </p>

                {files.length > 0 && (
                  <ul className="file-list">
                    {files.map((file, index) => {
                      const uploaded = typeof file === "string";
                      const name = uploaded ? fileNameFromUrl(file) : file.name;

                      return (
                        <li
                          className="file-item stagger"
                          key={`${name}-${index}`}
                          style={{ "--i": index }}
                        >
                          <span className="file-info">
                            <strong title={name}>{name}</strong>
                            <em>
                              {uploaded ? "Yüklendi" : formatBytes(file.size)}
                            </em>
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon danger-ghost"
                            onClick={() => removeFile(index)}
                            disabled={busy}
                            aria-label={`${name} dosyasını kaldır`}
                          >
                            <FiTrash2 size={15} aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
