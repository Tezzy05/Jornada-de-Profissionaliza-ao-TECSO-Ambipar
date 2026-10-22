import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as DM from '@radix-ui/react-dropdown-menu';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, CalendarDays, ClipboardCheck, ListTodo, Rocket, GraduationCap, Building2, Users, History, ShieldCheck, Network,
  LogOut, RotateCcw, Menu, X, Wifi, WifiOff, ChevronDown, Filter,
} from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can, PERFIS } from '@/lib/permissions';
import type { PermKey } from '@/lib/types';
import { AmbiparIcon } from '@/components/brand/Brand';
import { Avatar, confirmar, toast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { mondayOf, today, weekLabel } from '@/lib/dates';
import { pendentes, podeAprovar } from '@/lib/hierarquia';

interface NavItem { to: string; label: string; icon: ReactNode; show: (has: (k: PermKey) => boolean) => boolean; count?: number }

export default function Shell() {
  const me = useMe()!;
  const has = (k: PermKey) => can(me, k);
  const scope = useScope();
  const projetosTodos = useDB((s) => s.projetos);
  const tarefas = useDB((s) => s.tarefas);
  const filtroTipo = useDB((s) => s.filtroTipo);
  const filtroProjeto = useDB((s) => s.filtroProjeto);
  const online = useDB((s) => s.config.online);
  const mut = useDB((s) => s.mut);
  const logout = useDB((s) => s.logout);
  const resetDemo = useDB((s) => s.resetDemo);
  const nav = useNavigate();
  const loc = useLocation();
  const seededAt = useDB((s) => s.seededAt);
  const seedAntigo = mondayOf(seededAt.slice(0, 10)) < mondayOf(today());
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [loc.pathname]);

  const rascunhos = scope.visitas.filter((v) => v.tecnicoId === me.id && (v.status === 'rascunho' || v.status === 'devolvida')).length;
  const aAprovar = has('visitas.aprovar') ? scope.visitas.filter((v) => v.status === 'enviada').length : 0;
  const crono = useDB((s) => s.crono);
  const users = useDB((s) => s.users);
  const pedidos = crono.flatMap((c) => pendentes(c).filter((p) => { const u = users.find((x) => x.id === p); return u && podeAprovar(me, u); })).length;
  const minhas = tarefas.filter((t) => t.responsavel === 'u:' + me.id && t.status !== 'Concluída').length;

  const groups: { lbl: string; items: NavItem[] }[] = [
    {
      lbl: 'Operação',
      items: [
        { to: '/painel', label: 'Painel', icon: <LayoutDashboard />, show: (h) => h('painel.ver') },
        { to: '/cronograma', label: 'Cronograma de campo', icon: <CalendarDays />, show: (h) => h('crono.proprio') || h('crono.todos'), count: pedidos },
        { to: '/visitas', label: has('visitas.preencher') && !has('visitas.verTodas') ? 'Minhas visitas DCO' : 'Visitas DCO', icon: <ClipboardCheck />, show: (h) => h('visitas.preencher') || h('visitas.verTodas'), count: rascunhos + aAprovar },
        { to: '/demandas', label: 'Minhas demandas', icon: <ListTodo />, show: (h) => h('cidades.atualizarProprias'), count: minhas },
      ],
    },
    {
      lbl: 'Programas',
      items: [
        { to: '/aceleracao', label: 'Programa de Aceleração', icon: <Rocket />, show: (h) => h('aceleracao.ver') },
        { to: '/capacitacoes', label: 'Capacitações online', icon: <GraduationCap />, show: (h) => h('aceleracao.ver') },
        { to: '/cidades', label: 'Cidades Circular', icon: <Building2 />, show: (h) => h('cidades.ver') },
      ],
    },
    {
      lbl: 'Cooperativas',
      items: [
        { to: '/grupos', label: 'Grupos parceiros', icon: <Users />, show: () => true },
        { to: '/historico', label: 'Histórico da cooperativa', icon: <History />, show: (h) => h('coop.historico') },
      ],
    },
    {
      lbl: 'Sistema',
      items: [
        { to: '/usuarios', label: 'Usuários e acessos', icon: <ShieldCheck />, show: (h) => h('usuarios.gerir') },
        { to: '/integracao', label: 'Integração e roadmap', icon: <Network />, show: (h) => h('sistema.integracao') },
      ],
    },
  ];

  // projetos que o usuário pode escolher no filtro
  const meusProjetos = useMemo(
    () => (has('projetos.todos') ? projetosTodos : projetosTodos.filter((p) => p.tecnicos.includes(me.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projetosTodos, me],
  );
  const opcoesProjeto = meusProjetos.filter((p) => !filtroTipo || p.tipo === filtroTipo);
  const tipos = [...new Set(meusProjetos.map((p) => p.tipo))];

  const sidebar = (
    <nav className="side" aria-label="Menu principal">
      {groups.map((g) => {
        const items = g.items.filter((i) => i.show(has));
        if (!items.length) return null;
        return (
          <div key={g.lbl} className="grid gap-1">
            <div className="side-lbl">{g.lbl}</div>
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} className={({ isActive }) => cn('nav', isActive && 'on')}>
                {i.icon}
                <span>{i.label}</span>
                {!!i.count && <em className="cnt">{i.count}</em>}
              </NavLink>
            ))}
          </div>
        );
      })}
      <div className="side-foot">
        <b>{PERFIS[me.perfil].nome}</b>
        {scope.todos ? 'Vê todos os projetos' : `${meusProjetos.length} projeto${meusProjetos.length === 1 ? '' : 's'} vinculado${meusProjetos.length === 1 ? '' : 's'}`}
      </div>
    </nav>
  );

  return (
    <div className="app">
      <header className="top">
        <button className="icon-btn !text-white lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menu"><Menu /></button>
        <button className="brand" onClick={() => nav('/painel')}>
          <AmbiparIcon />
          <span className="brand-txt text-left leading-tight">
            Jornada de Profissionalização
            <small>TECSO · Ambipar</small>
          </span>
        </button>

        {meusProjetos.length >= 1 && (
          <div className="filtro">
            <Filter className="w-4 h-4 text-[#9fb6a3] flex-none" />
            {tipos.length > 1 && (
              <select
                id="filtro-tipo"
                aria-label="Tipo de projeto"
                value={filtroTipo}
                onChange={(e) => mut((d) => { d.filtroTipo = e.target.value as typeof filtroTipo; d.filtroProjeto = ''; })}
              >
                <option value="">Todos os tipos</option>
                <option value="aceleracao">Programa de Aceleração</option>
                <option value="cidades">Cidades Circular</option>
              </select>
            )}
            <select id="filtro-projeto" aria-label="Projeto" value={filtroProjeto} onChange={(e) => mut((d) => { d.filtroProjeto = e.target.value; })}>
              <option value="">{filtroTipo ? 'Todos deste tipo' : scope.todos ? 'Todos os projetos' : 'Todos os meus projetos'}</option>
              {opcoesProjeto.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        <button
          className={cn('sync', !online && 'off')}
          onClick={() => {
            mut((d) => { d.config.online = !d.config.online; });
            toast(online ? 'Modo offline: tudo fica salvo no dispositivo até voltar o sinal' : 'Conexão restabelecida: registros enviados ao servidor');
          }}
          title="Simular a perda de sinal em campo"
        >
          {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{online ? 'Sincronizado' : 'Offline · salvo no aparelho'}</span>
        </button>
        <DM.Root>
          <DM.Trigger className="user-btn" aria-label="Menu do usuário">
            <Avatar u={me} />
            <span className="hidden md:block text-left leading-tight">
              <b className="block text-[13px]">{me.nome}</b>
              <small className="text-[11px] text-[#9fb6a3]">{me.cargo}</small>
            </span>
            <ChevronDown className="w-4 h-4 text-[#9fb6a3] hidden md:block" />
          </DM.Trigger>
          <DM.Portal>
            <DM.Content className="menu" align="end" sideOffset={8}>
              <div className="px-3 py-2">
                <b className="block">{me.nome}</b>
                <small className="muted">{me.email}</small>
                <div className="mt-1"><span className="tag dark">{PERFIS[me.perfil].nome}</span></div>
              </div>
              <DM.Separator className="h-px bg-[var(--line)] my-1" />
              {has('usuarios.gerir') && (
                <DM.Item
                  className="menu-item"
                  onSelect={async () => {
                    const ok = await confirmar('Restaurar a demonstração', 'Todos os dados voltam ao exemplo original, com datas recalculadas para a semana atual. O que foi cadastrado no protótipo será apagado.', 'Restaurar', true);
                    if (ok) {
                      await resetDemo();
                      toast('Demonstração restaurada para a semana atual');
                      nav('/painel');
                    }
                  }}
                >
                  <RotateCcw /> Restaurar demonstração
                </DM.Item>
              )}
              <DM.Item className="menu-item" onSelect={() => { logout(); nav('/'); }}>
                <LogOut /> Sair e trocar de usuário
              </DM.Item>
            </DM.Content>
          </DM.Portal>
        </DM.Root>
      </header>

      <div className="shell">
        <div className="side-wrap hidden lg:block">{sidebar}</div>
        {menu && (
          <div className="lg:hidden">
            <div className="overlay" onClick={() => setMenu(false)} />
            <div className="side-mobile">
              <button className="icon-btn absolute right-3 top-3" onClick={() => setMenu(false)} aria-label="Fechar menu"><X /></button>
              {sidebar}
            </div>
          </div>
        )}
        <main className="main">
          {seedAntigo && (
            <div className="alert mb-4 flex items-center justify-between gap-3 flex-wrap">
              <span>Os dados de exemplo foram gerados na semana de {weekLabel(mondayOf(seededAt.slice(0, 10)))}. Atualize para que o cronograma e os prazos acompanhem a semana atual.</span>
              <button
                className="btn dark sm"
                onClick={async () => {
                  await resetDemo();
                  toast('Demonstração atualizada para a semana atual');
                }}
              >
                <RotateCcw /> Atualizar para esta semana
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
