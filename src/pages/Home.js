import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../styles/Home.css";
import { FaEye, FaTrash, FaDownload } from "react-icons/fa";
import { stripHtml } from "string-strip-html";

const Home = () => {
  const [diaries, setDiaries] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [sortOption, setSortOption] = useState("newest");
  const [ratingMap, setRatingMap] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/");
      } else {
        fetchDiaries();
      }
    });
  }, [navigate, sortOption]);

  const fetchDiaries = async () => {
    if (!auth.currentUser) {
      console.error("Kullanıcı giriş yapmamış.");
      return;
    }

    try {
      const q = query(
        collection(db, "diaries"),
        where("userId", "==", auth.currentUser.uid),
        orderBy(
          sortOption === "highest" || sortOption === "lowest"
            ? "rating"
            : "createdAt",
          sortOption === "oldest" || sortOption === "lowest" ? "asc" : "desc"
        )
      );

      const querySnapshot = await getDocs(q);
      const diariesData = [];
      const ratings = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const formattedTitle = new Date(
          data.createdAt.seconds * 1000
        ).toLocaleDateString("tr-TR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        diariesData.push({
          id: doc.id,
          title: formattedTitle,
          ...data,
        });

        const dateKey = new Date(data.createdAt.seconds * 1000).toDateString();
        ratings[dateKey] = (ratings[dateKey] || 0) + (data.rating || 0);
      });

      setDiaries(diariesData);
      setRatingMap(ratings);
    } catch (error) {
      console.error("Firestore veri çekme hatası:", error);
    }
  };

  const handleSearch = (e) => setSearch(e.target.value);

  const filteredDiaries = diaries.filter((diary) =>
    (diary.title || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = () => {
    auth.signOut();
    navigate("/");
  };

  const handleViewDiary = (diary) => {
    navigate(`/diary-view/${diary.id}`, { state: { diary, readOnly: true } });
  };

  const handleDeleteDiary = async (diaryId) => {
    if (window.confirm("Bu günlük kalıcı olarak silinecek. Emin misiniz?")) {
      try {
        await deleteDoc(doc(db, "diaries", diaryId));
        setDiaries((prevDiaries) =>
          prevDiaries.filter((d) => d.id !== diaryId)
        );
        alert("Günlük başarıyla silindi!");
      } catch (error) {
        console.error("Günlük silinirken hata:", error);
        alert("Günlük silinirken hata oluştu.");
      }
    }
  };

  const handleDownloadDiary = async (diary) => {
    const cleanContent = stripHtml(diary.content).result;

    const fileContent = `Başlık: ${diary.title}\nTarih: ${diary.title}\nPuan: ${"⭐".repeat(
      diary.rating || 0
    )}\n\n${cleanContent}`;

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${diary.title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (diary.files?.length > 0) {
      diary.files.forEach(async (fileUrl) => {
        const fileName = decodeURIComponent(
          fileUrl.split("/").pop().split("?")[0]
        );
        const response = await fetch(fileUrl);
        const fileBlob = await response.blob();

        const fileLink = document.createElement("a");
        fileLink.href = URL.createObjectURL(fileBlob);
        fileLink.download = fileName;
        document.body.appendChild(fileLink);
        fileLink.click();
        document.body.removeChild(fileLink);
      });
    }
  };

  return (
    <div className="home-container">
      <header className="header-container">
        <h1>Günlüklerim</h1>
        <nav className="menu">
          <button onClick={() => navigate("/diary")} className="menu-button">
            📝 Günlük Yaz
          </button>
          <button onClick={() => navigate("/drafts")} className="menu-button">
            📂 Taslaklar
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Çıkış
          </button>
        </nav>
      </header>

      <div className="controls">
        <input
          type="text"
          placeholder="Günlük Ara..."
          value={search}
          onChange={handleSearch}
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="newest">Yeniye Göre</option>
          <option value="oldest">Eskiye Göre</option>
          <option value="highest">Yüksek Puan</option>
          <option value="lowest">Düşük Puan</option>
        </select>
      </div>

      <div className="calendar-and-list-container">
        <div className="react-calendar-container">
          <Calendar
            onClickDay={(value) => setSelectedDate(value)}
            value={selectedDate}
            tileContent={({ date }) => {
              const dateKey = date.toDateString();
              return ratingMap[dateKey] ? (
                <div className="calendar-rating">⭐ {ratingMap[dateKey]}</div>
              ) : null;
            }}
          />
        </div>

        <div className="diary-list">
          {filteredDiaries.length > 0 ? (
            filteredDiaries.map((diary) => (
              <div className="diary-row" key={diary.id}>
                <p>
                  <strong>Başlık:</strong> {diary.title}
                </p>
                <p>
                  <strong>Puan:</strong> {"⭐".repeat(diary.rating || 0)}
                </p>
                <div className="diary-actions">
                  <button
                    className="view-button"
                    onClick={() => handleViewDiary(diary)}
                  >
                    <FaEye /> Oku
                  </button>
                  <button
                    className="download-button"
                    onClick={() => handleDownloadDiary(diary)}
                  >
                    <FaDownload /> İndir
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteDiary(diary.id)}
                  >
                    <FaTrash /> Sil
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="no-diary-message">Henüz günlük eklenmedi.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
