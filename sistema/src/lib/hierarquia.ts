import type { ItemCrono, PerfilBase, Usuario } from './types';

// Hierarquia do cronograma: Técnico < Coordenação < Diretoria, e o ADM acima de todos.
// O nível vem do perfil-base: quando o ADM promove alguém, as regras mudam junto.

export const NIVEL: Record<PerfilBase, number> = { tecnico: 1, coord: 2, gestao: 3, adm: 4 };
export const NOME_NIVEL: Record<PerfilBase, string> = { tecnico: 'Técnico', coord: 'Coordenação', gestao: 'Diretoria', adm: 'ADM' };

export const nivel = (u?: Pick<Usuario, 'perfil'> | null) => (u ? NIVEL[u.perfil] : 0);
const ehAdm = (u?: Pick<Usuario, 'perfil'> | null) => u?.perfil === 'adm';

/** Vê o cronograma de outra pessoa: a própria linha e as de quem está abaixo. */
export function podeVer(me: Usuario | null, alvo: Pick<Usuario, 'id' | 'perfil'>) {
  if (!me) return false;
  return ehAdm(me) || me.id === alvo.id || nivel(alvo) < nivel(me);
}

export type ModoInclusao = 'direto' | 'pedido' | 'bloqueado';

/**
 * Incluir um item no cronograma de alguém (ou como participante):
 * - no próprio, ou de quem está abaixo: direto;
 * - de alguém do mesmo nível ou de um nível acima: pedido de aprovação;
 * - dois níveis acima (técnico → Diretoria): não pode.
 */
export function modoInclusao(me: Usuario, alvo: Pick<Usuario, 'id' | 'perfil'>): ModoInclusao {
  if (ehAdm(me) || me.id === alvo.id || nivel(alvo) < nivel(me)) return 'direto';
  if (nivel(alvo) <= nivel(me) + 1) return 'pedido';
  return 'bloqueado';
}

/** Aprova ou recusa pela pessoa incluída: ela mesma ou qualquer um acima dela. */
export function podeAprovar(me: Usuario | null, pessoa: Pick<Usuario, 'id' | 'perfil'>) {
  if (!me) return false;
  return ehAdm(me) || me.id === pessoa.id || nivel(me) > nivel(pessoa);
}

/** Todas as pessoas do item: responsável primeiro, depois os participantes. */
export const pessoasDoItem = (c: ItemCrono) => [c.tecnicoId, ...(c.participantes ?? []).filter((p) => p !== c.tecnicoId)];

/** Situação da pessoa no item (sem registro = aprovado). */
export const situacao = (c: ItemCrono, uid: string) => c.aprov?.[uid]?.st ?? 'aprovado';

/** O item aparece na linha da pessoa? Só se ela está nele e aprovou (ou foi incluída direto). */
export const naLinhaDe = (c: ItemCrono, uid: string) => pessoasDoItem(c).includes(uid) && situacao(c, uid) === 'aprovado';

export const pendentes = (c: ItemCrono) => pessoasDoItem(c).filter((p) => situacao(c, p) === 'pendente');
export const recusados = (c: ItemCrono) => pessoasDoItem(c).filter((p) => situacao(c, p) === 'recusado');

/** Pedido "entre técnicos": criado por um técnico para outro técnico. */
export const entreTecnicos = (c: ItemCrono, users: Usuario[], uid: string) => {
  const criador = users.find((u) => u.id === c.criadoPor);
  const alvo = users.find((u) => u.id === uid);
  return criador?.perfil === 'tecnico' && alvo?.perfil === 'tecnico';
};
