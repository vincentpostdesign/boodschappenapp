// Kleine lijn-iconen (24px raster, currentColor).
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconList = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></svg>
);
export const IconStar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg>
);
export const IconEye = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconReceipt = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
);
export const IconSettings = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
);
export const IconPlus = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconMinus = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M5 12h14" /></svg>
);
export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.6}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const IconTrash = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const IconTag = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9z" /><circle cx="8" cy="8" r="1.3" /></svg>
);
export const IconSearch = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const IconCamera = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const IconBell = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const IconUp = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="m6 15 6-6 6 6" /></svg>
);
export const IconDown = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconChart = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg>
);
export const IconGift = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20" /><path d="M12 7.5C10.5 4 7 4 7 6s3 1.5 5 1.5ZM12 7.5c1.5-3.5 5-3.5 5-1.5s-3 1.5-5 1.5Z" /></svg>
);
