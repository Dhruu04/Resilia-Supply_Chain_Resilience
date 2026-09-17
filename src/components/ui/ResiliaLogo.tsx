interface ResiliaLogoProps {
  className?: string;
  size?: number;
}

export function ResiliaLogo({ className = "size-8", size }: ResiliaLogoProps) {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...dimensionProps}
    >
      <defs>
        <linearGradient
          id="resiliaGrad1"
          x1="10"
          y1="10"
          x2="90"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="45%" stopColor="#4f46e5" />
          <stop offset="85%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient
          id="resiliaGrad2"
          x1="80"
          y1="20"
          x2="20"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <filter id="resiliaGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Orbit Track & Swirl Arcs */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="url(#resiliaGrad1)"
        strokeWidth="2.5"
        strokeOpacity="0.4"
      />
      <path
        d="M 50 5 A 45 45 0 0 1 95 50 A 45 45 0 0 1 60 93.7"
        stroke="url(#resiliaGrad1)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M 50 95 A 45 45 0 0 1 5 50 A 45 45 0 0 1 40 6.3"
        stroke="url(#resiliaGrad2)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Middle Concentric Orbit Track */}
      <circle
        cx="50"
        cy="50"
        r="31"
        stroke="url(#resiliaGrad1)"
        strokeWidth="2.8"
        strokeDasharray="170 25"
      />

      {/* Inner Concentric Orbit Track */}
      <circle cx="50" cy="50" r="18" stroke="url(#resiliaGrad1)" strokeWidth="3" />

      {/* Center Nucleus Pearl */}
      <circle cx="50" cy="50" r="6.5" fill="url(#resiliaGrad1)" filter="url(#resiliaGlow)" />
      <circle cx="50" cy="50" r="3" fill="#ffffff" />

      {/* Orbital Pearl Nodes (Concentric Constellation) */}
      {/* Outer Nodes */}
      <circle cx="18" cy="40" r="3.2" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
      <circle cx="82" cy="60" r="3.2" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />

      {/* Middle Orbit Nodes */}
      <circle cx="50" cy="19" r="3.4" fill="#ffffff" stroke="#4338ca" strokeWidth="2" />
      <circle cx="79" cy="40" r="3.4" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="50" cy="81" r="3.4" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
      <circle cx="21" cy="60" r="3.4" fill="#ffffff" stroke="#6366f1" strokeWidth="2" />

      {/* Inner Orbit Nodes */}
      <circle cx="68" cy="50" r="3" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="36" cy="38" r="3" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
    </svg>
  );
}
