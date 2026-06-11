// Icon components for the Comic Lingo application

const iconStyle = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round"
};

export const SearchIcon = () => (
  <svg {...iconStyle}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const TranslateIcon = () => (
  <svg {...iconStyle}>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="m2 5 3 3" />
    <path d="m18 16 2 2" />
    <path d="m14 19 6-6-3-3" />
  </svg>
);

export const DownloadIcon = () => (
  <svg {...iconStyle}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...iconStyle}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ErrorIcon = () => (
  <svg {...iconStyle}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ArrowsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const PaintIcon = () => (
  <svg {...iconStyle}>
    <path d="M2 13.5V20h6.5l9.86-9.86-6.5-6.5L2 13.5z" />
    <path d="m18.5 2.5 3 3" />
  </svg>
);

export const EyeIcon = () => (
  <svg {...iconStyle}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
