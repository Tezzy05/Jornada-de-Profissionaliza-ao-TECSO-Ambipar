import { diffDays, today } from '@/lib/dates';
import type { Prioridade, StatusTarefa, Tarefa } from '@/lib/types';

export const AREAS = ['TECSO', 'Coordenação', 'Operação', 'Comercial', 'Comunicação', 'Jurídico', 'Cliente', 'Prefeitura', 'Cooperativa'];
export const PRIORIDADES: Prioridade[] = ['Baixa', 'Média', 'Alta', 'Urgente'];
export const STATUS_TAREFA: StatusTarefa[] = ['A fazer', 'Em andamento', 'Bloqueada', 'Concluída'];

export const PRIO_CLS: Record<Prioridade, string> = { Baixa: '', Média: 'blue', Alta: 'warn', Urgente: 'red' };
export const STATUS_CLS: Record<StatusTarefa, string> = { 'A fazer': '', 'Em andamento': 'blue', Bloqueada: 'red', 'Concluída': 'ok' };

export type SituacaoPrazo = 'Sem prazo' | 'No prazo' | 'Vence em breve' | 'Atrasada' | 'Concluída no prazo' | 'Concluída com atraso';
export const SIT_CLS: Record<SituacaoPrazo, string> = {
  'Sem prazo': '',
  'No prazo': 'ok',
  'Vence em breve': 'warn',
  Atrasada: 'red',
  'Concluída no prazo': 'ok',
  'Concluída com atraso': 'warn',
};

/** Situação de prazo calculada automaticamente (campo da planilha da Letícia). */
export function situacaoPrazo(t: Pick<Tarefa, 'prazo' | 'status' | 'dataConclusao'>, hoje = today()): SituacaoPrazo {
  if (!t.prazo) return 'Sem prazo';
  if (t.status === 'Concluída') {
    const fim = t.dataConclusao || hoje;
    return fim <= t.prazo ? 'Concluída no prazo' : 'Concluída com atraso';
  }
  const d = diffDays(hoje, t.prazo);
  if (d < 0) return 'Atrasada';
  if (d <= 3) return 'Vence em breve';
  return 'No prazo';
}

/** Ordena códigos como 1, 1.2, 1.10, 2 (numérico por partes). */
export function cmpCodigo(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1;
    const y = pb[i] ?? -1;
    if (x !== y) return x - y;
  }
  return 0;
}
