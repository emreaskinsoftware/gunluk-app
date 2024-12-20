import React, { useState, useEffect } from "react";
import "../styles/Draft.css";
import { FaTrash, FaEye } from "react-icons/fa";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Draft = () => {
  const [drafts, setDrafts] = useState([]);
  const navigate = useNavigate();

  // Firestore'dan taslakları çek
  const fetchDrafts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "drafts"));
      const currentTimestamp = Date.now();
      const fetchedDrafts = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          (draft) =>
            draft.createdAt &&
            currentTimestamp - draft.createdAt.seconds * 1000 < 24 * 60 * 60 * 1000
        ); // Sadece 24 saat içinde oluşturulmuş taslaklar
      setDrafts(fetchedDrafts); // Verileri güncelle
    } catch (error) {
      console.error("Taslaklar çekilemedi:", error);
      alert("Taslaklar yüklenirken hata oluştu.");
    }
  };

  // Sayfa yüklendiğinde taslakları al
  useEffect(() => {
    fetchDrafts();
  }, []);

  // Bireysel taslak silme
  const handleDeleteDraft = async (id) => {
    try {
      await deleteDoc(doc(db, "drafts", id));
      setDrafts((prevDrafts) => prevDrafts.filter((draft) => draft.id !== id));
      alert("Taslak başarıyla silindi!");
    } catch (error) {
      console.error("Taslak silinirken hata oluştu:", error);
      alert("Taslak silinirken hata oluştu.");
    }
  };

  // Tüm taslakları sil
  const handleClearAllDrafts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "drafts"));
      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      setDrafts([]); // Taslakları sıfırla
      alert("Tüm taslaklar başarıyla silindi!");
    } catch (error) {
      console.error("Tüm taslaklar silinirken hata oluştu:", error);
      alert("Tüm taslaklar silinirken hata oluştu.");
    }
  };

  // İnceleme işlemi
  const handleViewDraft = (draft) => {
    navigate("/diary", { state: { draft } });
  };

  return (
    <div className="drafts-container">
      <h2 className="drafts-title">Kaydedilen Taslaklar</h2>
      <p className="draft-warning">
        Uyarı: Taslaklar 24 saat içinde otomatik olarak silinecektir.
      </p>

      {drafts.length > 0 ? (
        <div className="draft-list">
          {drafts.map((draft) => (
            <div className="draft-card" key={draft.id}>
              <div className="draft-info">
                <h3 className="draft-title">
                  Günlük -{" "}
                  {new Date(draft.createdAt.seconds * 1000).toLocaleDateString(
                    "tr-TR"
                  )}
                </h3>
                <p className="draft-date">
                  Oluşturma Tarihi:{" "}
                  {new Date(draft.createdAt.seconds * 1000).toLocaleString(
                    "tr-TR"
                  )}
                </p>
              </div>

              <div className="draft-actions">
                <button
                  className="action-btn view-btn"
                  title="İncele"
                  onClick={() => handleViewDraft(draft)}
                >
                  <FaEye /> İncele
                </button>
                <button
                  className="action-btn delete-btn"
                  title="Sil"
                  onClick={() => handleDeleteDraft(draft.id)}
                >
                  <FaTrash /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-drafts">Henüz kaydedilen taslak yok.</p>
      )}

      {drafts.length > 0 && (
        <button className="clear-drafts-btn" onClick={handleClearAllDrafts}>
          <FaTrash /> Tüm Taslakları Sil
        </button>
      )}
    </div>
  );
};

export default Draft;
