import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Sparkles, Settings, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
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
    { path: "/", icon: <Home size={20} />, label: t("navHome") },
    { path: "/new", icon: <Sparkles size={20} />, label: t("heroPrimaryCta") },
    { path: "/admin", icon: <Settings size={20} />, label: t("navAdmin") },
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
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link to="/" className="mobile-logo">
          <Logo size={32} />
        </Link>
        <div className="mobile-controls">
          <ThemeToggle />
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__header">
          <Link to="/" className="sidebar__logo">
            <Logo size={sidebarCollapsed ? 30 : 34} />
          </Link>
          <button
            className="sidebar__collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__link ${isActive(item.path) ? "sidebar__link--active" : ""}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__controls">
            {!sidebarCollapsed && (
              <div className="sidebar__control-item">
                <span className="sidebar__control-label">LANGUAGE</span>
                <LanguageSwitcher />
              </div>
            )}
            <div className="sidebar__control-item">
              {!sidebarCollapsed && <span className="sidebar__control-label">THEME</span>}
              <ThemeToggle hideLabel={sidebarCollapsed} />
            </div>
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar__version">
              v1.0.0
            </div>
          )}
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
