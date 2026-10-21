import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Flag } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { addDays, DN, fmtShort, monthTitle, mondayOf, parseISO, iso, today, weekDays, weekLabel } from '@/lib/dates';
import { cn, shortName } from '@/lib/utils';
import type { ItemCrono } from '@/lib/types';
import { Avatar, Bar, PageHead, Seg } from '@/components/ui';
import { andamento, evCls, proximoItem, statusEfetivo, stTag } from './logic';
import CronoItemDrawer from './CronoItemDrawer';
import NovoItemModal from './NovoItemModal';

export default function CronogramaPage() {
  const me = useMe()!;
  const scope = useScope();
  const coops = useDB((s) => s.coops);
  const tarefas = useDB((s) => s.tarefas);
  const [view, setView] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [monday, setMonday] = useState(mondayOf(today()));
  const [day, setDay] = useState(today());
  const [tec, setTec] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ data?: string; tecnicoId?: string } | null>(null);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const verTodos = can(me, 'crono.todos');
  const editaOutros = can(me, 'crono.editarTodos');
  const podeIncluir = can(me, 'crono.proprio') || editaOutros;
  const tecnicos = scope.tecnicos.filter((t) => !tec || t.id === tec);
  const tecIds = new Set(tecnicos.map((t) => t.id));
  const items = scope.crono.filter((c) => tecIds.has(c.tecnicoId));
  const dias = weekDays(monday);
  const semana = items.filter((c) => c.data >= dias[0] && c.data <= dias[4]);
  const T = today();
  const coopName = (id?: string) => coops.find((c) => c.id === id)?.nome;

  useEffect(() => {
    if (!dias.includes(day)) setDay(dias.includes(T) ? T : dias[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday]);

  const prazos = useMemo(
    () => tarefas.filter((t) => t.prazo && t.status !== 'Concluída' && t.responsavel.startsWith('u:') && tecIds.has(t.responsavel.slice(2))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tarefas, tecnicos.length, tec],
  );

  const ev = (c: ItemCrono) => {
    const st = statusEfetivo(c, now);
    const titulo = coopName(c.coopId) ?? c.tipo;
    return (
      <button key={c.id} className={cn('ev', evCls(st))} onClick={() => setAberto(c.id)}>
        <b className="tnum">{c.ini}–{c.fim} · {titulo}</b>
        {coopName(c.coopId) ? c.tipo + ' · ' : ''}
        {st}
        {c.obs && <span className="block muted">{c.obs}</span>}
      </button>
    );
  };
  const prazoChip = (tId: string, d: string) =>
    prazos
      .filter((p) => p.responsavel === 'u:' + tId && p.prazo === d)
      .map((p) => (
        <div key={p.id} className="ev deadline" title="Prazo de demanda do Cidades Circular">
          <b className="flex items-center gap-1"><Flag className="w-3 h-3" /> Prazo · {p.codigo}</b>
          {p.demanda}
        </div>
      ));

  const by = (st: string) => semana.filter((c) => c.status === st).length;
  const atrasados = semana.filter((c) => statusEfetivo(c, now) === 'Atrasado').length;
  const andamentoGeral = andamento(semana);

  return (
    <div>
      <PageHead
        crumbs="Operação"
        title="Cronograma de campo"
        sub={verTodos ? 'Agenda dos técnicos, com acompanhamento item a item pela coordenação.' : 'Sua agenda de campo.'}
      >
        <Seg value={view} onChange={setView} options={[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']]} />
        {verTodos && (
          <select id="crono-tec" className="field !w-auto !rounded-full" value={tec} onChange={(e) => setTec(e.target.value)} aria-label="Filtrar técnico">
            <option value="">Todos os técnicos ({scope.tecnicos.length})</option>
            {scope.tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
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
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4 mb-4">
        <div className="card kpi"><span>Itens na semana</span><b>{semana.length}</b><span className="tag">{weekLabel(monday)}</span></div>
        <div className="card kpi"><span>Concluídos</span><b>{by('Concluído')}</b><Bar v={andamentoGeral.pct} /></div>
        <div className="card kpi"><span>Reagendados</span><b>{by('Reagendado')}</b><span className="tag warn">Remarcados</span></div>
        <div className="card kpi"><span>Atrasados até agora</span><b style={{ color: atrasados ? 'var(--danger)' : undefined }}>{atrasados}</b><span className={cn('tag', atrasados ? 'red' : 'ok')}>{atrasados ? 'Precisam de atualização' : 'Em dia'}</span></div>
      </div>

      <div className="card overflow-hidden">
        <div className="tbl-wrap">
          {view === 'semana' && (
            <div className="wk">
              <div className="hd">Técnico</div>
              {dias.map((d, i) => (
                <div key={d} className={cn('hd', d === T && 'today')}>{DN[i]} {fmtShort(d)}{d === T && ' · hoje'}</div>
              ))}
              {tecnicos.map((t) => [
                <div key={t.id} className="tc"><Avatar u={t} size="sm" /><span className="min-w-0">{shortName(t.nome)}</span></div>,
                ...dias.map((d) => (
                  <div key={t.id + d} className={cn('cell', d === T && 'today')}>
                    {semana.filter((c) => c.tecnicoId === t.id && c.data === d).sort((a, b) => a.ini.localeCompare(b.ini)).map(ev)}
                    {prazoChip(t.id, d)}
                    {podeIncluir && (editaOutros || t.id === me.id) && (
                      <button className="add-slot" onClick={() => setNovo({ data: d, tecnicoId: t.id })} aria-label={`Incluir item em ${fmtShort(d)}`}>+ incluir</button>
                    )}
                  </div>
                )),
              ])}
            </div>
          )}

          {view === 'dia' && (
            <div>
              <div className="pad flex gap-1.5 flex-wrap border-b border-[var(--line)]">
                {dias.map((d, i) => (
                  <button key={d} className={cn('tab', d === day && 'on')} onClick={() => setDay(d)}>
                    {DN[i]} {fmtShort(d)}{d === T && ' · hoje'}
                  </button>
                ))}
              </div>
              {tecnicos.map((t) => {
                const evs = items.filter((c) => c.tecnicoId === t.id && c.data === day).sort((a, b) => a.ini.localeCompare(b.ini));
                return (
                  <div key={t.id} className="pad dayrow">
                    <div className="tc"><Avatar u={t} size="sm" />{t.nome}</div>
                    <div className="grid gap-1 max-w-[640px]">
                      {evs.length ? evs.map(ev) : <span className="muted">Sem atividades no dia</span>}
                      {prazoChip(t.id, day)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'mes' && <Mes base={addDays(monday, 3)} items={items} coopName={coopName} onOpen={setAberto} />}
        </div>
      </div>

      <div className="card mt-4">
        <div className="pad pb-1.5 flex justify-between items-center gap-3 flex-wrap">
          <h3 className="m-0 text-[15px] font-bold">Acompanhamento por técnico · semana {weekLabel(monday)}</h3>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Técnico</th><th>Planejados</th><th>Concluídos</th><th>Reagendados</th><th>Atrasados</th><th>Próximo item</th><th>Andamento da Semana</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map((t) => {
                const evs = semana.filter((c) => c.tecnicoId === t.id);
                const a = andamento(evs);
                const nx = proximoItem(items.filter((c) => c.tecnicoId === t.id), now);
                const atr = evs.filter((c) => statusEfetivo(c, now) === 'Atrasado').length;
                return (
                  <tr key={t.id}>
                    <td><div className="tc"><Avatar u={t} size="xs" />{t.nome}</div></td>
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
                          <span className="text-[13px]">{coopName(nx.item.coopId) ?? nx.item.tipo}</span>
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
                <button key={e.id} className={cn('pill', `tag ${stTag(st)}`)} onClick={() => onOpen(e.id)} title={`${e.ini} ${coopName(e.coopId) ?? e.tipo}`}>
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
