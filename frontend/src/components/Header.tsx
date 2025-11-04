import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

const Header: React.FC = () => {
  return (
    <header className="site-header container" role="banner">
      <div className="logo-row">
        <Logo />
      </div>
      <nav aria-label="Main navigation" className="nav-links">
        <Link to="/#templates" className="nav-link">
          See Templates
        </Link>
        <Link to="/dashboard" className="nav-link primary">
          Launch Builder
        </Link>
      </nav>
    </header>
  );
};

export default Header;
