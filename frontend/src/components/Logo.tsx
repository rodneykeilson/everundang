import { useId } from "react";

const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  const gradientId = useId();

  return (
    <span className="logo-mark" aria-label="EverUndang">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a1c2dd" />
            <stop offset="1" stopColor="#c157b5" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} opacity="0.18" />
        <path
          d="M12 30.5C16.2 23.8 24.5 16 35 18.5"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M14 17c2.5 3 5.5 5 10 5s7.5-2 10-5"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo-type">EverUndang</span>
    </span>
  );
};

export default Logo;
