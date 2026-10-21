import { getDB, log, mut } from '@/store/db';
import { nowISO, today } from '@/lib/dates';
import { uid } from '@/lib/utils';
import { removeMedia } from '@/lib/media';
import type { Endereco, Visita } from '@/lib/types';
import { CENAS, emptyCena, emptyChk } from './dco';
import { integracaoStatus } from '@/features/aceleracao/logic';

/** Cria uma visita DCO em rascunho. Retorna o id ou uma mensagem de bloqueio. */
export function criarVisita(p: { coopId: string; tecnicoId: string; data?: string; endereco?: Endereco['tipo']; cronoId?: string; projetoId?: string }): { id: string } | { erro: string } {
  const db = getDB();
  const ig = integracaoStatus(db, p.coopId);
  const coop = db.coops.find((c) => c.id === p.coopId);
  if (!coop) return { erro: 'Cooperativa não encontrada.' };
  if (!ig.completa) return { erro: `A integração da ${coop.nome} ainda não terminou (${ig.feitos}/${ig.total}). Conclua o checklist de integração antes de iniciar a visita.` };
  const projetoId = p.projetoId ?? db.projetos.find((x) => x.tipo === 'aceleracao' && x.coops.includes(p.coopId))?.id ?? db.projetos.find((x) => x.coops.includes(p.coopId))?.id ?? '';
  // reaproveita a lista de cooperados da última visita ao grupo
  const anterior = [...db.visitas].filter((v) => v.coopId === p.coopId).sort((a, b) => b.data.localeCompare(a.data))[0];
  const id = 'v_' + uid();
  const decl: Visita['decl'] = { razao: coop.razaoSocial || coop.nome, cnpj: coop.cnpj || '', op: 'Organização de catadores', emRede: coop.rede === 'Sem rede' ? 'Não' : 'Sim', rede: coop.rede === 'Sem rede' ? '' : coop.rede, dataAfericao: p.data ?? today() };
  const v: Visita = {
    id, coopId: p.coopId, projetoId, tecnicoId: p.tecnicoId, data: p.data ?? today(), endereco: p.endereco ?? 'Matriz', cronoId: p.cronoId, status: 'rascunho',
    criadaEm: nowISO(), atualizadaEm: nowISO(),
    chk: emptyChk(), ph: CENAS.map(() => emptyCena()), eq: [],
    termos: (anterior?.termos ?? []).map((t) => ({ id: uid(), nome: t.nome, cpf: '', assinado: false })),
    decl, capAno: '', capDia: '',
    rel: { info: '', respNome: '', respCpf: '', tecCpf: '', saved: false },
    plano: { destinatario: `${coop.lideranca} · ${coop.contato}` },
    hist: [{ em: nowISO(), por: p.tecnicoId, acao: 'Visita iniciada' }],
  };
  mut((d) => {
    d.visitas.push(v);
    if (p.cronoId) {
      const c = d.crono.find((x) => x.id === p.cronoId);
      if (c) c.visitaId = id;
    }
  });
  log('visita', `Visita DCO iniciada: ${coop.nome}`, id);
  return { id };
}

/** Exclui um rascunho (só rascunhos podem ser excluídos) e devolve uma função para desfazer. */
export function excluirRascunho(id: string) {
  const db = getDB();
  const v = db.visitas.find((x) => x.id === id);
  if (!v || v.status !== 'rascunho') return null;
  const copia = JSON.parse(JSON.stringify(v)) as Visita;
  mut((d) => {
    d.visitas = d.visitas.filter((x) => x.id !== id);
    d.crono.forEach((c) => {
      if (c.visitaId === id) c.visitaId = undefined;
    });
  });
  log('visita', `Rascunho de visita excluído`, id);
  // as mídias só são apagadas de verdade se ninguém desfizer em alguns segundos
  const timer = setTimeout(() => {
    const ids: string[] = [];
    copia.ph.forEach((c) => [c.h, c.v, c.vid].forEach((s) => s && ids.push(s.id)));
    copia.eq.forEach((e) => e.foto && ids.push(e.foto.id));
    Object.values(copia.chk).forEach((c) => ids.push(...c.fotos));
    ids.forEach((m) => removeMedia(m));
  }, 7000);
  return () => {
    clearTimeout(timer);
    mut((d) => {
      d.visitas.push(copia);
      d.crono.forEach((c) => {
        if (c.id === copia.cronoId) c.visitaId = copia.id;
      });
    });
  };
}

export function updVisita(id: string, fn: (v: Visita) => void) {
  mut((d) => {
    const v = d.visitas.find((x) => x.id === id);
    if (!v) return;
    fn(v);
    v.atualizadaEm = nowISO();
  });
}
