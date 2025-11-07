import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "../hooks/useLocale";

const Header: React.FC = () => {
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSectionClick = (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    event.preventDefault();
    const hash = `#${targetId}`;

    if (location.pathname === "/") {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", hash);
      }
      return;
    }

    navigate({ pathname: "/", hash });
  };

  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner container">
        <Link to="/" className="brand" aria-label="EverUndang home">
          <Logo />
        </Link>
        <nav aria-label="Primary navigation" className="app-header__nav">
          <Link
            to="/#templates"
            className="nav-link"
            onClick={(event) => handleSectionClick(event, "templates")}
          >
            {t("navTemplates")}
          </Link>
          <Link
            to="/#faq"
            className="nav-link"
            onClick={(event) => handleSectionClick(event, "faq")}
          >
            {t("navFaq")}
          </Link>
          <Link to="/admin" className="nav-link">
            {t("navAdmin")}
          </Link>
          <Link to="/new" className="nav-link nav-link--primary">
            {t("dashboardCta")}
          </Link>
        </nav>
        <div className="app-header__controls">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
