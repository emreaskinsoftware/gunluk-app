import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import {
  FiPlus,
  FiFileText,
  FiSearch,
  FiEye,
  FiDownload,
  FiTrash2,
  FiX,
  FiMail,
  FiPaperclip,
} from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { sendEmailVerification } from "firebase/auth";

import TopBar from "../components/TopBar";
import StarRating from "../components/StarRating";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { auth } from "../firebase";
import { DIARIES, deleteEntry, fetchDiaries } from "../services/diaries";
import { fileNameFromUrl } from "../services/storage";
import { toFriendlyMessage } from "../utils/errors";
import { htmlToPlainText, safeFileName } from "../utils/sanitize";
import {
  dayKey,
  formatLongDate,
  formatRelative,
  truncate,
} from "../utils/format";
import "../styles/Home.css";

const SORT_OPTIONS = [
  { value: "newest", label: "Önce yeniler" },
  { value: "oldest", label: "Önce eskiler" },
  { value: "highest", label: "Yüksek puan" },
  { value: "lowest", label: "Düşük puan" },
];

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, userId } = useAuth();

  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [selectedDay, setSelectedDay] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  /* ------------------------------------------------------------------
     Veri yükleme
     Tek sorgu (userId + createdAt desc). Sıralama ve filtreleme bellekte
     yapılır: ek Firestore okuması olmaz, ücretsiz kota korunur.
     ------------------------------------------------------------------ */
  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      setDiaries(await fetchDiaries(userId));
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Günlükler yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------------------------------------------
     Türetilmiş veriler
     ------------------------------------------------------------------ */

  /** Takvimde işaretlenecek günler: "2025-03-12" -> { count, rating } */
  const dayIndex = useMemo(() => {
    const index = new Map();

    for (const diary of diaries) {
      const key = dayKey(diary.createdAt);
      if (!key) continue;

      const current = index.get(key) || { count: 0, rating: 0 };
      index.set(key, {
        count: current.count + 1,
        rating: Math.max(current.rating, diary.rating || 0),
      });
    }

    return index;
  }, [diaries]);

  const stats = useMemo(() => {
    const rated = diaries.filter((d) => (d.rating || 0) > 0);
    const average = rated.length
      ? rated.reduce((sum, d) => sum + d.rating, 0) / rated.length
      : 0;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthCount = diaries.filter((d) =>
      (dayKey(d.createdAt) || "").startsWith(thisMonth)
    ).length;

    return {
      total: diaries.length,
      average: average.toFixed(1).replace(".", ","),
      monthCount,
      dayCount: dayIndex.size,
    };
  }, [diaries, dayIndex]);

  const visibleDiaries = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    const selectedKey = selectedDay ? dayKey(selectedDay) : null;

    const filtered = diaries.filter((diary) => {
      if (selectedKey && dayKey(diary.createdAt) !== selectedKey) return false;
      if (!term) return true;

      // Eski sürümde arama yalnızca tarih başlığında çalışıyordu.
      // Artık günlük metninde de arıyoruz.
      const haystack = [
        formatLongDate(diary.createdAt),
        diary.plainText || htmlToPlainText(diary.content),
      ]
        .join(" ")
        .toLocaleLowerCase("tr");

      return haystack.includes(term);
    });

    const sorted = [...filtered];
    switch (sortOption) {
      case "oldest":
        sorted.reverse();
        break;
      case "highest":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "lowest":
        sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      default:
        break; // "newest" — sorgu zaten bu sırada geliyor
    }

    return sorted;
  }, [diaries, search, selectedDay, sortOption]);

  /* ------------------------------------------------------------------
     İşlemler
     ------------------------------------------------------------------ */

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await deleteEntry(DIARIES, pendingDelete);
      setDiaries((current) => current.filter((d) => d.id !== pendingDelete.id));
      toast.success("Günlük silindi.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Günlük silinemedi."));
    } finally {
      setDeleting(false);
    }
  };

  /** Günlüğü .txt olarak indirir. Ekli dosyalar ayrı bağlantılarla açılır. */
  const downloadDiary = (diary) => {
    const title = formatLongDate(diary.createdAt);
    const stars = "*".repeat(diary.rating || 0);
    const body = diary.plainText || htmlToPlainText(diary.content);

    const attachments = (diary.files || [])
      .map((url, index) => `${index + 1}. ${fileNameFromUrl(url)}\n   ${url}`)
      .join("\n");

    const content =
      `${title}\n${"=".repeat(title.length)}\n\n` +
      `Puan: ${stars || "-"} (${diary.rating || 0}/5)\n\n` +
      `${body}\n` +
      (attachments ? `\n\nEkli dosyalar:\n${attachments}\n` : "");

    const blob = new Blob([`﻿${content}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(title)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Eski kodda oluşturulan blob URL'leri hiç serbest bırakılmıyordu (bellek sızıntısı)
    URL.revokeObjectURL(url);

    toast.success("Günlük indirildi.");
  };

  const resendVerification = async () => {
    try {
      await sendEmailVerification(auth.currentUser);
      setVerificationSent(true);
      toast.success("Doğrulama e-postası tekrar gönderildi.");
    } catch (error) {
      toast.error(toFriendlyMessage(error, "E-posta gönderilemedi."));
    }
  };

  /* ------------------------------------------------------------------
     Görünüm
     ------------------------------------------------------------------ */
  return (
    <div className="shell page-enter">
      <TopBar
        title="Günlüğüm"
        subtitle={user?.email || undefined}
        backTo={undefined}
      >
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate("/drafts")}
          title="Taslaklar"
        >
          <FiFileText size={18} aria-hidden="true" />
          <span className="btn-label">Taslaklar</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/diary")}
        >
          <FiPlus size={18} aria-hidden="true" />
          <span className="btn-label">Yeni günlük</span>
        </button>
      </TopBar>

      {user && !user.emailVerified && (
        <div className="notice" role="status">
          <FiMail size={18} aria-hidden="true" />
          <span>
            E-posta adresin doğrulanmamış. Hesabını korumak için gelen kutunu
            kontrol et.
          </span>
          {!verificationSent && (
            <button type="button" className="btn btn-ghost" onClick={resendVerification}>
              Tekrar gönder
            </button>
          )}
        </div>
      )}

      {/* --- Özet kartları --- */}
      <section className="stats" aria-label="Özet">
        {[
          { label: "Toplam günlük", value: stats.total, icon: "📚" },
          { label: "Bu ay", value: stats.monthCount, icon: "🗓️" },
          { label: "Yazılan gün", value: stats.dayCount, icon: "✍️" },
          { label: "Ortalama puan", value: stats.average, icon: "⭐" },
        ].map((item, index) => (
          <div className="stat-card stagger" key={item.label} style={{ "--i": index }}>
            <span className="stat-icon" aria-hidden="true">
              {item.icon}
            </span>
            <div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* --- Arama ve sıralama --- */}
      <section className="controls" aria-label="Filtreler">
        <div className="field-row search-row">
          <FiSearch className="field-icon" size={18} aria-hidden="true" />
          <input
            className="input input-with-icon"
            type="search"
            placeholder="Günlüklerinde ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Günlüklerde ara"
          />
          {search && (
            <button
              type="button"
              className="password-toggle"
              onClick={() => setSearch("")}
              aria-label="Aramayı temizle"
            >
              <FiX size={18} />
            </button>
          )}
        </div>

        <select
          className="select"
          value={sortOption}
          onChange={(event) => setSortOption(event.target.value)}
          aria-label="Sıralama"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <div className="layout">
        {/* --- Takvim --- */}
        <aside className="calendar-panel card">
          <h2 className="section-title">Takvim</h2>

          <Calendar
            locale="tr-TR"
            value={selectedDay}
            onClickDay={(date) => {
              // Aynı güne tekrar tıklamak filtreyi kaldırır
              setSelectedDay((current) =>
                current && dayKey(current) === dayKey(date) ? null : date
              );
            }}
            tileContent={({ date, view }) => {
              if (view !== "month") return null;
              const entry = dayIndex.get(dayKey(date));
              if (!entry) return null;
              return (
                <span
                  className={`cal-dot${entry.rating >= 4 ? " cal-dot-strong" : ""}`}
                  aria-hidden="true"
                />
              );
            }}
            tileClassName={({ date, view }) =>
              view === "month" && dayIndex.has(dayKey(date)) ? "has-entry" : null
            }
          />

          {selectedDay && (
            <button
              type="button"
              className="btn btn-ghost btn-block filter-clear"
              onClick={() => setSelectedDay(null)}
            >
              <FiX size={16} aria-hidden="true" />
              {formatLongDate(selectedDay)} filtresini kaldır
            </button>
          )}
        </aside>

        {/* --- Günlük listesi --- */}
        <section className="diary-panel">
          <h2 className="section-title">
            Günlükler
            <span className="count">
              {loading ? "" : `${visibleDiaries.length} kayıt`}
            </span>
          </h2>

          {loading && (
            <div className="diary-list">
              {[0, 1, 2].map((index) => (
                <div className="diary-card skeleton-card" key={index}>
                  <div className="skeleton" style={{ height: 18, width: "45%" }} />
                  <div className="skeleton" style={{ height: 12, width: "90%" }} />
                  <div className="skeleton" style={{ height: 12, width: "70%" }} />
                  <div className="skeleton" style={{ height: 38, width: "100%" }} />
                </div>
              ))}
            </div>
          )}

          {!loading && visibleDiaries.length === 0 && (
            <div className="card empty-state">
              <span className="empty-icon" aria-hidden="true">
                {diaries.length === 0 ? "🌱" : "🔍"}
              </span>
              <h3>
                {diaries.length === 0
                  ? "Henüz hiç günlük yok"
                  : "Sonuç bulunamadı"}
              </h3>
              <p>
                {diaries.length === 0
                  ? "İlk günlüğünü yazarak başla. Bugünün nasıl geçtiğini anlat, yıldızla puanla."
                  : "Arama teriminizi değiştirin veya takvim filtresini kaldırın."}
              </p>
              {diaries.length === 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate("/diary")}
                >
                  <FiPlus size={18} aria-hidden="true" />
                  İlk günlüğünü yaz
                </button>
              )}
            </div>
          )}

          {!loading && visibleDiaries.length > 0 && (
            <div className="diary-list">
              {visibleDiaries.map((diary, index) => {
                const preview = truncate(
                  diary.plainText || htmlToPlainText(diary.content),
                  190
                );

                return (
                  <article
                    className="diary-card stagger"
                    key={diary.id}
                    style={{ "--i": Math.min(index, 12) }}
                  >
                    <header className="diary-card-head">
                      <div>
                        <h3>{formatLongDate(diary.createdAt)}</h3>
                        <span className="diary-meta">
                          {formatRelative(diary.createdAt)}
                          {diary.files?.length > 0 && (
                            <>
                              {" · "}
                              <FiPaperclip size={12} aria-hidden="true" />
                              {diary.files.length} dosya
                            </>
                          )}
                        </span>
                      </div>

                      {diary.rating > 0 && (
                        <span className="badge badge-amber" title={`${diary.rating}/5`}>
                          <FaStar size={11} aria-hidden="true" />
                          {diary.rating}
                        </span>
                      )}
                    </header>

                    {preview && <p className="diary-preview">{preview}</p>}

                    <StarRating value={diary.rating || 0} size={15} readOnly />

                    <footer className="diary-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => navigate(`/diary-view/${diary.id}`)}
                      >
                        <FiEye size={16} aria-hidden="true" />
                        Oku
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => downloadDiary(diary)}
                      >
                        <FiDownload size={16} aria-hidden="true" />
                        İndir
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost danger-ghost"
                        onClick={() => setPendingDelete(diary)}
                        aria-label="Günlüğü sil"
                      >
                        <FiTrash2 size={16} aria-hidden="true" />
                        Sil
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Mobilde hızlı erişim düğmesi */}
      <button
        type="button"
        className="fab"
        onClick={() => navigate("/diary")}
        aria-label="Yeni günlük yaz"
        title="Yeni günlük yaz"
      >
        <FiPlus size={24} aria-hidden="true" />
      </button>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Günlük silinsin mi?"
        description={
          pendingDelete
            ? `"${formatLongDate(pendingDelete.createdAt)}" tarihli günlük ve ekli dosyaları kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : undefined
        }
        confirmLabel="Evet, sil"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </div>
  );
}
