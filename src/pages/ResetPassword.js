import React, { useState } from "react";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import "../styles/Auth.css";

const ResetPassword = () => {
  const [email, setEmail] = useState("");

  // Şifre sıfırlama işlemi
  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      alert(
        "Eğer kayıtlı e-posta adresiniz varsa sıfırlama linki e-postanıza iletilmiştir."
      );
    } catch (error) {
      alert("Hata: " + error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>Şifremi Unuttum</h2>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Şifreyi Sıfırla</button>
      </form>
      <div className="links">
        <Link to="/">Giriş Yap</Link>
      </div>
    </div>
  );
};

export default ResetPassword;
