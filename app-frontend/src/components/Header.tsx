import React from "react";
import Logo from "./Logo";
import Button from "./Button";

const Header: React.FC = () => {
  return (
    <header className="site-header container" role="banner">
      <div className="logo-row">
        <Logo />
      </div>
      <nav aria-label="Main navigation">
        <Button variant="ghost" className="" >See Templates</Button>
        <Button variant="primary" style={{ marginLeft: 8 }} className="">Create Your Invitation</Button>
      </nav>
    </header>
  );
};

export default Header;
