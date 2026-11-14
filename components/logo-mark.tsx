import React from "react";

export const EMBLEMS = [
  { id: "winged-lion", label: "أسد مجنح" }, { id: "camera", label: "كاميرا سينما" },
  { id: "scorpion", label: "عقرب ذهبي" }, { id: "crown", label: "تاج ملكي" },
  { id: "pyramid", label: "هرم مضيء" }, { id: "film", label: "شريط فيلم" },
  { id: "falcon", label: "صقر" }, { id: "masks", label: "قناع مسرحي" },
  { id: "star", label: "نجمة سينمائية" }, { id: "lens", label: "عدسة احترافية" },
];
export const FRAMES = [
  { id: "shield", label: "درع ملكي" }, { id: "laurel", label: "إكليل غار" },
  { id: "neon", label: "دائرة نيون" }, { id: "hexagon", label: "سداسي هندسي" },
  { id: "none", label: "بدون إطار" },
];
export const PALETTES = [
  { id: "gold", label: "لافندر × سماوي", main: "#7865F5", secondary: "#73DDE4", accent: "#4036A8" },
  { id: "crimson", label: "مرجاني × وردي", main: "#FF7F91", secondary: "#FFC3D0", accent: "#C74D70" },
  { id: "cyber", label: "نيون × بنفسجي", main: "#55C9DE", secondary: "#B28BFF", accent: "#397DAA" },
  { id: "emerald", label: "نعناعي × ليموني", main: "#64C9A8", secondary: "#D4ED8A", accent: "#31866D" },
  { id: "fire", label: "خوخي × مشمشي", main: "#FFAD7A", secondary: "#FFE1A6", accent: "#C66F4C" },
];

function Emblem({ type, main, secondary }: { type: string; main: string; secondary: string }) {
  const common = { fill: "none", stroke: main, strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "camera": return <g {...common}><rect x="23" y="35" width="54" height="34" rx="6"/><path d="M34 35l5-9h18l7 9"/><circle cx="50" cy="52" r="12"/><circle cx="50" cy="52" r="5" fill={secondary} stroke="none"/><path d="M68 43h4"/></g>;
    case "scorpion": return <g {...common}><path d="M30 63c9-2 12-12 20-13 8-2 13 7 21 5 6-2 8-10 5-14-4-5-11-3-12 2"/><path d="M47 49l-8-11-11 1 8 12M52 50l10-11 12 2-8 11M29 62l-9 7M69 55l9 8 8-3M72 43l7-10 10 1 3 9"/><circle cx="49" cy="51" r="6" fill={secondary}/></g>;
    case "crown": return <g {...common}><path d="M22 66l5-34 17 15 7-24 9 24 16-15 4 34z"/><path d="M24 72h54"/><circle cx="27" cy="28" r="3" fill={secondary}/><circle cx="51" cy="20" r="3" fill={secondary}/><circle cx="75" cy="28" r="3" fill={secondary}/></g>;
    case "pyramid": return <g {...common}><path d="M18 72L50 22l32 50z"/><path d="M50 22v50M33 48h34M26 60h48"/><path d="M50 9v8m-25 1l5 6M75 18l-5 6" stroke={secondary}/></g>;
    case "film": return <g {...common}><path d="M29 22c19 1 40 18 42 37 2 14-8 22-21 17-14-5-25-22-23-35 1-8 7-12 15-10 12 3 23 16 24 28"/><path d="M25 31l12-7M23 43l13-5M28 58l12-5M41 73l9-9M58 78l5-12M72 69l-11-7"/></g>;
    case "falcon": return <g {...common}><path d="M15 58c12-19 24-25 35-23 11-3 24 4 35 23-13-6-23-5-35 6-12-11-22-12-35-6z"/><path d="M50 34l9 16-9 8-9-8z" fill={secondary}/><path d="M50 58v14M42 71h16"/></g>;
    case "masks": return <g {...common}><path d="M22 30c12-7 27-7 39 0v20c0 12-9 20-20 20-11 0-19-8-19-20z"/><path d="M48 30c11-7 25-7 36 0v20c0 12-8 20-19 20-9 0-15-6-17-15"/><path d="M30 45h8m-4 0v2m24-2h8m-4 0v2M29 57c5 4 11 4 16 0M60 57c5-4 11-4 16 0"/></g>;
    case "star": return <g {...common}><path d="M50 15l10 23 25 2-19 16 6 25-22-14-22 14 6-25-19-16 25-2z"/><circle cx="50" cy="52" r="7" fill={secondary} stroke="none"/></g>;
    case "lens": return <g {...common}><circle cx="50" cy="50" r="29"/><circle cx="50" cy="50" r="20" stroke={secondary}/><circle cx="50" cy="50" r="9" fill={secondary} fillOpacity=".22"/><path d="M50 14v8M50 78v8M14 50h8M78 50h8M25 25l6 6m38 38l6 6m0-50l-6 6m-38 38l-6 6"/></g>;
    default: return <g {...common}><path d="M50 17c-10 13-21 23-29 27 1 16 10 27 29 37 19-10 28-21 29-37-8-4-19-14-29-27z"/><path d="M28 47c11 2 16 8 22 18 6-10 11-16 22-18M35 40l15 25 15-25"/></g>;
  }
}

export function LogoMark({ emblem = "winged-lion", frame = "shield", palette = "gold", size = 72 }: { emblem?: string; frame?: string; palette?: string; size?: number }) {
  const colors = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Hyptrix studio emblem">
    <defs><radialGradient id={`glow-${palette}`}><stop stopColor={colors.main} stopOpacity=".24"/><stop offset="1" stopColor={colors.main} stopOpacity="0"/></radialGradient></defs>
    <circle cx="50" cy="50" r="47" fill={`url(#glow-${palette})`}/>
    {frame === "shield" && <path d="M50 7L86 21v29c0 21-14 34-36 43C28 84 14 71 14 50V21z" fill="none" stroke={colors.main} strokeWidth="2.6"/>}
    {frame === "neon" && <circle cx="50" cy="50" r="42" fill="none" stroke={colors.main} strokeWidth="2.5" strokeDasharray="4 3"/>}
    {frame === "hexagon" && <path d="M50 7l36 21v44L50 93 14 72V28z" fill="none" stroke={colors.main} strokeWidth="2.6"/>}
    {frame === "laurel" && <g fill="none" stroke={colors.main} strokeWidth="2.3"><path d="M20 75C5 50 14 26 32 16M80 75c15-25 6-49-12-59"/>{Array.from({ length: 5 }).map((_, i) => <g key={i}><path d={`M${17 + i * 2} ${65 - i * 9}q-15 -10 -8 -20q12 5 8 20`} /><path d={`M${83 - i * 2} ${65 - i * 9}q15 -10 8 -20q-12 5 -8 20`} /></g>)}</g>}
    {frame === "none" && <circle cx="50" cy="50" r="40" fill="none" stroke={colors.accent} strokeWidth="1"/>}
    <Emblem type={emblem} main={colors.main} secondary={colors.secondary}/>
  </svg>;
}
