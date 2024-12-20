// src/pages/DiaryView.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/DiaryView.css";
import { FaArrowLeft } from "react-icons/fa";

const DiaryView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { diary } = location.state || {};

  if (!diary) {
    return <p>Günlük bulunamadı.</p>;
  }

  return (
    <div className="diary-view-container">
      <header className="diary-view-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Geri
        </button>
        <h1>{diary.title}</h1>
      </header>

      <div className="diary-content">
        <p>
          <strong>Puan:</strong> {"⭐".repeat(diary.rating || 0)}
        </p>
        <h2>İçerik</h2>

        {/* Günlük içeriğini HTML olarak işlemek */}
        <div
          className="diary-text"
          dangerouslySetInnerHTML={{ __html: diary.content }}
        ></div>

        {diary.files && diary.files.length > 0 && (
          <>
            <h2>Ekli Dosyalar</h2>
            <ul className="file-list">
              {diary.files.map((fileUrl, index) => (
                <li key={index}>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={fileUrl.split("/").pop().split("?")[0]}
                  >
                    {decodeURIComponent(fileUrl.split("/").pop().split("?")[0])}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default DiaryView;
