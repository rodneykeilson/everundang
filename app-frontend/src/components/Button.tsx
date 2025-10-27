import React from "react";

type Props = {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  className?: string;
};

const Button: React.FC<Props> = ({ children, variant = "primary", onClick, className }) => {
  const base = "btn";
  const vk = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <button className={`${base} ${vk} ${className ?? ""}`} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
