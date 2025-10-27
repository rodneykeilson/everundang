import React from "react";

const Footer: React.FC = () => {
  const yr = new Date().getFullYear();
  return (
    <footer className="site-footer container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>© {yr} everundang — Powered by everundang</div>
        <div className="muted">Made for modern Indonesian weddings • Placeholder UI</div>
      </div>
    </footer>
  );
};

export default Footer;
