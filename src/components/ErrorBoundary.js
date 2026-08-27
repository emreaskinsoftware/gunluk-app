import React from "react";

/**
 * Beklenmeyen bir render hatasında beyaz ekran yerine anlamlı bir mesaj gösterir.
 *
 * Güvenlik notu: Hata detayı (yığın izi) yalnızca geliştirme modunda gösterilir.
 * Üretimde iç yapıyı sızdırmamak için gizlenir.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[gunluk] beklenmeyen hata:", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="shell">
        <div className="card empty-state" style={{ marginTop: "12vh" }}>
          <span className="empty-icon" aria-hidden="true">
            🛠️
          </span>
          <h3>Bir şeyler ters gitti</h3>
          <p>
            Uygulama beklenmedik bir hatayla karşılaştı. Sayfayı yenilemek
            genellikle sorunu çözer.
          </p>

          {process.env.NODE_ENV === "development" && (
            <pre
              style={{
                maxWidth: "100%",
                overflowX: "auto",
                fontSize: "0.78rem",
                color: "var(--danger-500)",
                textAlign: "left",
              }}
            >
              {String(error?.message || error)}
            </pre>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Sayfayı yenile
          </button>
        </div>
      </div>
    );
  }
}
