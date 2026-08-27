import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiDownload, FiEdit3, FiPaperclip } from "react-icons/fi";

import Masthead from "../components/Masthead";
import StarRating from "../components/StarRating";
import PageLoader from "../components/PageLoader";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { getEntry, readAttachment } from "../services/vault";
import { toFriendlyMessage } from "../utils/errors";
import { sanitizeHtml, safeFileName } from "../utils/sanitize";
import { formatBytes, formatLongDate, formatRelative, weekday } from "../utils/format";
import "../styles/Read.css";

const IS_IMAGE = /^image\//;

export default function Read() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { key } = useVault();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [previews, setPreviews] = useState({});

  // Oluşturulan blob adreslerini takip et; bileşen kapanınca serbest bırak
  const blobUrls = useRef([]);

  /* ---- Kaydı adresteki kimlikten çek ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id || !key) return;

      setLoading(true);
      try {
        const found = await getEntry(key, id);
        if (cancelled) return;

        if (!found) setMissing(true);
        else setEntry(found);
      } catch (error) {
        if (cancelled) return;
        toast.error(toFriendlyMessage(error, "Günlük açılamadı."));
        setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, key, toast]);

  /* ---- Resim ekleri için önizleme üret ---- */
  useEffect(() => {
    let cancelled = false;
    const images = (entry?.files || []).filter((file) => IS_IMAGE.test(file.type || ""));
    if (images.length === 0) return undefined;

    (async () => {
      for (const file of images) {
        try {
          const blob = await readAttachment(key, file.id, file.type);
          if (!blob || cancelled) return;

          const url = URL.createObjectURL(blob);
          blobUrls.current.push(url);
          setPreviews((current) => ({ ...current, [file.id]: url }));
        } catch {
          // Bozuk ek listeyi durdurmasın
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry, key]);

  /* ---- Bileşen kapanınca blob adreslerini serbest bırak ---- */
  useEffect(
    () => () => {
      blobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrls.current = [];
    },
    []
  );

  /**
   * İçerik ekrana basılmadan önce TEKRAR temizlenir.
   * Kaydederken de temizleniyor; bu ikinci geçiş, elle düzenlenmiş bir
   * yedekten gelen zararlı HTML'i de etkisiz kılar.
   */
  const safeContent = useMemo(() => sanitizeHtml(entry?.content || ""), [entry?.content]);

  /** Şifreli eki çözüp indirir. */
  const downloadAttachment = async (file) => {
    try {
      const blob = await readAttachment(key, file.id, file.type);
      if (!blob) {
        toast.error("Dosya bulunamadı.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeFileName(file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Dosya indirilemedi."));
    }
  };

  const downloadText = () => {
    const title = formatLongDate(entry.createdAt);
    const text =
      `${title}\n${"—".repeat(title.length)}\n\n` +
      `Puan: ${entry.rating || 0}/5\n\n${entry.plainText}\n`;

    const url = URL.createObjectURL(
      new Blob([`﻿${text}`], { type: "text/plain;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(title)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageLoader label="Çözülüyor" />;

  if (missing || !entry) {
    return (
      <div className="sheet sheet-narrow page">
        <Masthead title="Günlük" backTo="/" showLock={false} showSettings={false} />
        <div className="empty">
          <span className="label">Bulunamadı</span>
          <h3>Bu günlük yok</h3>
          <p>Silinmiş olabilir ya da adres yanlış olabilir.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/")}>
            Listeye dön
          </button>
        </div>
      </div>
    );
  }

  const files = entry.files || [];

  return (
    <div className="sheet sheet-narrow page">
      <Masthead
        title="Günlük"
        eyebrow={formatRelative(entry.createdAt)}
        backTo="/"
        showLock={false}
        showSettings={false}
      >
        <button type="button" className="btn btn-quiet" onClick={downloadText}>
          <FiDownload size={15} aria-hidden="true" />
          <span className="btn-text">İndir</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate("/yaz", { state: { draft: entry } })}
        >
          <FiEdit3 size={15} aria-hidden="true" />
          <span className="btn-text">Düzenle</span>
        </button>
      </Masthead>

      <article className="article">
        <header className="article-head">
          <span className="label">{weekday(entry.createdAt)}</span>
          <h2>{formatLongDate(entry.createdAt)}</h2>
          <div className="article-rating">
            <StarRating value={entry.rating} size={16} readOnly />
            {entry.rating > 0 && <span className="meta">{entry.rating} / 5</span>}
          </div>
        </header>

        {/* Temizlenmiş HTML — bkz. utils/sanitize.js */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: safeContent }} />

        {files.length > 0 && (
          <section className="article-files">
            <h3 className="section-head">
              <span className="label">
                <FiPaperclip size={12} aria-hidden="true" /> Ekler
              </span>
              <span className="count">{files.length}</span>
            </h3>

            <ul className="file-grid">
              {files.map((file, index) => (
                <li className="file-card stagger" key={file.id} style={{ "--i": index }}>
                  {previews[file.id] ? (
                    <img src={previews[file.id]} alt={file.name} loading="lazy" />
                  ) : (
                    <span className="file-placeholder meta">
                      {(file.name.split(".").pop() || "dosya").toUpperCase()}
                    </span>
                  )}

                  <div className="file-meta">
                    <strong title={file.name}>{file.name}</strong>
                    <span className="meta">{formatBytes(file.size)}</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => downloadAttachment(file)}
                  >
                    <FiDownload size={13} aria-hidden="true" />
                    İndir
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}
