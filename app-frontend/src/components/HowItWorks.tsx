import React from "react";

const HowItWorks: React.FC = () => {
  return (
    <section className="container how">
      <h2>How it works</h2>
      <p className="muted">Three simple steps to get your wedding invitation live.</p>

      <div className="steps" style={{ marginTop: 12 }}>
        <div className="step card">
          <div className="step-icon">1</div>
          <div>
            <strong>Register & Create</strong>
            <div className="muted">Create an account and start with a template.</div>
          </div>
        </div>

        <div className="step card">
          <div className="step-icon">2</div>
          <div>
            <strong>Personalize & Design</strong>
            <div className="muted">Edit text, images, and colors to match your style.</div>
          </div>
        </div>

        <div className="step card">
          <div className="step-icon">3</div>
          <div>
            <strong>Share & Celebrate</strong>
            <div className="muted">Share the link with guests and collect RSVPs.</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
