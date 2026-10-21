import { compressImage, putMedia } from './media';
import { pickFile } from '@/components/ui';
import { nowISO } from './dates';
import { uid } from './utils';
import type { Anexo } from './types';

/** Tira ou escolhe uma foto, reduz o tamanho e guarda. */
export async function capturarFoto(): Promise<{ id: string; w: number; h: number } | null> {
  const f = await pickFile('image/*');
  if (!f) return null;
  const { blob, w, h } = await compressImage(f);
  const id = await putMedia(blob, f.name);
  return { id, w, h };
}

export async function capturarVideo(): Promise<{ id: string } | null> {
  const f = await pickFile('video/*');
  if (!f) return null;
  const id = await putMedia(f, f.name);
  return { id };
}

/** Anexa um arquivo qualquer (PDF, Word, imagem...). Imagens são reduzidas. */
export async function anexarArquivo(por: string, accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx'): Promise<Anexo | null> {
  const f = await pickFile(accept, false);
  if (!f) return null;
  let blob: Blob = f;
  if (f.type.startsWith('image/')) blob = (await compressImage(f)).blob;
  const mediaId = await putMedia(blob, f.name);
  return { id: uid(), nome: f.name, mediaId, mime: blob.type || f.type, em: nowISO(), por };
}
