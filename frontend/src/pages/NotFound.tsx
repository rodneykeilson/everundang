/**
 * 404 Not Found Page
 * 
 * Displayed when a user navigates to a non-existent route.
 */

import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLocale } from "../hooks/useLocale";

const NotFound: React.FC = () => {
  const { t } = useLocale();

  return (
    <>
      <Header />
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "6rem",
            fontWeight: "bold",
            color: "var(--color-primary, #a855f7)",
            margin: 0,
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginTop: "1rem",
            marginBottom: "0.5rem",
          }}
        >
          {t("notFoundTitle")}
        </h2>
        <p
          style={{
            color: "var(--color-text-muted, #6b7280)",
            maxWidth: "400px",
            marginBottom: "2rem",
          }}
        >
          {t("notFoundDescription")}
        </p>
        <Link
          to="/"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--color-primary, #a855f7)",
            color: "white",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 500,
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {t("notFoundBackHome")}
        </Link>
      </main>
      <Footer />
    </>
  );
};

export default NotFound;
