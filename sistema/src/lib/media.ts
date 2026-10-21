import { createStore, get, set, del, clear } from 'idb-keyval';
import { useEffect, useState } from 'react';
import { uid } from './utils';

// Fotos, vídeos, assinaturas e anexos ficam no IndexedDB do navegador (aguenta muito mais que o localStorage).
const store = createStore('jornada-tecso-midia', 'arquivos');

interface Stored {
  blob: Blob;
  name: string;
  mime: string;
}

const urlCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();

export async function putMedia(blob: Blob, name = 'arquivo'): Promise<string> {
  const id = 'm_' + uid();
  await set(id, { blob, name, mime: blob.type } satisfies Stored, store);
  blobCache.set(id, blob);
  return id;
}

export async function removeMedia(id?: string) {
  if (!id || id.startsWith('seed:')) return;
  await del(id, store);
  const u = urlCache.get(id);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(id);
  blobCache.delete(id);
}

export async function clearMedia() {
  await clear(store);
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
  blobCache.clear();
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  if (blobCache.has(id)) return blobCache.get(id)!;
  if (id.startsWith('seed:')) {
    const b = await seedImage(id);
    blobCache.set(id, b);
    return b;
  }
  const s = (await get(id, store)) as Stored | undefined;
  if (!s) return null;
  blobCache.set(id, s.blob);
  return s.blob;
}

export async function getMediaURL(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const b = await getMediaBlob(id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  urlCache.set(id, u);
  return u;
}

export function useMediaURL(id?: string | null) {
  const [url, setUrl] = useState<string | null>(id ? urlCache.get(id) ?? null : null);
  useEffect(() => {
    let live = true;
    if (!id) {
      setUrl(null);
      return;
    }
    getMediaURL(id).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [id]);
  return url;
}

export async function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });
}

export async function dataURLToBlob(d: string): Promise<Blob> {
  return (await fetch(d)).blob();
}

/** Reduz a foto para no máximo 1600px (mantém o arquivo leve) e informa a orientação. */
export async function compressImage(file: File | Blob, max = 1600): Promise<{ blob: Blob; w: number; h: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.82));
    return { blob, w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------- fotos de exemplo ----------------
// Formato do id: seed:<h|v>:<rótulo>:<n>. São desenhadas na hora num canvas e entram no ZIP como JPG.
const TONES = ['#2f5d50', '#3e6b3a', '#1c4450', '#56642a', '#35505e', '#4a5a33', '#28463f', '#5b6b2e'];

export function seedId(kind: 'h' | 'v' | 's' | 'pdf' | 'vid', label: string, n = 0) {
  return `seed:${kind}:${label.replace(/:/g, ' ')}:${n}`;
}

export function isSeed(id?: string | null) {
  return !!id && id.startsWith('seed:');
}

async function seedImage(id: string): Promise<Blob> {
  const [, kind, label, nStr] = id.split(':');
  const n = Number(nStr) || 0;
  if (kind === 's') return seedSignature(label, n);
  if (kind === 'pdf') return simplePdf(label, [
    'Documento de exemplo gerado pelo protótipo da Jornada de Profissionalização TECSO.',
    'No uso real, aqui fica o arquivo anexado pelo técnico ou pela coordenação.',
  ]);
  const orient = kind === 'v' || kind === 'vid' ? 'v' : 'h';
  const W = orient === 'v' ? 600 : 800;
  const H = orient === 'v' ? 880 : 600;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, TONES[n % TONES.length]);
  g.addColorStop(1, TONES[(n + 3) % TONES.length]);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // galpão estilizado
  x.globalAlpha = 0.18;
  x.fillStyle = '#ccff00';
  x.beginPath();
  x.moveTo(W * 0.12, H * 0.72);
  x.lineTo(W * 0.12, H * 0.42);
  x.lineTo(W * 0.5, H * 0.24);
  x.lineTo(W * 0.88, H * 0.42);
  x.lineTo(W * 0.88, H * 0.72);
  x.closePath();
  x.fill();
  x.globalAlpha = 0.28;
  x.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) x.fillRect(W * (0.2 + i * 0.16), H * 0.56, W * 0.1, H * 0.16);
  x.globalAlpha = 1;
  x.fillStyle = 'rgba(0,34,7,.72)';
  x.fillRect(0, H - 92, W, 92);
  x.fillStyle = '#ccff00';
  x.font = '700 15px Montserrat, Inter, sans-serif';
  x.fillText(kind === 'vid' ? 'VÍDEO DE EXEMPLO · QUADRO' : 'FOTO DE EXEMPLO · DEMONSTRAÇÃO', 22, H - 58);
  x.fillStyle = '#ffffff';
  x.font = '600 22px Inter, sans-serif';
  const txt = label.length > 46 ? label.slice(0, 45) + '…' : label;
  x.fillText(txt, 22, H - 26);
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.8));
}

async function seedSignature(name: string, n: number): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 480;
  c.height = 150;
  const x = c.getContext('2d')!;
  x.strokeStyle = '#0d1f3a';
  x.lineWidth = 2.6;
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.beginPath();
  let px = 40;
  const base = 92;
  x.moveTo(px, base);
  const letters = Math.max(6, name.length);
  for (let i = 0; i < letters; i++) {
    const amp = 18 + ((i * 7 + n * 5) % 22);
    x.bezierCurveTo(px + 8, base - amp, px + 18, base - amp, px + 22, base);
    x.bezierCurveTo(px + 26, base + 10, px + 30, base + 6, px + 34, base - 4);
    px += 30;
    if (px > 430) break;
  }
  x.stroke();
  x.beginPath();
  x.moveTo(36, base + 22);
  x.quadraticCurveTo(220, base + 6, 440, base + 18);
  x.stroke();
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'));
}

/** PDF mínimo válido (uma página, texto simples), usado nos anexos de exemplo. */
export function simplePdf(title: string, lines: string[]): Blob {
  const esc = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[()\\]/g, (m) => '\\' + m);
  const text = [`BT /F1 18 Tf 60 770 Td (${esc(title)}) Tj ET`, ...lines.map((l, i) => `BT /F1 11 Tf 60 ${735 - i * 18} Td (${esc(l)}) Tj ET`)].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}

export function extFromMime(mime: string, fallback = 'bin') {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('sheet')) return 'xlsx';
  if (mime.includes('word')) return 'docx';
  return fallback;
}
