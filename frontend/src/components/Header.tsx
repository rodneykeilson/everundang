import { Link } from "react-router-dom";
import Logo from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "../hooks/useLocale";

const Header: React.FC = () => {
  const { t } = useLocale();

  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner container">
        <Link to="/" className="brand" aria-label="EverUndang home">
          <Logo />
        </Link>
        <nav aria-label="Primary navigation" className="app-header__nav">
          <Link to="/#templates" className="nav-link">
            {t("featureTemplates")}
          </Link>
          <Link to="/#faq" className="nav-link">
            FAQ
          </Link>
          <Link to="/dashboard" className="nav-link nav-link--primary">
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
