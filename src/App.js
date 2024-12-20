// src/App.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import DiaryEntry from "./pages/DiaryEntry";
import Drafts from "./pages/Draft";
import DiaryView from "./pages/DiaryView"; // Yeni sayfa



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/diary-view/:id" element={<DiaryView />} />
        <Route path="/diary" element={<DiaryEntry />} />
        <Route path="/drafts" element={<Drafts />} />
      </Routes>
    </Router>
  );
}

export default App;
