import { useState } from 'react';
import { Plus, Camera, ExternalLink, CheckCircle2, GraduationCap } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { addDays, fmt, fmtShort, today } from '@/lib/dates';
import { cn, uid } from '@/lib/utils';
import { capturarFoto } from '@/lib/upload';
import { Empty, Field, MediaThumb, Modal, PageHead, toast } from '@/components/ui';
import type { Capacitacao } from '@/lib/types';
import { naAceleracao } from './logic';

export default function CapacitacoesPage() {
  const db = useDB();
  const me = useMe()!;
  const scope = useScope();
  const [agendar, setAgendar] = useState(false);
  const [registrar, setRegistrar] = useState<string | null>(null);
  const gere = can(me, 'capacitacoes.gerir');
  const coopsProg = scope.coops.filter((c) => naAceleracao(db, c.id));
  const caps = db.capacitacoes.filter((c) => c.coops.some((x) => coopsProg.some((y) => y.id === x))).sort((a, b) => b.data.localeCompare(a.data));
  const T = today();

  // meta de 1 por mês: últimos 3 meses por cooperativa
  const meses = [0, 1, 2].map((i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).reverse();
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  return (
    <div>
      <PageHead crumbs="Programas · Produto 5" title="Capacitações online" sub="Treinamentos para várias cooperativas juntas, ao menos uma vez por mês.">
        {gere && <button className="btn pri" onClick={() => setAgendar(true)}><Plus /> Agendar capacitação</button>}
      </PageHead>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-3 self-start">
          {caps.length === 0 && <div className="card"><Empty icon={<GraduationCap />} title="Nenhuma capacitação no filtro atual" /></div>}
          {caps.map((c) => {
            const fac = db.users.find((u) => u.id === c.facilitadorId);
            const total = Object.values(c.presencas).reduce((s, n) => s + n, 0);
            return (
              <div key={c.id} className="card p-4 grid gap-3">
                <div className="flex justify-between gap-3 flex-wrap items-start">
                  <div>
                    <b className="font-display text-[15px]">{c.tema}</b>
                    <div className="muted text-[12.5px]">{fmt(c.data)} · {c.ini}–{c.fim} · Facilitação: {fac?.nome}</div>
                  </div>
                  <span className={cn('tag', c.status === 'Realizada' ? 'ok' : c.status === 'Agendada' ? 'blue' : 'red')}>{c.status}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {c.coops.map((id) => {
                    const coop = db.coops.find((x) => x.id === id);
                    const n = c.presencas[id] ?? 0;
                    return (
                      <span key={id} className={cn('tag', c.status !== 'Realizada' ? '' : n ? 'ok' : 'red')}>
                        {coop?.nome}{c.status === 'Realizada' && ` · ${n || 'ausente'}`}
                      </span>
                    );
                  })}
                </div>
                {c.status === 'Realizada' && (
                  <div className="flex gap-3 items-center flex-wrap">
                    <span className="muted text-[12.5px] tnum">{total} participantes no total</span>
                    {c.resumo && <span className="text-[12.5px]">{c.resumo}</span>}
                    <div className="flex gap-1.5 ml-auto">{c.fotos.map((f) => <MediaThumb key={f} id={f} kind="img" className="w-16 h-12 rounded-md" />)}</div>
                  </div>
                )}
                {c.status === 'Agendada' && (
                  <div className="flex gap-2 flex-wrap">
                    <a className="btn ghost sm" href={c.link} target="_blank" rel="noreferrer"><ExternalLink /> Link da reunião</a>
                    {gere && c.data <= addDays(T, 0) && <button className="btn dark sm" onClick={() => setRegistrar(c.id)}><CheckCircle2 /> Registrar presença</button>}
                    {gere && c.data > T && <button className="btn link sm" onClick={() => setRegistrar(c.id)}>Registrar presença antecipada</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card self-start">
          <div className="pad pb-2"><h3 className="text-[15px] font-bold m-0">Meta: 1 capacitação por mês</h3><p className="muted text-[12.5px]">Participação de cada cooperativa nos últimos 3 meses.</p></div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Cooperativa</th>{meses.map((m) => <th key={m}>{MES[+m.slice(5) - 1]}</th>)}</tr></thead>
              <tbody>
                {coopsProg.map((co) => (
                  <tr key={co.id}>
                    <td className="font-medium">{co.nome}</td>
                    {meses.map((m) => {
                      const doMes = db.capacitacoes.filter((c) => c.data.startsWith(m) && c.coops.includes(co.id));
                      const real = doMes.filter((c) => c.status === 'Realizada');
                      const ok = real.some((c) => (c.presencas[co.id] ?? 0) > 0);
                      const ag = doMes.some((c) => c.status === 'Agendada');
                      return (
                        <td key={m}>
                          {ok ? <span className="tag ok">Sim</span> : real.length ? <span className="tag red">Faltou</span> : ag ? <span className="tag blue">Agendada</span> : <span className="tag">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AgendarModal open={agendar} coopsIds={coopsProg.map((c) => c.id)} onClose={() => setAgendar(false)} />
      <RegistrarModal id={registrar} onClose={() => setRegistrar(null)} />
    </div>
  );
}

function AgendarModal({ open, coopsIds, onClose }: { open: boolean; coopsIds: string[]; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const blank = () => ({ tema: '', data: addDays(today(), 7), ini: '14:00', fim: '16:00', link: 'https://teams.microsoft.com/', facilitadorId: me.id, coops: [...coopsIds] });
  const [f, setF] = useState(blank);
  const [k, setK] = useState(open);
  if (k !== open) {
    setK(open);
    if (open) setF(blank());
  }
  const internos = db.users.filter((u) => u.ativo && ['tecnico', 'coord'].includes(u.perfil));
  const salvar = () => {
    if (!f.tema.trim()) return toast('Informe o tema', true);
    if (!f.coops.length) return toast('Escolha ao menos uma cooperativa', true);
    const c: Capacitacao = { id: uid(), ...f, presencas: {}, fotos: [], status: 'Agendada' };
    db.mut((d) => {
      d.capacitacoes.push(c);
      const fac = d.users.find((u) => u.id === f.facilitadorId);
      if (fac?.perfil === 'tecnico') d.crono.push({ id: 'cr_' + uid(), tecnicoId: fac.id, data: f.data, ini: f.ini, fim: f.fim, tipo: 'Capacitação online (P5)', status: 'Planejado', obs: f.tema, projetoId: d.projetos.find((p) => p.tipo === 'aceleracao')?.id });
    });
    toast(`Capacitação agendada para ${fmtShort(f.data)}`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Agendar capacitação online" footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Agendar</button></>}>
      <Field label="Tema" req><input id="cap-tema" className="field" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} placeholder="Ex.: Comercialização e negociação com compradores" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Data" req><input id="cap-data" type="date" className="field" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <Field label="Início" req><input id="cap-ini" type="time" className="field" value={f.ini} onChange={(e) => setF({ ...f, ini: e.target.value })} /></Field>
        <Field label="Fim" req><input id="cap-fim" type="time" className="field" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Facilitação" req><select id="cap-fac" className="field" value={f.facilitadorId} onChange={(e) => setF({ ...f, facilitadorId: e.target.value })}>{internos.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></Field>
        <Field label="Link da reunião"><input id="cap-link" className="field" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></Field>
      </div>
      <div>
        <span className="fl"><label>Cooperativas convidadas</label></span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {coopsIds.map((id) => (
            <label key={id} className="inline-flex gap-1.5 items-center">
              <input type="checkbox" checked={f.coops.includes(id)} onChange={(e) => setF({ ...f, coops: e.target.checked ? [...f.coops, id] : f.coops.filter((x) => x !== id) })} />
              {db.coops.find((c) => c.id === id)?.nome}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function RegistrarModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const db = useDB();
  const c = db.capacitacoes.find((x) => x.id === id);
  const [pres, setPres] = useState<Record<string, number>>({});
  const [fotos, setFotos] = useState<string[]>([]);
  const [resumo, setResumo] = useState('');
  const [k, setK] = useState(id);
  if (k !== id) {
    setK(id);
    setPres(c ? Object.fromEntries(c.coops.map((x) => [x, c.presencas[x] ?? 0])) : {});
    setFotos([]);
    setResumo('');
  }
  if (!c) return null;
  const salvar = () => {
    db.mut((d) => {
      const x = d.capacitacoes.find((y) => y.id === c.id)!;
      x.presencas = pres;
      x.fotos = [...x.fotos, ...fotos];
      x.resumo = resumo;
      x.status = 'Realizada';
    });
    toast('Capacitação registrada como realizada');
    onClose();
  };
  return (
    <Modal open={!!id} onClose={onClose} title={`Presença · ${c.tema}`} footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Salvar como realizada</button></>}>
      <p className="muted text-[13px]">Informe quantas pessoas de cada cooperativa participaram. Zero conta como ausência.</p>
      <div className="grid gap-2">
        {c.coops.map((x) => (
          <div key={x} className="flex items-center justify-between gap-3">
            <span>{db.coops.find((y) => y.id === x)?.nome}</span>
            <input type="number" min={0} className="field !w-24" value={pres[x] ?? 0} onChange={(e) => setPres({ ...pres, [x]: Math.max(0, +e.target.value) })} aria-label="Participantes" />
          </div>
        ))}
      </div>
      <Field label="Resumo" opt><textarea id="cap-res" className="field" value={resumo} onChange={(e) => setResumo(e.target.value)} /></Field>
      <div className="flex gap-2 flex-wrap items-center">
        {fotos.map((f) => <MediaThumb key={f} id={f} kind="img" className="w-20 h-16 rounded-lg" />)}
        <button className="photo-btn" onClick={async () => { const r = await capturarFoto(); if (r) setFotos([...fotos, r.id]); }}><Camera /> Incluir foto/print</button>
      </div>
    </Modal>
  );
}
