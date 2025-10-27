import React from "react";
import Button from "./Button";

const Hero: React.FC = () => {
  return (
    <section className="container hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <h1 id="hero-title" className="hero-title">Digital Wedding Invitation & Guest Management</h1>
        <p className="hero-lead">everundang helps Indonesian couples create beautiful digital invitations, manage guests, and collect RSVPs — fast and with style.</p>

        <div className="hero-actions">
          <Button variant="primary">Create Your Invitation</Button>
          <Button variant="ghost">See Templates</Button>
        </div>
      </div>

      <div className="hero-visual" aria-hidden>
        {/* Placeholder visual: replace with compositional preview or mockup later */}
      </div>
    </section>
  );
};

export default Hero;
