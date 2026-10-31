import React from "react";

type P = { size?: number; color?: string; stroke?: number };
const svg = (size: number, children: React.ReactNode, color: string, stroke: number, fill = "none") => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const Check = ({ size = 24, color = "currentColor", stroke = 2.6 }: P) => svg(size, <path d="M5 12.5l4.2 4.2L19 7" />, color, stroke);
export const Chat = ({ size = 24, color = "currentColor", stroke = 2.2 }: P) =>
  svg(size, <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z" />, color, stroke);
export const Home = ({ size = 24, color = "currentColor", stroke = 2 }: P) =>
  svg(size, <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />, color, stroke);
export const Calendar = ({ size = 24, color = "currentColor", stroke = 2 }: P) =>
  svg(size, <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></>, color, stroke);
export const Bars = ({ size = 24, color = "currentColor", stroke = 2 }: P) => svg(size, <path d="M5 20V12M12 20V5M19 20v-9" />, color, stroke);
export const User = ({ size = 24, color = "currentColor", stroke = 2 }: P) =>
  svg(size, <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>, color, stroke);
export const Plus = ({ size = 24, color = "currentColor", stroke = 2.6 }: P) => svg(size, <path d="M12 5v14M5 12h14" />, color, stroke);
export const ArrowUp = ({ size = 24, color = "currentColor", stroke = 2.6 }: P) => svg(size, <path d="M7 14l5-5 5 5" />, color, stroke);
export const PlayGlyph = ({ size = 24, color = "currentColor" }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" fill={color} />
  </svg>
);

export const StatusIcons = ({ color }: { color: string }) => (
  <svg width="78" height="14" viewBox="0 0 78 14" fill={color}>
    <rect x="0" y="9" width="3.4" height="5" rx="1" />
    <rect x="5.2" y="6.5" width="3.4" height="7.5" rx="1" />
    <rect x="10.4" y="3.8" width="3.4" height="10.2" rx="1" />
    <rect x="15.6" y="1" width="3.4" height="13" rx="1" />
    <path d="M33 4.2a10.5 10.5 0 0 1 14 0l-1.6 1.7a8.2 8.2 0 0 0-10.8 0zM36.2 7.6a6 6 0 0 1 7.6 0l-1.7 1.8a3.6 3.6 0 0 0-4.2 0zM40 11.2l1.9 1.9L40 15l-1.9-1.9z" transform="translate(0 -1)" />
    <rect x="53" y="1.5" width="21" height="11" rx="3.2" fill="none" stroke={color} strokeWidth="1.3" opacity="0.45" />
    <rect x="55" y="3.5" width="15" height="7" rx="1.8" />
    <rect x="75.2" y="5" width="1.8" height="4" rx="0.9" opacity="0.45" />
  </svg>
);

export const Images = ({ size = 24, color = "currentColor", stroke = 2 }: P) =>
  svg(size, <><rect x="3" y="5" width="15" height="14" rx="3" /><path d="M7 19l4.5-5 3 3L17 15M21 8v9a3 3 0 0 1-3 3H8" /><circle cx="8" cy="9.5" r="1.4" /></>, color, stroke);
export const Moon = ({ size = 24, color = "currentColor", stroke = 2.2 }: P) => svg(size, <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />, color, stroke);
export const Shield = ({ size = 24, color = "currentColor", stroke = 2.2 }: P) =>
  svg(size, <><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" /><path d="M8.8 12.2l2.2 2.2 4.4-4.6" /></>, color, stroke);
export const Clock = ({ size = 24, color = "currentColor", stroke = 2.2 }: P) => svg(size, <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, color, stroke);
