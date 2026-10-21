import type { DB } from '@/store/db';
import { INTEGRACAO_ITENS } from './constants';

/** A cooperativa participa do Programa de Aceleração? */
export const naAceleracao = (db: Pick<DB, 'projetos'>, coopId: string) =>
  db.projetos.some((p) => p.tipo === 'aceleracao' && p.coops.includes(coopId));

export function integracaoStatus(db: Pick<DB, 'integracoes' | 'projetos'>, coopId: string) {
  if (!naAceleracao(db, coopId)) return { aplica: false, feitos: 0, total: 0, completa: true };
  const r = db.integracoes.find((i) => i.coopId === coopId);
  const feitos = INTEGRACAO_ITENS.filter((it) => r?.itens[it.k]?.ok).length;
  return { aplica: true, feitos, total: INTEGRACAO_ITENS.length, completa: feitos === INTEGRACAO_ITENS.length };
}

export type EtapaInfo = { estado: 'ok' | 'cur' | 'todo' | 'lock'; resumo: string };

/** Situação de cada etapa do programa para uma cooperativa. */
export function etapas(db: DB, coopId: string): EtapaInfo[] {
  const ig = integracaoStatus(db, coopId);
  const ment = db.mentorias.filter((m) => m.coopId === coopId);
  const vis = db.visitas.filter((v) => v.coopId === coopId);
  const aprov = vis.find((v) => v.status === 'aprovada');
  const atend = db.atendimentos.filter((a) => a.coopId === coopId);
  const caps = db.capacitacoes.filter((c) => c.coops.includes(coopId));
  const presentes = caps.filter((c) => c.status === 'Realizada' && (c.presencas[coopId] ?? 0) > 0).length;
  const lock = !ig.completa;
  return [
    { estado: ig.completa ? 'ok' : 'cur', resumo: `${ig.feitos}/${ig.total} itens` },
    { estado: lock ? 'lock' : ment.length ? 'ok' : 'cur', resumo: ment.length ? `${ment.length} mentoria${ment.length > 1 ? 's' : ''}` : 'Sem mentoria' },
    {
      estado: lock ? 'lock' : aprov ? 'ok' : vis.length ? 'cur' : 'todo',
      resumo: aprov ? 'Visita aprovada' : vis.some((v) => v.status === 'enviada') ? 'Aguardando aprovação' : vis.length ? 'Em preenchimento' : 'Não iniciado',
    },
    { estado: lock ? 'lock' : atend.length ? 'cur' : 'todo', resumo: `${atend.length} atendimento${atend.length === 1 ? '' : 's'}` },
    { estado: lock ? 'lock' : presentes ? 'cur' : 'todo', resumo: `${presentes} de ${caps.filter((c) => c.status === 'Realizada').length} capacitações` },
  ];
}
