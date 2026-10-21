import { at } from '@/lib/dates';
import type { ItemCrono } from '@/lib/types';

export type StatusEfetivo = ItemCrono['status'] | 'Em andamento' | 'Atrasado';

const FECHADOS: ItemCrono['status'][] = ['Concluído', 'Cancelado', 'Reagendado'];

/** Status considerando a data e a hora de agora. */
export function statusEfetivo(c: ItemCrono, now = new Date()): StatusEfetivo {
  if (FECHADOS.includes(c.status)) return c.status;
  const ini = at(c.data, c.ini);
  const fim = at(c.data, c.fim);
  if (now >= ini && now < fim) return 'Em andamento';
  if (now >= fim) return 'Atrasado';
  return c.status;
}

export const evCls = (s: StatusEfetivo) =>
  ({ Concluído: 's-Concluido', Reagendado: 's-Reagendado', Cancelado: 's-Cancelado', 'Em andamento': 's-Andamento', Planejado: 's-Planejado', Confirmado: '', Atrasado: 's-Atrasado' })[s];

export const stTag = (s: StatusEfetivo) =>
  ({ Concluído: 'ok', Reagendado: 'warn', Cancelado: 'red', 'Em andamento': 'blue', Planejado: '', Confirmado: 'lime', Atrasado: 'red' })[s];

/** Andamento da Semana: concluídos ÷ itens da semana (sem cancelados e reagendados). */
export function andamento(items: ItemCrono[]) {
  const base = items.filter((c) => c.status !== 'Cancelado' && c.status !== 'Reagendado');
  const feitos = base.filter((c) => c.status === 'Concluído').length;
  return { feitos, total: base.length, pct: base.length ? Math.round((feitos / base.length) * 100) : 0 };
}

/** Próximo item a partir de agora. Se houver um acontecendo neste momento, ele é o "Agora". */
export function proximoItem(items: ItemCrono[], now = new Date()): { item: ItemCrono; agora: boolean } | null {
  const abertos = items
    .filter((c) => !FECHADOS.includes(c.status) && at(c.data, c.fim) > now)
    .sort((a, b) => (a.data + a.ini).localeCompare(b.data + b.ini));
  if (!abertos.length) return null;
  const it = abertos[0];
  return { item: it, agora: at(it.data, it.ini) <= now };
}

export const TIPOS_COM_GRUPO = ['Visita DCO', 'Retorno ao grupo', 'Mentoria online', 'Suporte contínuo', 'Ação Cidades Circular'];
export const TIPOS: ItemCrono['tipo'][] = ['Visita DCO', 'Retorno ao grupo', 'Mentoria online', 'Suporte contínuo', 'Capacitação online', 'Ação Cidades Circular', 'Deslocamento', 'Atividade interna', 'Outro'];
