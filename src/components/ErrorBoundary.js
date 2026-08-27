import React from "react";

/**
 * Beklenmeyen bir render hatasında beyaz ekran yerine anlamlı mesaj gösterir.
 * Hata ayrıntısı yalnızca geliştirme modunda görünür.
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
      <div className="sheet sheet-narrow">
        <div className="empty" style={{ marginTop: "14vh" }}>
          <span className="label">Hata</span>
          <h3>Bir şeyler ters gitti</h3>
          <p>
            Uygulama beklenmedik bir durumla karşılaştı. Günlüklerin cihazında
            güvende — sayfayı yenilemek genellikle yeterli olur.
          </p>

          {process.env.NODE_ENV === "development" && (
            <pre
              style={{
                maxWidth: "100%",
                overflowX: "auto",
                textAlign: "left",
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                color: "var(--danger)",
                marginBottom: "var(--s5)",
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
