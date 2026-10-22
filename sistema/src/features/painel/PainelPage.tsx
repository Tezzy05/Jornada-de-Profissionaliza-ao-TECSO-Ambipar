import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, ClipboardCheck, AlertTriangle, Users, Building2, ListTodo, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmtShort, mondayOf, today, weekDays, weekLabel, DN, parseISO } from '@/lib/dates';
import { cn, firstName, shortName } from '@/lib/utils';
import { Avatar, Bar } from '@/components/ui';
import { andamento, proximoItem, statusEfetivo } from '@/features/cronograma/logic';
import { naLinhaDe, pendentes, podeAprovar } from '@/lib/hierarquia';
import { STATUS_VISITA, visitaPct } from '@/features/visitas/dco';
import { integracaoStatus } from '@/features/aceleracao/logic';
import { resumoProjeto, respLabel } from '@/features/cidades/logic';
import { situacaoPrazo, SIT_CLS } from '@/features/cidades/constants';

function Ring({ v, label }: { v: number; label: string }) {
  const C = 2 * Math.PI * 50;
  return (
    <div className="relative w-[132px] h-[132px] flex-none">
      <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1d4a2a" strokeWidth="12" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#ccff00" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * v) / 100} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <b className="absolute inset-0 grid place-items-center text-[28px] font-extrabold font-display tnum">{v}%</b>
      <small className="absolute bottom-[30px] inset-x-0 text-center text-[11px] text-[#9fb6a3]">{label}</small>
    </div>
  );
}

function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('card', className)}>
      <div className="pad pb-3 flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold m-0">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function PainelPage() {
  const me = useMe()!;
  const db = useDB();
  const scope = useScope();
  const nav = useNavigate();
  const T = today();
  const dias = weekDays(mondayOf(T));
  const coopName = (id?: string) => db.coops.find((c) => c.id === id)?.nome ?? '';
  const gestor = can(me, 'crono.todos');

  const semana = scope.crono.filter((c) => c.data >= dias[0] && c.data <= dias[4]);
  const minhaSemana = semana.filter((c) => naLinhaDe(c, me.id));
  const and = andamento(gestor ? semana : minhaSemana);
  const nx = proximoItem(scope.crono.filter((c) => naLinhaDe(c, me.id)));
  const pedidos = db.crono.flatMap((c) => pendentes(c).filter((p) => { const u = db.users.find((x) => x.id === p); return u && podeAprovar(me, u); })).length;
  const rascunhos = scope.visitas.filter((v) => v.tecnicoId === me.id && (v.status === 'rascunho' || v.status === 'devolvida')).sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));
  const aprovar = can(me, 'visitas.aprovar') ? scope.visitas.filter((v) => v.status === 'enviada') : [];

  // integrações pendentes: técnico vê as cooperativas dele; coordenação vê todas do escopo
  const integPend = scope.coops
    .filter((c) => (gestor ? true : c.tecnicoId === me.id))
    .map((c) => ({ c, ig: integracaoStatus(db, c.id) }))
    .filter((x) => x.ig.aplica && !x.ig.completa);

  const minhasDemandas = db.tarefas
    .filter((t) => t.responsavel === 'u:' + me.id && t.status !== 'Concluída' && scope.projetoIds.has(t.projetoId))
    .sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
  const projCidades = scope.projetos.filter((p) => p.tipo === 'cidades');
  const atrasadasCidades = db.tarefas.filter((t) => scope.projetoIds.has(t.projetoId) && situacaoPrazo(t) === 'Atrasada');

  // fluxo das visitas (kanban)
  const visitasDCO = scope.crono.filter((c) => c.tipo === 'Visita DCO' && !c.visitaId && !['Concluído', 'Cancelado', 'Reagendado'].includes(c.status));
  const cols: { t: string; items: { k: string; titulo: string; sub: string; tag: ReactNode; go: () => void }[] }[] = [
    { t: 'Planejada', items: visitasDCO.filter((c) => c.status === 'Planejado').map((c) => ({ k: c.id, titulo: coopName(c.coopId), sub: shortName(db.users.find((u) => u.id === c.tecnicoId)?.nome ?? ''), tag: <span className="tag">{fmtShort(c.data)}</span>, go: () => nav('/cronograma') })) },
    { t: 'Agendada', items: visitasDCO.filter((c) => c.status === 'Confirmado').map((c) => ({ k: c.id, titulo: coopName(c.coopId), sub: shortName(db.users.find((u) => u.id === c.tecnicoId)?.nome ?? ''), tag: <span className="tag blue">{fmtShort(c.data)} · {c.ini}</span>, go: () => nav('/cronograma') })) },
    ...(['rascunho', 'devolvida', 'enviada', 'aprovada'] as const).map((st) => ({
      t: { rascunho: 'Em campo', devolvida: 'Devolvida', enviada: 'Aguardando aprovação', aprovada: 'Aprovada' }[st],
      items: scope.visitas.filter((v) => v.status === st).map((v) => ({
        k: v.id,
        titulo: coopName(v.coopId),
        sub: shortName(db.users.find((u) => u.id === v.tecnicoId)?.nome ?? ''),
        tag: <span className={`tag ${STATUS_VISITA[v.status].cls}`}>{st === 'rascunho' ? `${visitaPct(v)}% preenchido` : fmtShort(v.data)}</span>,
        go: () => nav(`/visitas/${v.id}`),
      })),
    })),
  ];

  return (
    <div className="grid gap-4">
      <div className="hero flex justify-between gap-6 items-center flex-wrap">
        <div className="min-w-0 max-w-[620px]">
          <span className="tag dark">{gestor ? (scope.filtrado ? 'Filtro ativo' : 'Todos os projetos') : `${scope.projetos.length} projeto${scope.projetos.length === 1 ? '' : 's'} vinculado${scope.projetos.length === 1 ? '' : 's'}`}</span>
          <h2 className="mt-3">
            Olá, {firstName(me.nome)}. {gestor ? <>Esta é a <em>semana {weekLabel(dias[0])}</em> da operação TECSO.</> : nx ? <>Seu próximo item é <em>{coopName(nx.item.coopId) || nx.item.tipo}</em>.</> : <>Sua agenda desta semana está <em>em dia</em>.</>}
          </h2>
          <p className="mt-2">
            {gestor
              ? `${semana.length} itens no cronograma, ${aprovar.length} visita${aprovar.length === 1 ? '' : 's'} aguardando aprovação e ${integPend.length} integraç${integPend.length === 1 ? 'ão pendente' : 'ões pendentes'}.`
              : nx
                ? `${nx.agora ? 'Acontecendo agora' : `${nx.item.data === T ? 'Hoje' : `${DN[(parseISO(nx.item.data).getDay() + 6) % 7]} ${fmtShort(nx.item.data)}`} às ${nx.item.ini}`} · ${nx.item.tipo}${nx.item.obs ? ` · ${nx.item.obs}` : ''}`
                : 'Nenhum item futuro no cronograma.'}
          </p>
          <div className="flex gap-2.5 mt-4 flex-wrap">
            {rascunhos[0] && (
              <button className="btn pri" onClick={() => nav(`/visitas/${rascunhos[0].id}`)}>Continuar visita {coopName(rascunhos[0].coopId)} <ArrowRight /></button>
            )}
            {aprovar[0] && (
              <button className="btn pri" onClick={() => nav('/visitas?aba=aprovar')}>Revisar visitas enviadas ({aprovar.length}) <ArrowRight /></button>
            )}
            {pedidos > 0 && (
              <button className="btn pri" onClick={() => nav('/cronograma')}>Aprovar eventos ({pedidos}) <ArrowRight /></button>
            )}
            <button className="btn" style={{ color: '#fff', border: '1.5px solid #2f5a3a' }} onClick={() => nav('/cronograma')}><CalendarDays /> Ver cronograma</button>
          </div>
        </div>
        <Ring v={and.pct} label="da semana" />
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <div className="card kpi"><span>{gestor ? 'Itens no cronograma da semana' : 'Meus itens na semana'}</span><b>{gestor ? semana.length : minhaSemana.length}</b><Bar v={and.pct} /><small className="muted">{and.feitos} concluídos</small></div>
        <div className="card kpi"><span>{gestor ? 'Visitas aguardando aprovação' : 'Visitas em aberto'}</span><b>{gestor ? aprovar.length : rascunhos.length}</b><small className="muted">{gestor ? 'Enviadas pelos técnicos' : 'Rascunhos e devolvidas'}</small></div>
        <div className="card kpi"><span>Integrações pendentes</span><b style={{ color: integPend.length ? 'var(--warn)' : undefined }}>{integPend.length}</b><small className="muted">Cooperativas com checklist incompleto</small></div>
        <div className="card kpi"><span>{gestor ? 'Demandas atrasadas (Cidades Circular)' : 'Minhas demandas abertas'}</span><b style={{ color: gestor && atrasadasCidades.length ? 'var(--danger)' : undefined }}>{gestor ? atrasadasCidades.length : minhasDemandas.length}</b><small className="muted">{gestor ? `${projCidades.length} projetos ativos` : `${minhasDemandas.filter((t) => situacaoPrazo(t) === 'Atrasada').length} atrasadas`}</small></div>
      </div>

      {integPend.length > 0 && can(me, 'aceleracao.ver') && (
        <Section title={<span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[var(--warn)]" /> Checklist de integração pendente</span>}>
          <div className="tbl-wrap">
            <table>
              <tbody>
                {integPend.map(({ c, ig }) => (
                  <tr key={c.id} className="clickable" onClick={() => nav(`/aceleracao/${c.id}`)}>
                    <td><b>{c.nome}</b><div className="muted text-[12px]">{c.cidade}/{c.uf} · técnico: {db.users.find((u) => u.id === c.tecnicoId)?.nome}</div></td>
                    <td style={{ minWidth: 200 }}><Bar v={(ig.feitos / ig.total) * 100} /><small className="muted tnum">{ig.feitos} de {ig.total} itens</small></td>
                    <td className="text-right"><span className="btn ghost sm">Completar checklist <ArrowRight /></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {gestor ? (
          <Section title="Andamento da Semana por pessoa" action={<button className="btn link" onClick={() => nav('/cronograma')}>Abrir cronograma</button>}>
            <div className="tbl-wrap">
              <table>
                <tbody>
                  {scope.tecnicos.map((t) => {
                    const ev = semana.filter((c) => naLinhaDe(c, t.id));
                    const a = andamento(ev);
                    const n = proximoItem(scope.crono.filter((c) => naLinhaDe(c, t.id)));
                    const atr = ev.filter((c) => statusEfetivo(c) === 'Atrasado').length;
                    return (
                      <tr key={t.id}>
                        <td><div className="tc"><Avatar u={t} size="sm" />{t.nome}</div></td>
                        <td className="muted text-[12.5px]">{n ? (n.agora ? 'Agora: ' : `${fmtShort(n.item.data)} ${n.item.ini} · `) + (coopName(n.item.coopId) || n.item.tipo) : 'Nada agendado'}</td>
                        <td style={{ minWidth: 150 }}><div className="flex items-center gap-2"><div className="flex-1"><Bar v={a.pct} /></div><b className="tnum text-[12.5px]">{a.pct}%</b></div>{atr > 0 && <span className="tag red mt-1">{atr} atrasado{atr > 1 ? 's' : ''}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        ) : (
          <Section title={<span className="flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Minhas visitas em aberto</span>} action={<button className="btn link" onClick={() => nav('/visitas')}>Ver todas</button>}>
            {rascunhos.length ? (
              <div className="tbl-wrap">
                <table>
                  <tbody>
                    {rascunhos.map((v) => (
                      <tr key={v.id} className="clickable" onClick={() => nav(`/visitas/${v.id}`)}>
                        <td><b>{coopName(v.coopId)}</b><div className="muted text-[12px]">Visita de {fmtShort(v.data)} · {v.endereco}</div></td>
                        <td><span className={`tag ${STATUS_VISITA[v.status].cls}`}>{STATUS_VISITA[v.status].t}</span></td>
                        <td style={{ minWidth: 140 }}><Bar v={visitaPct(v)} /><small className="muted tnum">{visitaPct(v)}% preenchido</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="pad pt-0 muted">Nenhuma visita em aberto.</p>
            )}
          </Section>
        )}

        {gestor ? (
          <Section title={<span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Cidades Circular</span>} action={<button className="btn link" onClick={() => nav('/cidades')}>Ver projetos</button>}>
            <div className="grid gap-3 px-5 pb-5">
              {projCidades.length === 0 && <p className="muted">Nenhum projeto no filtro atual.</p>}
              {projCidades.map((p) => {
                const r = resumoProjeto(db, p);
                return (
                  <button key={p.id} className="panel p-3.5 text-left hover:border-[var(--leaf)] transition" onClick={() => nav(`/cidades/${p.id}`)}>
                    <div className="flex justify-between gap-2 items-start">
                      <b className="font-display text-[13.5px]">{p.nome}</b>
                      <b className="tnum">{r.pct}%</b>
                    </div>
                    <div className="my-2"><Bar v={r.pct} /></div>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="tag">{r.feitas}/{r.total} demandas</span>
                      {r.atrasadas > 0 && <span className="tag red">{r.atrasadas} atrasada{r.atrasadas > 1 ? 's' : ''}</span>}
                      {r.breve > 0 && <span className="tag warn">{r.breve} vence{r.breve > 1 ? 'm' : ''} em breve</span>}
                      {r.bloqueadas > 0 && <span className="tag red">{r.bloqueadas} bloqueada{r.bloqueadas > 1 ? 's' : ''}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
        ) : (
          <Section title={<span className="flex items-center gap-2"><ListTodo className="w-4 h-4" /> Minhas demandas (Cidades Circular)</span>} action={<button className="btn link" onClick={() => nav('/demandas')}>Ver todas</button>}>
            {minhasDemandas.length ? (
              <div className="tbl-wrap">
                <table>
                  <tbody>
                    {minhasDemandas.slice(0, 5).map((t) => {
                      const s = situacaoPrazo(t);
                      return (
                        <tr key={t.id} className="clickable" onClick={() => nav(`/cidades/${t.projetoId}?t=${t.id}`)}>
                          <td><b className="text-[13px]">{t.demanda}</b><div className="muted text-[12px]">{db.projetos.find((p) => p.id === t.projetoId)?.nome} · {t.codigo}</div></td>
                          <td className="text-right whitespace-nowrap"><span className={`tag ${SIT_CLS[s]}`}>{s}</span><div className="muted text-[11.5px] mt-1 tnum">Prazo {fmtShort(t.prazo)}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="pad pt-0 muted flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[var(--ok)]" /> Nenhuma demanda em aberto com você.</p>
            )}
          </Section>
        )}
      </div>

      {gestor && atrasadasCidades.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[var(--danger)]" /> Demandas atrasadas</span>}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>ID</th><th>Demanda</th><th>Projeto</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
              <tbody>
                {atrasadasCidades.map((t) => {
                  const p = db.projetos.find((x) => x.id === t.projetoId)!;
                  const r = respLabel(db, t.responsavel, t.projetoId);
                  return (
                    <tr key={t.id} className="clickable" onClick={() => nav(`/cidades/${t.projetoId}?t=${t.id}`)}>
                      <td className="tnum muted">{p.sigla}-{t.codigo}</td>
                      <td><b className="text-[13px]">{t.demanda}</b></td>
                      <td className="muted">{p.nome}</td>
                      <td>{r.nome}{r.externo && <span className="tag violet ml-1">{r.tipo}</span>}</td>
                      <td className="tnum">{fmtShort(t.prazo)}</td>
                      <td><span className="tag red">{t.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title={<span className="flex items-center gap-2"><Users className="w-4 h-4" /> Fluxo das visitas DCO</span>}>
        <div className="px-5 pb-5">
          <div className="pipe">
            {cols.map((c) => (
              <div key={c.t} className="col">
                <h4>{c.t} <span className="tnum">{c.items.length}</span></h4>
                {c.items.map((i) => (
                  <button key={i.k} className="vcard" onClick={i.go}>
                    <b>{i.titulo}</b>
                    <small>Técnico: {i.sub}</small>
                    {i.tag}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
