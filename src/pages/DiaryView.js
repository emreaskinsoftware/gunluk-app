import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiDownload, FiPaperclip, FiExternalLink } from "react-icons/fi";

import TopBar from "../components/TopBar";
import StarRating from "../components/StarRating";
import PageLoader from "../components/PageLoader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { DIARIES, fetchEntry } from "../services/diaries";
import { fileNameFromUrl } from "../services/storage";
import { toFriendlyMessage } from "../utils/errors";
import { htmlToPlainText, sanitizeHtml, safeFileName } from "../utils/sanitize";
import { formatLongDate, formatRelative } from "../utils/format";
import "../styles/DiaryView.css";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;

export default function DiaryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { userId } = useAuth();

  const [diary, setDiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* ------------------------------------------------------------------
     Kaydı adresteki kimlikten çek.

     Eski sürüm veriyi router state'inden okuyordu; sayfa yenilendiğinde
     veya bağlantı paylaşıldığında state kaybolduğu için ekranda
     "Günlük bulunamadı" yazıyordu. Artık :id parametresi gerçekten kullanılıyor.
     ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id || !userId) return;

      setLoading(true);
      try {
        const entry = await fetchEntry(DIARIES, id, userId);
        if (cancelled) return;

        if (!entry) setNotFound(true);
        else setDiary(entry);
      } catch (error) {
        if (cancelled) return;
        toast.error(toFriendlyMessage(error, "Günlük açılamadı."));
        setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, userId, toast]);

  /**
   * İçerik ekrana basılmadan önce TEKRAR temizlenir.
   * Kaydetme sırasında da temizleniyor; bu ikinci geçiş, eski kayıtlardaki
   * (henüz temizlenmemiş) zararlı HTML'i de etkisiz hale getirir.
   */
  const safeContent = useMemo(
    () => sanitizeHtml(diary?.content || ""),
    [diary?.content]
  );

  const download = () => {
    if (!diary) return;

    const title = formatLongDate(diary.createdAt);
    const body = diary.plainText || htmlToPlainText(diary.content);
    const text =
      `${title}\n${"=".repeat(title.length)}\n\n` +
      `Puan: ${diary.rating || 0}/5\n\n${body}\n`;

    const blob = new Blob([`﻿${text}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(title)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <PageLoader label="Günlük açılıyor…" />;

  if (notFound || !diary) {
    return (
      <div className="shell page-enter">
        <TopBar title="Günlük" backTo="/home" showLogout={false} />
        <div className="card empty-state">
          <span className="empty-icon" aria-hidden="true">
            🔎
          </span>
          <h3>Günlük bulunamadı</h3>
          <p>
            Bu günlük silinmiş olabilir ya da size ait değil. Yalnızca kendi
            günlüklerinizi görüntüleyebilirsiniz.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/home")}
          >
            Ana sayfaya dön
          </button>
        </div>
      </div>
    );
  }

  const files = diary.files || [];

  return (
    <div className="shell page-enter">
      <TopBar
        title="Günlük"
        subtitle={formatRelative(diary.createdAt)}
        backTo="/home"
        showLogout={false}
      >
        <button type="button" className="btn" onClick={download}>
          <FiDownload size={17} aria-hidden="true" />
          <span className="btn-label">İndir</span>
        </button>
      </TopBar>

      <article className="reader card">
        <header className="reader-head">
          <h2>{formatLongDate(diary.createdAt)}</h2>
          <div className="reader-rating">
            <StarRating value={diary.rating || 0} size={20} readOnly />
            {diary.rating > 0 && <span>{diary.rating} / 5</span>}
          </div>
        </header>

        {/* Temizlenmiş HTML — bkz. utils/sanitize.js */}
        <div
          className="reader-body"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />

        {files.length > 0 && (
          <section className="reader-files">
            <h3 className="section-title">
              <FiPaperclip size={17} aria-hidden="true" />
              Ekli dosyalar
              <span className="count">{files.length}</span>
            </h3>

            <div className="attachment-grid">
              {files.map((url, index) => {
                const name = fileNameFromUrl(url);
                const isImage = IMAGE_EXT.test(name);

                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="attachment stagger"
                    style={{ "--i": index }}
                    title={name}
                  >
                    {isImage ? (
                      <img src={url} alt={name} loading="lazy" />
                    ) : (
                      <span className="attachment-icon" aria-hidden="true">
                        📎
                      </span>
                    )}
                    <span className="attachment-name">
                      {name}
                      <FiExternalLink size={13} aria-hidden="true" />
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
