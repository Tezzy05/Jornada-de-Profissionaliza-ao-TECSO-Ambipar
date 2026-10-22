import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Flag, Users, FilterX, Inbox, Clock } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { addDays, DN, fmtDateTime, fmtShort, monthTitle, mondayOf, parseISO, iso, today, weekDays, weekLabel } from '@/lib/dates';
import { cn, shortName } from '@/lib/utils';
import type { ItemCrono, Usuario } from '@/lib/types';
import { naLinhaDe, NOME_NIVEL, nivel, pendentes, pessoasDoItem, podeAprovar, entreTecnicos, situacao } from '@/lib/hierarquia';
import { Avatar, Bar, PageHead, Seg } from '@/components/ui';
import { andamento, evCls, proximoItem, statusEfetivo, stTag } from './logic';
import CronoItemDrawer from './CronoItemDrawer';
import NovoItemModal from './NovoItemModal';
import { BotoesAprovacao } from './aprovacao';

type Filtro = '' | 'concluidos' | 'reagendados' | 'atrasados' | 'solicitados';

export default function CronogramaPage() {
  const me = useMe()!;
  const scope = useScope();
  const db = useDB();
  const { coops, tarefas, users } = db;
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [monday, setMonday] = useState(mondayOf(today()));
  const [day, setDay] = useState(today());
  const [tec, setTec] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('');
  const [abaPend, setAbaPend] = useState<'todos' | 'mim' | 'tecnicos'>('todos');
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ data?: string; tecnicoId?: string } | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const podeIncluir = can(me, 'crono.proprio') || can(me, 'crono.editarTodos');
  const pessoas = scope.tecnicos.filter((t) => !tec || t.id === tec);
  const pessoaIds = new Set(pessoas.map((t) => t.id));
  const items = scope.crono.filter((c) => pessoasDoItem(c).some((p) => pessoaIds.has(p) && naLinhaDe(c, p)));
  const dias = weekDays(monday);
  const naSemana = (c: ItemCrono) => c.data >= dias[0] && c.data <= dias[4];
  const semana = items.filter(naSemana);
  const T = today();
  const coopName = (id?: string) => coops.find((c) => c.id === id)?.nome;
  const nome = (id?: string) => users.find((u) => u.id === id)?.nome ?? '';

  useEffect(() => {
    if (!dias.includes(day)) setDay(dias.includes(T) ? T : dias[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday]);

  // filtro dos indicadores
  const passa = (c: ItemCrono) =>
    filtro === 'concluidos' ? c.status === 'Concluído' : filtro === 'reagendados' ? c.status === 'Reagendado' : filtro === 'atrasados' ? statusEfetivo(c, now) === 'Atrasado' : true;
  const daLinha = (t: Usuario, lista: ItemCrono[]) => lista.filter((c) => naLinhaDe(c, t.id) && passa(c));

  // meus pedidos que ainda não entraram (pendentes ou recusados)
  const solicitados = db.crono.filter((c) => c.criadoPor === me.id && pessoasDoItem(c).some((p) => p !== me.id && situacao(c, p) !== 'aprovado'));
  const solicitadosSemana = solicitados.filter(naSemana);

  // pedidos que eu posso aprovar
  const paraAprovar = db.crono.flatMap((c) =>
    pendentes(c)
      .map((p) => ({ c, p, u: users.find((x) => x.id === p)! }))
      .filter(({ u }) => u && podeAprovar(me, u)),
  );
  const pendMim = paraAprovar.filter((x) => x.p === me.id);
  const pendTec = paraAprovar.filter((x) => entreTecnicos(x.c, users, x.p));
  const listaPend = abaPend === 'mim' ? pendMim : abaPend === 'tecnicos' ? pendTec : paraAprovar;

  const prazos = useMemo(
    () => tarefas.filter((t) => t.prazo && t.status !== 'Concluída' && t.responsavel.startsWith('u:') && pessoaIds.has(t.responsavel.slice(2))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tarefas, pessoas.length, tec],
  );

  const ev = (c: ItemCrono, t: Usuario) => {
    const st = statusEfetivo(c, now);
    const titulo = coopName(c.coopId) ?? c.tipo;
    const n = pessoasDoItem(c).length;
    return (
      <button key={c.id} className={cn('ev', evCls(st))} onClick={() => setAberto(c.id)}>
        <b className="tnum">{c.ini}–{c.fim} · {titulo}</b>
        {coopName(c.coopId) ? c.tipo + ' · ' : ''}
        {st}
        {c.obs && <span className="block muted">{c.obs}</span>}
        {(n > 1 || c.tecnicoId !== t.id) && (
          <span className="flex items-center gap-1 mt-0.5 text-[10.5px] font-semibold text-[#3d5a3a]">
            <Users className="w-3 h-3" /> {c.tecnicoId !== t.id ? `Participante · de ${nome(c.tecnicoId).split(' ')[0]}` : `${n} pessoas`}
          </span>
        )}
        {pendentes(c).length > 0 && (
          <span className="flex items-center gap-1 mt-0.5 text-[10.5px] font-semibold text-[#1f5f86]">
            <Clock className="w-3 h-3" /> Aguardando {pendentes(c).map((p) => nome(p).split(' ')[0]).join(', ')}
          </span>
        )}
      </button>
    );
  };
  const prazoChip = (tId: string, d: string) =>
    filtro
      ? null
      : prazos
          .filter((p) => p.responsavel === 'u:' + tId && p.prazo === d)
          .map((p) => (
            <div key={p.id} className="ev deadline" title="Prazo de demanda do Cidades Circular">
              <b className="flex items-center gap-1"><Flag className="w-3 h-3" /> Prazo · {p.codigo}</b>
              {p.demanda}
            </div>
          ));

  const contar = (f: Filtro) => semana.filter((c) => (f === 'concluidos' ? c.status === 'Concluído' : f === 'reagendados' ? c.status === 'Reagendado' : statusEfetivo(c, now) === 'Atrasado')).length;
  const andamentoGeral = andamento(semana);
  const temFiltro = !!(filtro || tec || db.filtroTipo || db.filtroProjeto);
  const limpar = () => {
    setFiltro('');
    setTec('');
    db.mut((d) => {
      d.filtroTipo = '';
      d.filtroProjeto = '';
    });
  };
  const kpi = (f: Filtro, label: string, valor: number, extra: React.ReactNode) => (
    <button className={cn('card kpi text-left transition hover:border-[var(--leaf)]', filtro === f && f && 'kpi-on')} onClick={() => setFiltro(filtro === f ? '' : f)} aria-pressed={filtro === f}>
      <span>{label}</span>
      <b>{valor}</b>
      {extra}
    </button>
  );
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const papel = (u: Usuario) => (u.perfil !== 'tecnico' ? <span className="tag dark !text-[10px] !px-1.5 !py-0">{NOME_NIVEL[u.perfil]}</span> : null);

  return (
    <div>
      <PageHead crumbs="Operação" title="Cronograma de campo">
        <Seg value={view} onChange={setView} options={[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']]} />
        {scope.tecnicos.length > 1 && (
          <select id="crono-tec" className="field !w-auto !rounded-full" value={tec} onChange={(e) => setTec(e.target.value)} aria-label="Filtrar pessoa">
            <option value="">Todas as pessoas ({scope.tecnicos.length})</option>
            {scope.tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}{t.perfil !== 'tecnico' ? ` · ${NOME_NIVEL[t.perfil]}` : ''}</option>
            ))}
          </select>
        )}
        {podeIncluir && (
          <button className="btn pri" onClick={() => setNovo({})}><Plus /> Novo item</button>
        )}
      </PageHead>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button className="icon-btn border border-[var(--line)] bg-white" onClick={() => setMonday(addDays(monday, view === 'mes' ? -28 : -7))} aria-label="Período anterior"><ChevronLeft /></button>
        <button className="btn ghost sm" onClick={() => { setMonday(mondayOf(T)); setDay(T); }} disabled={monday === mondayOf(T)}>Hoje</button>
        <button className="icon-btn border border-[var(--line)] bg-white" onClick={() => setMonday(addDays(monday, view === 'mes' ? 28 : 7))} aria-label="Próximo período"><ChevronRight /></button>
        <b className="font-display text-[15px] ml-1">{view === 'mes' ? monthTitle(addDays(monday, 3)) : `Semana de ${weekLabel(monday)}`}</b>
        {monday === mondayOf(T) && view !== 'mes' && <span className="tag dark">Semana atual</span>}
        <button className="btn ghost sm ml-auto" onClick={limpar} disabled={!temFiltro}><FilterX /> Limpar todos os filtros</button>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-5 mb-4">
        {kpi('', 'Itens na semana', semana.length, <span className="tag">{weekLabel(monday)}</span>)}
        {kpi('concluidos', 'Concluídos', contar('concluidos'), <Bar v={andamentoGeral.pct} />)}
        {kpi('reagendados', 'Reagendados', contar('reagendados'), <span className="tag warn">Remarcados</span>)}
        {kpi('atrasados', 'Atrasados até agora', contar('atrasados'), <span className={cn('tag', contar('atrasados') ? 'red' : 'ok')}>{contar('atrasados') ? 'Precisam de atualização' : 'Em dia'}</span>)}
        {kpi('solicitados', 'Eventos Solicitados', solicitadosSemana.length, (
          <span className="flex gap-1 flex-wrap">
            <span className="tag blue">{plural(solicitadosSemana.filter((c) => pendentes(c).length).length, 'pendente', 'pendentes')}</span>
            {solicitadosSemana.some((c) => pessoasDoItem(c).some((p) => situacao(c, p) === 'recusado')) && <span className="tag red">{plural(solicitadosSemana.filter((c) => pessoasDoItem(c).some((p) => situacao(c, p) === 'recusado')).length, 'recusado', 'recusados')}</span>}
          </span>
        ))}
      </div>

      {paraAprovar.length > 0 && (
        <div className="card mb-4">
          <div className="pad pb-2 flex justify-between items-center gap-3 flex-wrap">
            <h3 className="m-0 text-[15px] font-bold flex items-center gap-2"><Inbox className="w-4 h-4" /> Pendentes de aprovação</h3>
            <div className="tabs">
              <button className={cn('tab', abaPend === 'todos' && 'on')} onClick={() => setAbaPend('todos')}>Todos <span className="pc">{paraAprovar.length}</span></button>
              <button className={cn('tab', abaPend === 'mim' && 'on')} onClick={() => setAbaPend('mim')}>Para mim <span className="pc">{pendMim.length}</span></button>
              {nivel(me) >= 2 && <button className={cn('tab', abaPend === 'tecnicos' && 'on')} onClick={() => setAbaPend('tecnicos')}>Entre técnicos <span className="pc">{pendTec.length}</span></button>}
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Quando</th><th>Evento</th><th>Solicitado por</th><th>Para</th><th /></tr></thead>
              <tbody>
                {listaPend.map(({ c, p }) => (
                  <tr key={c.id + p} className="clickable" onClick={() => setAberto(c.id)}>
                    <td className="tnum whitespace-nowrap">{DN[(parseISO(c.data).getDay() + 6) % 7]} {fmtShort(c.data)} · {c.ini}–{c.fim}</td>
                    <td><b className="text-[13px]">{c.obs || c.tipo}</b><div className="muted text-[12px]">{c.tipo}{coopName(c.coopId) ? ` · ${coopName(c.coopId)}` : ''}</div></td>
                    <td className="text-[13px] whitespace-nowrap">{nome(c.criadoPor)}<div className="muted text-[11.5px]">{fmtDateTime(c.aprov?.[p]?.em)}</div></td>
                    <td className="text-[13px] whitespace-nowrap">{p === me.id ? <b>Você</b> : nome(p)}<div className="muted text-[11.5px]">{c.tecnicoId === p ? 'No cronograma' : 'Como participante'}</div></td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}><BotoesAprovacao itemId={c.id} pessoa={p} por={me.id} sm /></td>
                  </tr>
                ))}
                {listaPend.length === 0 && <tr><td colSpan={5} className="muted">Nada pendente nesta aba.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="tbl-wrap">
          {filtro === 'solicitados' ? (
            <table>
              <thead><tr><th>Quando</th><th>Evento</th><th>Pessoas</th></tr></thead>
              <tbody>
                {solicitadosSemana.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => setAberto(c.id)}>
                    <td className="tnum whitespace-nowrap">{DN[(parseISO(c.data).getDay() + 6) % 7]} {fmtShort(c.data)} · {c.ini}–{c.fim}</td>
                    <td><b className="text-[13px]">{c.obs || c.tipo}</b><div className="muted text-[12px]">{c.tipo}</div></td>
                    <td>
                      <div className="flex gap-1.5 flex-wrap">
                        {pessoasDoItem(c).map((p) => {
                          const st = situacao(c, p);
                          return (
                            <span key={p} className={cn('tag', st === 'aprovado' ? 'ok' : st === 'pendente' ? 'blue' : 'red')} title={c.aprov?.[p]?.motivo}>
                              {nome(p).split(' ')[0]} · {st === 'aprovado' ? 'Aprovado' : st === 'pendente' ? 'Pendente' : 'Recusou'}
                              {st === 'recusado' && c.aprov?.[p]?.motivo ? `: ${c.aprov[p].motivo}` : ''}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
                {solicitadosSemana.length === 0 && <tr><td colSpan={3} className="muted">Nenhum evento solicitado nesta semana.</td></tr>}
              </tbody>
            </table>
          ) : view === 'semana' ? (
            <div className="wk">
              <div className="hd">Pessoa</div>
              {dias.map((d, i) => (
                <div key={d} className={cn('hd', d === T && 'today')}>{DN[i]} {fmtShort(d)}{d === T && ' · hoje'}</div>
              ))}
              {pessoas.map((t) => [
                <div key={t.id} className="tc"><Avatar u={t} size="sm" /><span className="min-w-0 grid gap-0.5">{shortName(t.nome)}{papel(t)}</span></div>,
                ...dias.map((d) => (
                  <div key={t.id + d} className={cn('cell', d === T && 'today')}>
                    {daLinha(t, semana).filter((c) => c.data === d).sort((a, b) => a.ini.localeCompare(b.ini)).map((c) => ev(c, t))}
                    {prazoChip(t.id, d)}
                    {podeIncluir && !filtro && (
                      <button className="add-slot" onClick={() => setNovo({ data: d, tecnicoId: t.id })} aria-label={`Incluir item em ${fmtShort(d)}`}>+ incluir</button>
                    )}
                  </div>
                )),
              ])}
            </div>
          ) : view === 'dia' ? (
            <div>
              <div className="pad flex gap-1.5 flex-wrap border-b border-[var(--line)]">
                {dias.map((d, i) => (
                  <button key={d} className={cn('tab', d === day && 'on')} onClick={() => setDay(d)}>
                    {DN[i]} {fmtShort(d)}{d === T && ' · hoje'}
                  </button>
                ))}
              </div>
              {pessoas.map((t) => {
                const evs = daLinha(t, items).filter((c) => c.data === day).sort((a, b) => a.ini.localeCompare(b.ini));
                return (
                  <div key={t.id} className="pad dayrow">
                    <div className="tc"><Avatar u={t} size="sm" /><span className="grid gap-0.5">{t.nome}{papel(t)}</span></div>
                    <div className="grid gap-1 max-w-[640px]">
                      {evs.length ? evs.map((c) => ev(c, t)) : <span className="muted">Sem atividades no dia</span>}
                      {prazoChip(t.id, day)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Mes base={addDays(monday, 3)} items={items.filter(passa)} coopName={coopName} onOpen={setAberto} />
          )}
        </div>
      </div>

      <div className="card mt-4">
        <div className="pad pb-1.5"><h3 className="m-0 text-[15px] font-bold">Acompanhamento por pessoa · semana {weekLabel(monday)}</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Pessoa</th><th>Planejados</th><th>Concluídos</th><th>Reagendados</th><th>Atrasados</th><th>Próximo item</th><th>Andamento da Semana</th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((t) => {
                const evs = semana.filter((c) => naLinhaDe(c, t.id));
                const a = andamento(evs);
                const nx = proximoItem(items.filter((c) => naLinhaDe(c, t.id)), now);
                const atr = evs.filter((c) => statusEfetivo(c, now) === 'Atrasado').length;
                return (
                  <tr key={t.id}>
                    <td><div className="tc"><Avatar u={t} size="xs" />{t.nome}{papel(t)}</div></td>
                    <td className="tnum">{evs.length}</td>
                    <td className="tnum">{a.feitos}</td>
                    <td className="tnum">{evs.filter((c) => c.status === 'Reagendado').length}</td>
                    <td className="tnum">{atr ? <span className="tag red">{atr}</span> : 0}</td>
                    <td>
                      {nx ? (
                        <button className="text-left flex items-center gap-1.5 flex-wrap" onClick={() => setAberto(nx.item.id)}>
                          {nx.agora ? (
                            <span className="tag blue">Agora · até {nx.item.fim}</span>
                          ) : (
                            <span className="tag tnum">{nx.item.data === T ? 'Hoje' : `${DN[(parseISO(nx.item.data).getDay() + 6) % 7]} ${fmtShort(nx.item.data)}`} · {nx.item.ini}</span>
                          )}
                          <span className="text-[13px]">{coopName(nx.item.coopId) ?? nx.item.obs ?? nx.item.tipo}</span>
                        </button>
                      ) : (
                        <span className="muted">Nada agendado</span>
                      )}
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1"><Bar v={a.pct} thick /></div>
                        <b className="tnum text-[13px] w-10 text-right">{a.pct}%</b>
                      </div>
                      <div className="muted text-[11px] tnum">{a.feitos} de {a.total} itens concluídos</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CronoItemDrawer id={aberto} onClose={() => setAberto(null)} />
      <NovoItemModal open={!!novo} init={novo ?? {}} onClose={() => setNovo(null)} />
    </div>
  );
}

function Mes({ base, items, coopName, onOpen }: { base: string; items: ItemCrono[]; coopName: (id?: string) => string | undefined; onOpen: (id: string) => void }) {
  const users = useDB((s) => s.users);
  const d0 = parseISO(base);
  const first = new Date(d0.getFullYear(), d0.getMonth(), 1);
  const start = mondayOf(iso(first));
  const T = today();
  const cells = Array.from({ length: 42 }, (_, k) => addDays(start, k));
  let last = 0;
  cells.forEach((c, i) => {
    if (parseISO(c).getMonth() === d0.getMonth()) last = i;
  });
  const rows = Math.ceil((last + 1) / 7);
  return (
    <div className="mo">
      {DN.map((d) => (
        <div key={d} className="!min-h-0 font-semibold muted text-[11.5px] bg-[#fafbf8]">{d}</div>
      ))}
      {cells.slice(0, rows * 7).map((ds) => {
        const off = parseISO(ds).getMonth() !== d0.getMonth();
        const evs = items.filter((e) => e.data === ds).sort((a, b) => a.ini.localeCompare(b.ini));
        return (
          <div key={ds} className={cn(off && 'off', ds === T && 'today')}>
            <span className="dn">{parseISO(ds).getDate()}</span>
            {evs.slice(0, 3).map((e) => {
              const st = statusEfetivo(e);
              const u = users.find((x) => x.id === e.tecnicoId);
              return (
                <button key={e.id} className={cn('pill', `tag ${stTag(st)}`)} onClick={() => onOpen(e.id)} title={`${e.ini} ${coopName(e.coopId) ?? e.obs ?? e.tipo}`}>
                  {u ? u.nome.split(' ')[0] : ''} · {coopName(e.coopId) ?? e.tipo}
                </button>
              );
            })}
            {evs.length > 3 && <span className="muted text-[10.5px]">+{evs.length - 3}</span>}
          </div>
        );
      })}
    </div>
  );
}
