// Datas sempre no fuso local do computador, em texto yyyy-mm-dd (fácil de comparar e salvar).

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => iso(new Date());

export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Segunda-feira da semana que contém a data. */
export const mondayOf = (s: string) => {
  const d = parseISO(s);
  const wd = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - wd);
  return iso(d);
};

export const weekDays = (monday: string, n = 5) => Array.from({ length: n }, (_, i) => addDays(monday, i));

export const DN = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const fmt = (s?: string) => {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const fmtShort = (s?: string) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}` : '—');
export const weekdayName = (s: string) => DN[(parseISO(s).getDay() + 6) % 7];

export const fmtDateTime = (isoStr?: string) => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} às ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const nowISO = () => new Date().toISOString();
export const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Diferença em dias (b - a). */
export const diffDays = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);

/** Data/hora local combinada a partir de yyyy-mm-dd e hh:mm. */
export const at = (d: string, hm: string) => {
  const x = parseISO(d);
  const [h, m] = hm.split(':').map(Number);
  x.setHours(h, m, 0, 0);
  return x;
};

export const weekLabel = (monday: string) => {
  const fri = addDays(monday, 4);
  return `${fmtShort(monday)} a ${fmtShort(fri)}`;
};

export const monthTitle = (s: string) => {
  const d = parseISO(s);
  return `${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1)} de ${d.getFullYear()}`;
};

export const toBR = fmt;
/** Aceita dd/mm/aaaa, aaaa-mm-dd ou Date e devolve yyyy-mm-dd. */
export function normalizeDate(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) {
    // ExcelJS devolve datas em UTC
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return undefined;
}
