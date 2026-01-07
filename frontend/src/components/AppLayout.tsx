import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLocale } from "../hooks/useLocale";
import "./AppLayout.css";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { t } = useLocale();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: "🏠", label: t("navHome") },
    { path: "/new", icon: "✨", label: t("heroPrimaryCta") },
    { path: "/admin", icon: "⚙️", label: t("navAdmin") },
  ];

  return (
    <div className={`app-layout ${sidebarCollapsed ? "app-layout--collapsed" : ""}`}>
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${mobileMenuOpen ? "hamburger--open" : ""}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
        <Link to="/" className="mobile-logo">
          <Logo />
        </Link>
        <div className="mobile-controls">
          <ThemeToggle />
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__header">
          <Link to="/" className="sidebar__logo">
            <Logo />
          </Link>
          <button
            className="sidebar__collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__link ${isActive(item.path) ? "sidebar__link--active" : ""}`}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__controls">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="sidebar__version">
            <span className="sidebar__label">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      {/* Main Content */}
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
