import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, Eye, ClipboardCheck, Search } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmt, fmtDateTime, fmtShort, today } from '@/lib/dates';
import { Avatar, Bar, confirmar, Empty, Field, Modal, PageHead, toast } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Visita } from '@/lib/types';
import { STATUS_VISITA, visitaPct } from './dco';
import { criarVisita, excluirRascunho } from './actions';
import { integracaoStatus } from '@/features/aceleracao/logic';

type Aba = 'abertas' | 'aprovar' | 'todas';

export default function VisitasPage() {
  const me = useMe()!;
  const db = useDB();
  const scope = useScope();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const aprovador = can(me, 'visitas.aprovar');
  const preenche = can(me, 'visitas.preencher');
  const verTodas = can(me, 'visitas.verTodas');
  const aba = (sp.get('aba') as Aba) || (aprovador ? 'aprovar' : 'abertas');
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);

  const coopName = (id: string) => db.coops.find((c) => c.id === id)?.nome ?? '';
  const minhas = scope.visitas.filter((v) => v.tecnicoId === me.id);
  let lista: Visita[] =
    aba === 'abertas'
      ? (verTodas && !preenche ? scope.visitas : minhas).filter((v) => v.status === 'rascunho' || v.status === 'devolvida')
      : aba === 'aprovar'
        ? scope.visitas.filter((v) => v.status === 'enviada')
        : verTodas
          ? scope.visitas
          : minhas;
  if (busca) lista = lista.filter((v) => coopName(v.coopId).toLowerCase().includes(busca.toLowerCase()));
  lista = [...lista].sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));

  const tabs: [Aba, string, number][] = [
    ...(preenche ? [['abertas', 'Em aberto', minhas.filter((v) => v.status === 'rascunho' || v.status === 'devolvida').length] as [Aba, string, number]] : []),
    ...(aprovador ? [['aprovar', 'Aguardando aprovação', scope.visitas.filter((v) => v.status === 'enviada').length] as [Aba, string, number]] : []),
    ['todas', preenche && !verTodas ? 'Todas as minhas visitas' : 'Todas as visitas', (verTodas ? scope.visitas : minhas).length],
  ];

  const excluir = async (v: Visita) => {
    const ok = await confirmar(
      'Excluir rascunho',
      <>
        O rascunho da visita à <b>{coopName(v.coopId)}</b> de {fmtShort(v.data)} ({visitaPct(v)}% preenchido) será excluído, com as fotos e assinaturas dele. Só rascunhos podem ser excluídos.
      </>,
      'Excluir rascunho',
      true,
    );
    if (!ok) return;
    const undo = excluirRascunho(v.id);
    if (undo) toast('Rascunho excluído', false, { label: 'Desfazer', fn: () => { undo(); toast('Rascunho restaurado'); } });
  };

  return (
    <div>
      <PageHead
        crumbs="Operação"
        title={preenche && !verTodas ? 'Minhas visitas DCO' : 'Visitas DCO'}
        sub="Diagnóstico de Capacidade Operacional. Continue um rascunho, consulte as visitas enviadas ou inicie uma nova."
      >
        {preenche && (
          <button className="btn pri" onClick={() => setNova(true)}><Plus /> Nova visita</button>
        )}
      </PageHead>

      <div className="flex gap-3 justify-between items-center flex-wrap mb-4">
        <div className="tabs">
          {tabs.map(([k, l, n]) => (
            <button key={k} className={cn('tab', aba === k && 'on')} onClick={() => setSp({ aba: k })}>
              {l} <span className="pc tnum">{n}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 field !w-auto !rounded-full !py-1.5">
          <Search className="w-4 h-4 muted" />
          <input id="busca-visita" className="bg-transparent outline-none w-48" placeholder="Buscar cooperativa" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      </div>

      {lista.length === 0 ? (
        <div className="card">
          <Empty icon={<ClipboardCheck />} title={aba === 'aprovar' ? 'Nenhuma visita aguardando aprovação' : 'Nenhuma visita aqui'} text={aba === 'abertas' ? 'Inicie uma visita pelo botão "Nova visita" ou clicando num item "Visita DCO" do cronograma.' : undefined}>
            {aba === 'abertas' && preenche && <button className="btn pri" onClick={() => setNova(true)}><Plus /> Nova visita</button>}
          </Empty>
        </div>
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {lista.map((v) => {
            const st = STATUS_VISITA[v.status];
            const tec = db.users.find((u) => u.id === v.tecnicoId);
            const editavel = v.tecnicoId === me.id && (v.status === 'rascunho' || v.status === 'devolvida') && preenche;
            const p = visitaPct(v);
            const coop = db.coops.find((c) => c.id === v.coopId);
            return (
              <div key={v.id} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between gap-2 items-start">
                  <div className="flex gap-3 items-center min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-[var(--ink)] text-[var(--lime)] grid place-items-center font-display font-extrabold flex-none">{coop?.sigla}</span>
                    <div className="min-w-0">
                      <b className="font-display text-[15px] block truncate">{coop?.nome}</b>
                      <small className="muted">{fmt(v.data)} · {v.endereco} · {coop?.cidade}/{coop?.uf}</small>
                    </div>
                  </div>
                  <span className={`tag ${st.cls}`}>{st.t}</span>
                </div>
                {v.status === 'devolvida' && v.devolucao && (
                  <div className="alert red !py-2 text-[12.5px]"><b>Motivo da devolução:</b> {v.devolucao.motivo}</div>
                )}
                <div>
                  <div className="flex justify-between text-[12px] mb-1"><span className="muted">Preenchimento dos 7 documentos</span><b className="tnum">{p}%</b></div>
                  <Bar v={p} />
                </div>
                <div className="flex items-center gap-2 text-[12px] muted">
                  <Avatar u={tec} size="xs" /> {tec?.nome} · atualizada em {fmtDateTime(v.atualizadaEm)}
                </div>
                <div className="flex gap-2 mt-auto pt-1 flex-wrap">
                  <button className={cn('btn sm', editavel ? 'pri' : 'dark')} onClick={() => nav(`/visitas/${v.id}`)}>
                    {editavel ? <>Continuar editando <ArrowRight /></> : v.status === 'enviada' && aprovador ? <>Revisar e aprovar <ArrowRight /></> : <><Eye /> Abrir</>}
                  </button>
                  {editavel && v.status === 'rascunho' && (
                    <button className="btn danger sm" onClick={() => excluir(v)}><Trash2 /> Excluir rascunho</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NovaVisitaModal open={nova} onClose={() => setNova(false)} />
    </div>
  );
}

function NovaVisitaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()!;
  const db = useDB();
  const scope = useScope();
  const nav = useNavigate();
  const coops = scope.coops.filter((c) => db.projetos.some((p) => p.tipo === 'aceleracao' && p.coops.includes(c.id) && p.tecnicos.includes(me.id)) || c.tecnicoId === me.id);
  const [coopId, setCoopId] = useState('');
  const [data, setData] = useState(today());
  const [endereco, setEndereco] = useState<Visita['endereco']>('Matriz');
  const [cronoId, setCronoId] = useState('');
  const coop = db.coops.find((c) => c.id === coopId);
  const ig = coop ? integracaoStatus(db, coop.id) : null;
  const itensCrono = db.crono.filter((c) => c.tecnicoId === me.id && c.coopId === coopId && c.tipo === 'Visita DCO' && !c.visitaId && c.status !== 'Cancelado' && c.status !== 'Reagendado');

  const criar = () => {
    if (!coopId) return toast('Escolha a cooperativa', true);
    const r = criarVisita({ coopId, tecnicoId: me.id, data, endereco, cronoId: cronoId || undefined });
    if ('erro' in r) return toast(r.erro, true);
    onClose();
    toast('Visita criada em rascunho');
    nav(`/visitas/${r.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova visita DCO"
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn pri" onClick={criar} disabled={!!ig && !ig.completa}>Criar e abrir os documentos</button>
        </>
      }
    >
      <Field label="Cooperativa" req hint="Aparecem só as cooperativas dos projetos em que você está vinculado.">
        <select id="nv-coop" className="field" value={coopId} onChange={(e) => { setCoopId(e.target.value); setCronoId(''); setEndereco('Matriz'); }}>
          <option value="">Escolher</option>
          {coops.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} · {c.cidade}/{c.uf}</option>
          ))}
        </select>
      </Field>
      {ig && !ig.completa && (
        <div className="alert red">A integração da {coop?.nome} está incompleta ({ig.feitos}/{ig.total}). Conclua o checklist de integração antes de iniciar a visita.</div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Data da visita" req><input id="nv-data" type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></Field>
        <Field label="Endereço" req>
          <select id="nv-end" className="field" value={endereco} onChange={(e) => setEndereco(e.target.value as Visita['endereco'])}>
            {(coop?.enderecos ?? [{ tipo: 'Matriz', end: '' }]).map((e) => (
              <option key={e.tipo} value={e.tipo}>{e.tipo}{e.end ? ` · ${e.end}` : ''}</option>
            ))}
          </select>
        </Field>
      </div>
      {itensCrono.length > 0 && (
        <Field label="Vincular ao item do cronograma" opt>
          <select id="nv-crono" className="field" value={cronoId} onChange={(e) => { setCronoId(e.target.value); const c = db.crono.find((x) => x.id === e.target.value); if (c) setData(c.data); }}>
            <option value="">Não vincular</option>
            {itensCrono.map((c) => (
              <option key={c.id} value={c.id}>{fmtShort(c.data)} · {c.ini}–{c.fim} · {c.status}</option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}
