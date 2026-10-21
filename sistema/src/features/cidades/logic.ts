import type { DB } from '@/store/db';
import type { Projeto, Tarefa } from '@/lib/types';
import { situacaoPrazo } from './constants';

/** Progresso: demandas concluídas ÷ total (subtarefas e itens contam igualmente). */
export function progresso(ts: Tarefa[]) {
  const total = ts.length;
  const feitas = ts.filter((t) => t.status === 'Concluída').length;
  return { feitas, total, pct: total ? Math.round((feitas / total) * 100) : 0 };
}

export function resumoProjeto(db: Pick<DB, 'tarefas'>, p: Projeto) {
  const ts = db.tarefas.filter((t) => t.projetoId === p.id);
  const prog = progresso(ts);
  const atrasadas = ts.filter((t) => situacaoPrazo(t) === 'Atrasada').length;
  const breve = ts.filter((t) => situacaoPrazo(t) === 'Vence em breve').length;
  const bloqueadas = ts.filter((t) => t.status === 'Bloqueada').length;
  return { ...prog, atrasadas, breve, bloqueadas, ts };
}

export function respLabel(db: Pick<DB, 'users' | 'projetos'>, resp: string, projetoId?: string) {
  if (resp.startsWith('u:')) {
    const u = db.users.find((x) => x.id === resp.slice(2));
    return { nome: u?.nome ?? '—', tipo: u ? (u.perfil === 'tecnico' ? 'Time técnico' : u.perfil === 'gestao' ? 'Diretoria' : 'Coordenação') : '', externo: false, contato: u?.email ?? '' };
  }
  if (resp.startsWith('a:')) {
    const id = resp.slice(2);
    const ps = projetoId ? db.projetos.filter((p) => p.id === projetoId) : db.projetos;
    for (const p of ps) {
      const a = p.agentes.find((x) => x.id === id);
      if (a) return { nome: a.nome, tipo: a.tipo, externo: true, contato: a.contato, org: a.organizacao };
    }
  }
  return { nome: 'Sem responsável', tipo: '', externo: false, contato: '' };
}

/** Quem pode atualizar uma demanda: gestão do projeto, ou o próprio responsável interno. Externos: a coordenação atualiza por eles. */
export function podeAtualizar(meId: string, perms: string[], t: Tarefa) {
  if (perms.includes('cidades.gerir')) return true;
  return perms.includes('cidades.atualizarProprias') && t.responsavel === 'u:' + meId;
}
