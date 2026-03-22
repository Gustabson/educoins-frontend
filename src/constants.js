// constants.js — constantes globales compartidas

const THEMES_DEFAULT = {
  primary:   '#00c1fc',
  secondary: '#52177f',
  darkBg:    '#12101e',
  cardBg:    '#1e1b2e',
  isDark:    false,
};

const DUAL_THEMES = [
  { id:'oceano',   name:'Océano',        primary:'#00c1fc', secondary:'#0369a1', dark:false, icon:'🌊' },
  { id:'noche',    name:'Noche Violeta', primary:'#7c3aed', secondary:'#c084fc', dark:true,  icon:'🌌' },
  { id:'bosque',   name:'Bosque',        primary:'#10b981', secondary:'#065f46', dark:true,  icon:'🌿' },
  { id:'fuego',    name:'Fuego',         primary:'#f97316', secondary:'#dc2626', dark:false, icon:'🔥' },
  { id:'rosa',     name:'Rosa',          primary:'#ec4899', secondary:'#9d174d', dark:false, icon:'🌸' },
  { id:'dorado',   name:'Dorado',        primary:'#f59e0b', secondary:'#78350f', dark:true,  icon:'✨' },
  { id:'neonverde',name:'Neon Verde',    primary:'#22c55e', secondary:'#14532d', dark:true,  icon:'💚' },
  { id:'aurora',   name:'Aurora',        primary:'#a855f7', secondary:'#06b6d4', dark:false, icon:'🌈' },
];

// Modos de pantalla built-in — misma estructura que screen_modes de la DB
const BUILTIN_SCREEN_MODES = [
  {
    id:"claro", nombre:"Claro", icon:"☀️", isDark:false,
    bg:"#F0F0F0", pageBg:"#F0F0F0", card:"white", nav:"white",
    navBord:"#EFEFEF", navPill:"#f0f9ff", navInact:"#777777",
    txt:"#1a1a1a", sub:"#555555", inputBg:"#F7F7F7", inputBd:"#E8E8E8",
  },
  {
    id:"oscuro", nombre:"Oscuro", icon:"🌑", isDark:true,
    bg:"#000000", pageBg:"#000000", card:"#111111", nav:"#0a0a0a",
    navBord:"#222222", navPill:"#1a1a1a", navInact:"#666666",
    txt:"#f5f5f5", sub:"#999999", inputBg:"#141414", inputBd:"#2a2a2a",
  },
];


// Convierte cualquier config de modo al formato estándar de BUILTIN_SCREEN_MODES
// Así el modo personalizado es idéntico a Claro/Oscuro para todo el sistema
const normalizeMode = (raw) => {
  if(!raw) return BUILTIN_SCREEN_MODES[0];
  const bg       = raw.bg || raw.pageBg || "#F0F0F0";
  const card     = raw.card || "#ffffff";
  const nav      = raw.nav || card;
  const inputBg  = raw.inputBg || bg;
  const isDark   = raw.isDark || false;
  // Derivar colores secundarios si no están definidos
  const navBord  = raw.navBord || (isDark ? darken(nav, 0.15) : lighten(bg, 0.05));
  const navPill  = raw.navPill || (isDark ? lighten(nav, 0.08) : lighten(bg, 0.08));
  const navInact = raw.navInact || (isDark ? "#888888" : "#777777");
  const inputBd  = raw.inputBd || (isDark ? lighten(inputBg, 0.12) : darken(inputBg, 0.06));
  const txt      = raw.txt || (isDark ? "#e8e8f0" : "#1a1a1a");
  const sub      = raw.sub || (isDark ? "#888888" : "#555555");
  return {
    id:      raw.id      || "personalizado",
    nombre:  raw.nombre  || "Personalizado",
    icon:    raw.icon    || "🎨",
    isDark, bg, pageBg: bg, card, nav,
    navBord, navPill, navInact, inputBg, inputBd, txt, sub,
  };
};
// Helpers de color simples (hex → ajuste de brillo)
const _hexToRgb = h => { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return [r,g,b]; };
const _rgbToHex = (r,g,b) => "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const lighten = (hex,amt) => { try { const [r,g,b]=_hexToRgb(hex); return _rgbToHex(r+255*amt,g+255*amt,b+255*amt); } catch{return hex;} };
const darken  = (hex,amt) => { try { const [r,g,b]=_hexToRgb(hex); return _rgbToHex(r-255*amt,g-255*amt,b-255*amt); } catch{return hex;} };

// ── SOCKET SINGLETON ──────────────────────────────────────────
let _socket = null;

const LEVELS = [
  {min:0,    name:"Novato",   color:"#94a3b8", icon:"🌱"},
  {min:100,  name:"Alumno",   color:"#3b82f6", icon:"📚"},
  {min:300,  name:"Dedicado", color:"#10b981", icon:"⚡"},
  {min:600,  name:"Experto",  color:"#f59e0b", icon:"🔥"},
  {min:1000, name:"Élite",    color:"#8b5cf6", icon:"💎"},
  {min:2000, name:"Leyenda",  color:"#ef4444", icon:"👑"},
];
const getLv  = e => { let l=LEVELS[0]; for(const x of LEVELS) if(e>=x.min) l=x; return l; };
const nextLv = e => { for(const x of LEVELS) if(e<x.min) return x; return null; };

const SKINS = [
  {id:"s1",emoji:"🧑‍🎓",name:"Clásico", price:0,   bg:"#6366f1"},
  {id:"s2",emoji:"🥷",  name:"Ninja",   price:150, bg:"#1a1a2e"},
  {id:"s3",emoji:"👨‍🚀", name:"Astro",   price:200, bg:"#0369a1"},
  {id:"s4",emoji:"🧙",  name:"Mago",    price:250, bg:"#52177f"},
  {id:"s5",emoji:"🤖",  name:"Robot",   price:300, bg:"#0f766e"},
  {id:"s6",emoji:"🧔",  name:"Vikingo", price:350, bg:"#92400e"},
  {id:"s7",emoji:"🦸",  name:"Héroe",   price:400, bg:"#1d4ed8"},
  {id:"s8",emoji:"🏴‍☠️", name:"Pirata",  price:500, bg:"#1c1917"},
];
const BORDERS = [
  {id:"b1",name:"Básico",  bs:"3px solid #DC2626", price:0},  // rojo
  {id:"b2",name:"Dorado",  bs:"3px solid #f59e0b", price:100},
  {id:"b3",name:"Verde",   bs:"3px solid #10b981", price:200},
  {id:"b4",name:"Rojo",    bs:"3px solid #ef4444", price:300},
  {id:"b5",name:"Violeta", bs:"3px solid #8b5cf6", price:400},
];
const TITLES = [
  {id:"tl1",name:"Estudiante",    price:0},
  {id:"tl2",name:"🎯 Enfocado",  price:100},
  {id:"tl3",name:"💪 Imparable", price:200},
  {id:"tl4",name:"🌟 Brillante", price:300},
  {id:"tl5",name:"🏆 Campeón",   price:500},
];

const DIFCOL = {"fácil":"#10b981","media":"#f59e0b","difícil":"#ef4444"};

// ── ESTILOS GLOBALES ──────────────────────────────────────────

const TAG_COLORS = {
  General:"#64748b", Académico:"#3b82f6", Deportes:"#10b981",
  Evento:"#f59e0b",  Aviso:"#8b5cf6"
};
const TAG_LIST = ["Todos","General","Académico","Deportes","Evento","Aviso"];

const REPORTE_TIPOS = [
  {id:"bullying",   label:"Bullying",      icon:"😰", col:"#ef4444"},
  {id:"accidente",  label:"Accidente",     icon:"🚑", col:"#f59e0b"},
  {id:"perdido",    label:"Obj. perdido",  icon:"🔍", col:"#3b82f6"},
  {id:"sugerencia", label:"Sugerencia",    icon:"💡", col:"#10b981"},
  {id:"otro",       label:"Otro",          icon:"📋", col:"#8b5cf6"},
];
const ESTADO_LABEL={recibido:"Recibido",en_revision:"En revisión",resuelto:"Resuelto",descartado:"Descartado"};
const ESTADO_COLOR={recibido:"#f59e0b",en_revision:"#3b82f6",resuelto:"#10b981",descartado:"#94a3b8"};
const ESTADO_COL={recibido:"#f59e0b",en_revision:"#3b82f6",resuelto:"#10b981",descartado:"#94a3b8"};
const ESTADO_LABEL2={recibido:"Recibido",en_revision:"En revisión",resuelto:"Resuelto",descartado:"Descartado"};
const TIPO_ICON={bullying:"😰",accidente:"🚑",perdido:"🔍",sugerencia:"💡",otro:"📋"};

const CHAT_SECTIONS = ["Personal","Aula","Global"];

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body,#root{margin:0;padding:0;background:#F0F0F0;font-family:'Nunito',sans-serif;}
input,select,button,textarea{font-family:'Nunito',sans-serif;}
input::placeholder{color:#bbb;}
::-webkit-scrollbar{display:none;}
@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes balUp{0%{color:#10b981;transform:scale(1.18)}60%{color:#10b981;transform:scale(1.06)}100%{color:inherit;transform:scale(1)}}
@keyframes balDown{0%{color:#ef4444;transform:scale(.92)}60%{color:#ef4444;transform:scale(.96)}100%{color:inherit;transform:scale(1)}}
`;

// ── COMPONENTES BASE ──────────────────────────────────────────

export {
  THEMES_DEFAULT, DUAL_THEMES, BUILTIN_SCREEN_MODES, normalizeMode,
  LEVELS, getLv, nextLv,
  SKINS, BORDERS, TITLES,
  DIFCOL, GS,
  TAG_COLORS, TAG_LIST,
  REPORTE_TIPOS, ESTADO_LABEL, ESTADO_COLOR,
  ESTADO_COL, ESTADO_LABEL2, TIPO_ICON,
  CHAT_SECTIONS
};
