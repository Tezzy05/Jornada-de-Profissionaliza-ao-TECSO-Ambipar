import { useMemo } from 'react';
import { useDB, type DB, type Session } from './db';
import { can } from '@/lib/permissions';
import type { ItemCrono, Usuario } from '@/lib/types';
import { naLinhaDe, nivel, pessoasDoItem, podeVer } from '@/lib/hierarquia';

// Regras de visibilidade: o técnico só enxerga os projetos aos quais está vinculado (e o que é dele);
// quem tem "projetos.todos" enxerga tudo, respeitando o filtro de tipo/projeto escolhido no topo.

export function useMe(): Usuario | null {
  const userId = useDB((s) => s.userId);
  const users = useDB((s) => s.users);
  return useMemo(() => users.find((u) => u.id === userId) ?? null, [users, userId]);
}

export function computeScope(s: DB & Session, me: Usuario | null) {
  const todos = can(me, 'projetos.todos');
  let projetos = todos ? s.projetos : s.projetos.filter((p) => me && p.tecnicos.includes(me.id));
  if (s.filtroTipo) projetos = projetos.filter((p) => p.tipo === s.filtroTipo);
  if (s.filtroProjeto) projetos = projetos.filter((p) => p.id === s.filtroProjeto);
  const projetoIds = new Set(projetos.map((p) => p.id));
  const filtrado = !!(s.filtroTipo || s.filtroProjeto);

  const coopIds = new Set<string>();
  projetos.forEach((p) => p.coops.forEach((c) => coopIds.add(c)));
  if (me && !todos && !filtrado) s.coops.filter((c) => c.tecnicoId === me.id).forEach((c) => coopIds.add(c.id));
  const coops = s.coops.filter((c) => coopIds.has(c.id));

  // pessoas que aparecem no cronograma: a própria linha e as de quem está abaixo na hierarquia
  const comItens = (u: Usuario) => s.crono.some((c) => naLinhaDe(c, u.id));
  let tecnicos = s.users.filter((u) => u.ativo && podeVer(me, u) && (u.perfil !== 'adm' || comItens(u)));
  if (filtrado) tecnicos = tecnicos.filter((u) => u.perfil !== 'tecnico' || u.id === me?.id || projetos.some((p) => p.tecnicos.includes(u.id)));
  tecnicos.sort((a, b) => nivel(b) - nivel(a) || a.nome.localeCompare(b.nome));
  const tecIds = new Set(tecnicos.map((t) => t.id));

  const cronoVisivel = (c: ItemCrono) => {
    if (!pessoasDoItem(c).some((p) => tecIds.has(p) && naLinhaDe(c, p))) return false;
    if (!filtrado) return true;
    return c.projetoId ? projetoIds.has(c.projetoId) : true;
  };
  const crono = s.crono.filter(cronoVisivel);

  const visitas = can(me, 'visitas.verTodas')
    ? s.visitas.filter((v) => projetoIds.has(v.projetoId))
    : s.visitas.filter((v) => v.tecnicoId === me?.id && (!filtrado || projetoIds.has(v.projetoId)));

  return { projetos, projetoIds, coops, coopIds, tecnicos, crono, visitas, filtrado, todos };
}

export function useScope() {
  const s = useDB();
  const me = useMe();
  return useMemo(() => computeScope(s, me), [s, me]);
}

export function userName(users: Usuario[], id?: string) {
  return users.find((u) => u.id === id)?.nome ?? '—';
}
