import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useLocation } from "react-router-dom";
import { FaSave, FaDraftingCompass, FaFileUpload } from "react-icons/fa";
import ReactStars from "react-rating-stars-component";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, Timestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../styles/DiaryEntry.css";
import { format } from "date-fns"; // Tarih biçimlendirme kütüphanesi

const DiaryEntry = () => {
  const location = useLocation();
  const draft = location.state?.draft || null;

  const [content, setContent] = useState(draft?.content || "");
  const [files, setFiles] = useState(draft?.files || []);
  const [rating, setRating] = useState(draft?.rating || 0);
  const [draftId, setDraftId] = useState(draft?.id || null);

  // Yıldız puanı değişikliği
  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  // Dosya yükleme
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...uploadedFiles]);
  };

  // Günlük metni değişikliği
  const handleContentChange = (value) => {
    setContent(value);
  };

  // Günlük kaydetme (yeni günlük)
  const saveDiary = async (isDraft = false) => {
    if (!content.trim()) {
      alert("Günlük metni boş olamaz!");
      return;
    }

    if (rating === 0) {
      alert("Lütfen günü oylayın.");
      return;
    }

    try {
      const currentDate = format(new Date(), "yyyy-MM-dd_HH-mm-ss");

      const fileUrls = await Promise.all(
        files.map(async (file, index) => {
          if (typeof file === "string") return file; // Önceden yüklenen dosyaları atla
          const uniqueFileName = `${currentDate}_${index}_${file.name}`;
          const storageRef = ref(storage, `uploads/${uniqueFileName}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );

      const diaryEntry = {
        userId: auth.currentUser.uid,
        content,
        rating,
        files: fileUrls,
        isDraft,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "diaries"), diaryEntry);
      alert("Günlük başarıyla kaydedildi!");

      // Formu sıfırla
      setContent("");
      setFiles([]);
      setRating(0);
      setDraftId(null);
    } catch (error) {
      console.error("Günlük kaydedilirken hata oluştu:", error);
      alert("Günlük kaydedilirken hata oluştu.");
    }
  };

  // Taslak güncelleme veya kaydetme
  const saveDraft = async () => {
    try {
      const currentDate = format(new Date(), "yyyy-MM-dd_HH-mm-ss");

      const fileUrls = await Promise.all(
        files.map(async (file, index) => {
          if (typeof file === "string") return file; // Önceden yüklenen dosyaları atla
          const uniqueFileName = `${currentDate}_${index}_${file.name}`;
          const storageRef = ref(storage, `drafts/${uniqueFileName}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );

      const draftEntry = {
        userId: auth.currentUser.uid,
        content,
        rating: rating || 0,
        files: fileUrls,
        isDraft: true,
        createdAt: Timestamp.now(),
      };

      if (draftId) {
        await updateDoc(doc(db, "drafts", draftId), draftEntry);
        alert("Taslak başarıyla güncellendi!");
      } else {
        const newDraft = await addDoc(collection(db, "drafts"), draftEntry);
        setDraftId(newDraft.id);
        alert("Taslak başarıyla kaydedildi!");
      }
    } catch (error) {
      console.error("Taslak kaydedilirken hata oluştu:", error);
      alert("Taslak kaydedilirken hata oluştu.");
    }
  };

  // ReactQuill araç çubuğu ayarları
  const modules = {
    toolbar: [
      [{ font: [] }, { size: [] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["blockquote", "code-block"],
      ["clean"],
    ],
  };

  return (
    <div className="diary-container">
      {/* Sağ Üst Köşe Butonları */}
      <div className="custom-buttons">
        <button className="custom-btn" onClick={() => saveDiary(false)} title="Günlüğü Kaydet">
          <FaSave /> Kaydet
        </button>
        <button className="custom-btn" onClick={saveDraft} title="Taslak Kaydet">
          <FaDraftingCompass /> Taslak
        </button>
        <button
          className="custom-btn"
          onClick={() => document.getElementById("file-upload").click()}
          title="Dosya Yükle"
        >
          <FaFileUpload /> Dosya
        </button>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />
      </div>

      {/* Günlük Editör */}
      <div className="diary-editor">
        <ReactQuill
          value={content}
          onChange={handleContentChange}
          modules={modules}
          placeholder="Günlüğünüzü yazmaya başlayın..."
          className="quill-editor diary-page"
        />
      </div>

      {/* Eklenen Dosyalar */}
      <div className="files-container">
        <h4>Eklenen Dosyalar:</h4>
        {files.length > 0 ? (
          files.map((file, index) => (
            <div className="file-item" key={index}>
              {typeof file === "string" ? (
                <a
                  href={file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-link"
                >
                  {decodeURIComponent(file.split("/").pop().split("?")[0])}
                </a>
              ) : (
                <span className="file-name">{file.name}</span>
              )}
              <button
                onClick={() =>
                  setFiles((prev) => prev.filter((_, i) => i !== index))
                }
              >
                Sil
              </button>
            </div>
          ))
        ) : (
          <p>Henüz dosya eklenmedi.</p>
        )}
      </div>

      <div className="rating-container">
        <div className="rating-title">Bugünü Oyla</div>
        <ReactStars
          count={5}
          value={rating}
          onChange={handleRatingChange}
          size={40}
          isHalf={true}
          activeColor="#ffd700"
        />
      </div>
    </div>
  );
};

export default DiaryEntry;
