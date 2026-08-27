import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import reportWebVitals from "./reportWebVitals";

const container = document.getElementById("root");

if (!container) {
  throw new Error('#root öğesi bulunamadı — public/index.html bozulmuş olabilir.');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Performans ölçümü isteğe bağlıdır; hiçbir veri dışarı gönderilmez.
reportWebVitals();
