import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import {
  FiPlus,
  FiSearch,
  FiX,
  FiFileText,
  FiPaperclip,
  FiDownload,
  FiTrash2,
} from "react-icons/fi";

import Masthead from "../components/Masthead";
import StarRating from "../components/StarRating";
import ConfirmDialog from "../components/ConfirmDialog";
import { useVault } from "../context/VaultContext";
import { useToast } from "../context/ToastContext";
import { KIND, deleteEntryById, listEntries, purgeExpiredDrafts } from "../services/vault";
import { toFriendlyMessage } from "../utils/errors";
import { safeFileName } from "../utils/sanitize";
import { dayKey, formatLongDate, formatShortDate, truncate, weekday } from "../utils/format";
import "../styles/Home.css";

const SORTS = [
  { value: "yeni", label: "Önce yeniler" },
  { value: "eski", label: "Önce eskiler" },
  { value: "yuksek", label: "Yüksek puan" },
  { value: "dusuk", label: "Düşük puan" },
];

export default function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const { key } = useVault();

  const [entries, setEntries] = useState([]);
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("yeni");
  const [selectedDay, setSelectedDay] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Yükleme ---- */
  const load = useCallback(async () => {
    if (!key) return;

    setLoading(true);
    try {
      // Süresi dolmuş taslakları her açılışta gerçekten sil
      const purged = await purgeExpiredDrafts();
      if (purged > 0) toast.info(`${purged} süresi dolmuş taslak silindi.`);

      const [diaries, drafts] = await Promise.all([
        listEntries(key, KIND.DIARY),
        listEntries(key, KIND.DRAFT),
      ]);

      setEntries(diaries);
      setDraftCount(drafts.length);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Günlükler açılamadı."));
    } finally {
      setLoading(false);
    }
  }, [key, toast]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- Türetilmiş veriler ---- */

  /** Takvimde işaretlenecek günler. */
  const days = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const day = dayKey(entry.createdAt);
      if (!day) continue;
      const current = map.get(day) || { count: 0, rating: 0 };
      map.set(day, {
        count: current.count + 1,
        rating: Math.max(current.rating, entry.rating || 0),
      });
    }
    return map;
  }, [entries]);

  const summary = useMemo(() => {
    const rated = entries.filter((entry) => entry.rating > 0);
    const average = rated.length
      ? rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length
      : 0;

    const month = new Date().toISOString().slice(0, 7);

    return {
      total: entries.length,
      thisMonth: entries.filter((entry) => (dayKey(entry.createdAt) || "").startsWith(month)).length,
      days: days.size,
      average: average ? average.toFixed(1).replace(".", ",") : "—",
    };
  }, [entries, days]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    const selected = selectedDay ? dayKey(selectedDay) : null;

    const filtered = entries.filter((entry) => {
      if (selected && dayKey(entry.createdAt) !== selected) return false;
      if (!term) return true;

      // Tarih başlığında da, günlük metninde de ara
      return `${formatLongDate(entry.createdAt)} ${entry.plainText}`
        .toLocaleLowerCase("tr")
        .includes(term);
    });

    const sorted = [...filtered];
    if (sort === "eski") sorted.reverse();
    else if (sort === "yuksek") sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === "dusuk") sorted.sort((a, b) => a.rating - b.rating);

    return sorted;
  }, [entries, search, selectedDay, sort]);

  /* ---- İşlemler ---- */

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await deleteEntryById(pendingDelete.id);
      setEntries((current) => current.filter((entry) => entry.id !== pendingDelete.id));
      toast.success("Günlük silindi.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(toFriendlyMessage(error, "Günlük silinemedi."));
    } finally {
      setDeleting(false);
    }
  };

  const download = (entry) => {
    const title = formatLongDate(entry.createdAt);
    const attachments = (entry.files || []).map((file, i) => `${i + 1}. ${file.name}`).join("\n");

    const text =
      `${title}\n${"—".repeat(title.length)}\n\n` +
      `Puan: ${entry.rating || 0}/5\n\n` +
      `${entry.plainText}\n` +
      (attachments ? `\n\nEkli dosyalar:\n${attachments}\n` : "");

    // Başa BOM: Windows Not Defteri Türkçe karakterleri doğru göstersin
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

  /* ---- Görünüm ---- */
  return (
    <div className="sheet page">
      <Masthead
        title="Günlük"
        eyebrow={formatShortDate(Date.now())}
      >
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => navigate("/taslaklar")}
        >
          <FiFileText size={16} aria-hidden="true" />
          <span className="btn-text">
            Taslaklar
            {draftCount > 0 && <span className="num"> ({draftCount})</span>}
          </span>
        </button>

        <button type="button" className="btn btn-primary" onClick={() => navigate("/yaz")}>
          <FiPlus size={16} aria-hidden="true" />
          <span className="btn-text">Yaz</span>
        </button>
      </Masthead>

      {/* Künye satırı — dergi kolofonu gibi */}
      <section className="colophon" aria-label="Özet">
        {[
          { label: "Toplam", value: summary.total },
          { label: "Bu ay", value: summary.thisMonth },
          { label: "Yazılan gün", value: summary.days },
          { label: "Ortalama", value: summary.average },
        ].map((item, index) => (
          <div className="colophon-cell stagger" key={item.label} style={{ "--i": index }}>
            <span className="num colophon-value">{item.value}</span>
            <span className="label">{item.label}</span>
          </div>
        ))}
      </section>

      <div className="reading-room">
        {/* --- Ana sütun --- */}
        <main className="column-main">
          <div className="filters">
            <div className="field-row filter-search">
              <FiSearch size={15} className="filter-icon" aria-hidden="true" />
              <input
                className="input filter-input"
                type="search"
                placeholder="Günlüklerde ara"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Günlüklerde ara"
              />
              {search && (
                <button
                  type="button"
                  className="field-action"
                  onClick={() => setSearch("")}
                  aria-label="Aramayı temizle"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            <select
              className="select filter-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Sıralama"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {selectedDay && (
            <button
              type="button"
              className="active-filter"
              onClick={() => setSelectedDay(null)}
            >
              <span className="label">Filtre</span>
              <span>{formatLongDate(selectedDay)}</span>
              <FiX size={14} aria-hidden="true" />
            </button>
          )}

          {loading && (
            <div className="entry-list">
              {[0, 1, 2].map((index) => (
                <article className="entry" key={index}>
                  <div className="skeleton" style={{ height: 11, width: "30%" }} />
                  <div className="skeleton" style={{ height: 20, width: "55%", marginTop: 10 }} />
                  <div className="skeleton" style={{ height: 12, width: "100%", marginTop: 12 }} />
                  <div className="skeleton" style={{ height: 12, width: "78%", marginTop: 6 }} />
                </article>
              ))}
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="empty">
              <span className="label">{entries.length === 0 ? "Boş defter" : "Sonuç yok"}</span>
              <h3>
                {entries.length === 0
                  ? "Henüz hiçbir şey yazmadın"
                  : "Bu arama hiçbir şey döndürmedi"}
              </h3>
              <p>
                {entries.length === 0
                  ? "İlk sayfayı aç. Bugünün nasıl geçtiğini yaz, beş yıldız üzerinden puanla."
                  : "Başka bir kelime dene ya da takvim filtresini kaldır."}
              </p>
              {entries.length === 0 && (
                <button type="button" className="btn btn-primary" onClick={() => navigate("/yaz")}>
                  <FiPlus size={16} aria-hidden="true" />
                  İlk günlüğünü yaz
                </button>
              )}
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div className="entry-list">
              {visible.map((entry, index) => (
                <article
                  className="entry stagger"
                  key={entry.id}
                  style={{ "--i": Math.min(index, 10) }}
                >
                  <div className="entry-head">
                    <span className="meta">
                      {formatShortDate(entry.createdAt)}
                      <span className="entry-sep">·</span>
                      {weekday(entry.createdAt)}
                    </span>
                    <StarRating value={entry.rating} size={14} readOnly />
                  </div>

                  <h3 className="entry-title">
                    <button type="button" onClick={() => navigate(`/gunluk/${entry.id}`)}>
                      {formatLongDate(entry.createdAt)}
                    </button>
                  </h3>

                  {entry.plainText && (
                    <p className="entry-excerpt">{truncate(entry.plainText, 220)}</p>
                  )}

                  <div className="entry-foot">
                    <div className="entry-actions">
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => navigate(`/gunluk/${entry.id}`)}
                      >
                        Oku
                      </button>
                      <span className="entry-sep">·</span>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        onClick={() => download(entry)}
                      >
                        <FiDownload size={13} aria-hidden="true" />
                        İndir
                      </button>
                      <span className="entry-sep">·</span>
                      <button
                        type="button"
                        className="btn btn-quiet btn-danger"
                        onClick={() => setPendingDelete(entry)}
                      >
                        <FiTrash2 size={13} aria-hidden="true" />
                        Sil
                      </button>
                    </div>

                    {entry.files?.length > 0 && (
                      <span className="tag">
                        <FiPaperclip size={11} aria-hidden="true" />
                        {entry.files.length}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {/* --- Yan sütun: takvim --- */}
        <aside className="column-side">
          <h2 className="section-head">
            <span className="label">Takvim</span>
          </h2>

          <Calendar
            locale="tr-TR"
            value={selectedDay}
            onClickDay={(date) =>
              setSelectedDay((current) =>
                current && dayKey(current) === dayKey(date) ? null : date
              )
            }
            tileContent={({ date, view }) =>
              view === "month" && days.has(dayKey(date)) ? (
                <span className="cal-mark" aria-hidden="true" />
              ) : null
            }
            tileClassName={({ date, view }) =>
              view === "month" && days.has(dayKey(date)) ? "written" : null
            }
          />

          <p className="side-note">
            İşaretli günlerde yazılmış bir günlük var. Bir güne tıklayarak
            listeyi o güne daraltabilirsin.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        eyebrow="Kalıcı silme"
        title="Bu günlük silinsin mi?"
        description={
          pendingDelete
            ? `${formatLongDate(pendingDelete.createdAt)} tarihli günlük ve ekli dosyaları kalıcı olarak silinecek. Geri alınamaz.`
            : undefined
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </div>
  );
}
