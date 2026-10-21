import clsx, { type ClassValue } from 'clsx';

export const cn = (...a: ClassValue[]) => clsx(a);

let counter = 0;
export const uid = () => Date.now().toString(36) + (counter++).toString(36) + Math.random().toString(36).slice(2, 6);

export const initials = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁ-Ú]/.test(p))
    .filter((p) => !['de', 'da', 'do', 'dos', 'das'].includes(p.toLowerCase()))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const firstName = (nome: string) => nome.split(' ')[0];
export const shortName = (nome: string) => {
  const p = nome.split(' ').filter((x) => !['de', 'da', 'do', 'dos', 'das'].includes(x.toLowerCase()));
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0];
};

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);

export function saveBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const maskCPF = (c: string) => (c ? '***.***.***-' + c.slice(-2) : '—');

export const AVATAR_TONES = ['#7fae00', '#5fa8d3', '#e0a43a', '#b07cd8', '#e77a6a', '#4fb59a', '#9aa83a'];
export const toneFor = (id: string) => AVATAR_TONES[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
