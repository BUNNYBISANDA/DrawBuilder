// Small stroke-based icon set, 20px grid, used in place of emoji throughout
// the app so status/affordances read cleanly across platforms and pair
// color with shape (never color alone).
const base = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconBell(props) {
  return <svg {...base} {...props}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>;
}
export function IconTrophy(props) {
  return <svg {...base} {...props}><path d="M8 4h8v4a4 4 0 01-8 0V4z" /><path d="M8 5H4a3 3 0 003 3M16 5h4a3 3 0 01-3 3" /><path d="M10 15h4v3h-4z" /><path d="M8 21h8" /></svg>;
}
export function IconEye(props) {
  return <svg {...base} {...props}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>;
}
export function IconEyeOff(props) {
  return <svg {...base} {...props}><path d="M3 3l18 18" /><path d="M10.6 5.2A9.7 9.7 0 0112 5c6.5 0 10 7 10 7a15.6 15.6 0 01-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 004-.9" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>;
}
export function IconPencil(props) {
  return <svg {...base} {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>;
}
export function IconClose(props) {
  return <svg {...base} {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>;
}
export function IconWarning(props) {
  return <svg {...base} {...props}><path d="M12 3l10 18H2z" /><path d="M12 10v4M12 17h.01" /></svg>;
}
export function IconInfo(props) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}
export function IconCheckCircle(props) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M8 12l2.5 2.5L16 9" /></svg>;
}
export function IconClock(props) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
}
export function IconCircleDashed(props) {
  return <svg {...base} {...props} strokeDasharray="3 3"><circle cx="12" cy="12" r="9" /></svg>;
}
export function IconArrowRight(props) {
  return <svg {...base} {...props}><path d="M10 7l5 5-5 5" /></svg>;
}
export function IconAlertCircle(props) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
}
export function IconWifi(props) {
  return <svg {...base} {...props}><path d="M2 8.5a16 16 0 0120 0" /><path d="M5.5 12.5a11 11 0 0113 0" /><path d="M9 16.5a6 6 0 016 0" /><path d="M12 20h.01" /></svg>;
}
export function IconWifiOff(props) {
  return <svg {...base} {...props}><path d="M2 2l20 20" /><path d="M9 16.5a6 6 0 016 0" /><path d="M5.5 12.5a11 11 0 015-2.7M17.7 11a11 11 0 012.8 1.5" /><path d="M2 8.5a16 16 0 014.4-2.7M19.6 8.5a16 16 0 011.4.9" /><path d="M12 20h.01" /></svg>;
}
export function IconSchool(props) {
  return <svg {...base} {...props}><path d="M12 3l10 5-10 5L2 8z" /><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" /><path d="M22 8v6" /></svg>;
}
export function IconChevronUp(props) {
  return <svg {...base} {...props}><path d="M6 15l6-6 6 6" /></svg>;
}
export function IconChevronDown(props) {
  return <svg {...base} {...props}><path d="M6 9l6 6 6-6" /></svg>;
}
export function IconChevronUpSmall(props) {
  return <svg {...base} {...props}><path d="M6 14l6-5 6 5" /></svg>;
}
export function IconChevronDownSmall(props) {
  return <svg {...base} {...props}><path d="M6 10l6 5 6-5" /></svg>;
}
export function IconArrowUp(props) {
  return <svg {...base} {...props}><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></svg>;
}
export function IconArrowDown(props) {
  return <svg {...base} {...props}><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></svg>;
}
export function IconSun(props) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="4.2" /><path d="M12 3v1.5M12 19.5V21M4.9 4.9l1 1M18 18l1 1M3 12h1.5M19.5 12H21M4.9 19.1l1-1M18 6l1-1" /></svg>;
}
export function IconMoon(props) {
  return <svg {...base} {...props}><path d="M20 14.5A8.5 8.5 0 1110 3.3 6.8 6.8 0 0020 14.5z" /></svg>;
}
export function IconShuttlecock(props) {
  return <svg {...base} {...props}><circle cx="12" cy="16" r="3.2" /><path d="M12 12.8L7 5l2.3-1 3.4 6.6M12 12.8l7-7.8-2.3-1-3.9 7.2M12 12.8l-3-9.3 2.4-.6 2.9 8.6" /></svg>;
}
export function IconCopy(props) {
  return <svg {...base} {...props}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" /></svg>;
}
export function IconArrowUpRight(props) {
  return <svg {...base} {...props}><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>;
}
export function IconPlus(props) {
  return <svg {...base} {...props}><path d="M12 5v14M5 12h14" /></svg>;
}
export function IconCalendar(props) {
  return <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
}
export function IconMedal(props) {
  return <svg {...base} {...props}><circle cx="12" cy="14" r="6" /><path d="M9 3l3 5 3-5M9 3l-2 2 2.7 4.6M15 3l2 2-2.7 4.6" /></svg>;
}
