import { useLocale } from "../hooks/useLocale";

const Footer: React.FC = () => {
  const yr = new Date().getFullYear();
  const { t } = useLocale();

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="container app-footer__inner">
        <p>© {yr} EverUndang. {t("footerRights")}</p>
        <nav aria-label="Legal" className="footer-links">
          <a href="#" className="footer-link">
            Terms
          </a>
          <a href="#" className="footer-link">
            Privacy
          </a>
          <a href="#" className="footer-link">
            Status
          </a>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
