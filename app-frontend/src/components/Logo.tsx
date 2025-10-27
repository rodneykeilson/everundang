import React from "react";

// Simple logo placeholder. Replace with a designer's SVG or image later.
const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="48" height="48" rx="12" fill="#FFDDE6" />
        <path d="M14 30c4-6 10-12 20-10" stroke="#7B61FF" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="brand-name">everundang</span>
    </div>
  );
};

export default Logo;
