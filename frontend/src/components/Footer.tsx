import { useLocale } from "../hooks/useLocale";

const Footer: React.FC = () => {
  const yr = new Date().getFullYear();
  const { t } = useLocale();

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="container app-footer__inner">
        <p>© {yr} EverUndang. {t("footerRights")}</p>
        <nav aria-label="Legal" className="footer-links">
          <span className="footer-link footer-link--disabled" title={t("footerComingSoon")}>
            {t("footerTerms")}
          </span>
          <span className="footer-link footer-link--disabled" title={t("footerComingSoon")}>
            {t("footerPrivacy")}
          </span>
          <span className="footer-link footer-link--disabled" title={t("footerComingSoon")}>
            {t("footerStatus")}
          </span>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
