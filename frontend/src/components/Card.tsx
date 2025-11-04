import React from "react";

type CardProps = {
  title: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
};

const Card: React.FC<CardProps> = ({ title, children, icon }) => {
  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#fff1d6,#ffdede)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <div>
          <strong>{title}</strong>
          <div className="muted" style={{ marginTop: 6 }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Card;
