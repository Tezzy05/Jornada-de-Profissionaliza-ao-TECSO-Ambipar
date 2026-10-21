import { Download, Save } from 'lucide-react';
import { useDB } from '@/store/db';
import { fmt } from '@/lib/dates';
import { dataURLToBlob, putMedia, useMediaURL } from '@/lib/media';
import { Field, MediaThumb, SignaturePad, toast } from '@/components/ui';
import { imprimir } from '@/components/Print';
import type { Slot, Visita } from '@/lib/types';
import type { DocProps } from './types';

function Ph({ s }: { s: Slot | null }) {
  if (!s) return <div className="rph">sem foto</div>;
  return <MediaThumb id={s.id} kind="img" className="rph" />;
}
function SigImg({ id }: { id?: string }) {
  const url = useMediaURL(id);
  return url ? <img src={url} alt="" /> : null;
}

export function ReportView({ v }: { v: Visita }) {
  const db = useDB();
  const coop = db.coops.find((c) => c.id === v.coopId)!;
  const tec = db.users.find((u) => u.id === v.tecnicoId);
  const end = coop.enderecos.find((e) => e.tipo === v.endereco)?.end ?? coop.enderecos[0]?.end;
  const sec = (t: string, idx: number[]) => (
    <>
      <h4>{t}</h4>
      <div className="rgrid">
        {idx.flatMap((i) => (v.ph[i].na ? [<div key={i} className="rph">Não possui</div>] : [<Ph key={i + 'h'} s={v.ph[i].h} />, <Ph key={i + 'v'} s={v.ph[i].v} />]))}
      </div>
    </>
  );
  return (
    <div className="rep">
      <div className="flex justify-between items-center gap-2.5">
        <div>
          <div className="font-display font-extrabold text-[17px]">Relatório de Campo – Diagnóstico de Capacidade Operacional (DCO)</div>
          <div className="muted">Análise situacional · Registro fotográfico</div>
        </div>
        <span className="tag dark">{coop.nome}</span>
      </div>
      <h4>1. Identificação</h4>
      <div className="ident">
        <span><b>Razão Social:</b> {(v.decl.razao as string) || coop.nome}</span>
        <span><b>CNPJ:</b> {(v.decl.cnpj as string) || '—'}</span>
        <span><b>Tipo de operador:</b> {(v.decl.op as string) || '—'}</span>
        <span><b>Endereço:</b> {v.endereco} · {end}</span>
        <span><b>Técnico:</b> {tec?.nome}</span>
        <span><b>Data:</b> {fmt(v.data)}</span>
      </div>
      {sec('2. Fachada', [2])}
      {sec('3. Escritório', [13])}
      {sec('4. Banheiros', [11, 12])}
      {sec('5. Refeitório', [10])}
      {sec('6. Galpão e demais áreas', [3, 4, 5, 6, 7, 8, 9])}
      <h4>7. Equipamentos</h4>
      <div className="rgrid">
        {v.eq.map((e) => (
          <div key={e.id}>
            <Ph s={e.foto} />
            <div className="text-[10.5px] mt-1"><b>{e.tipo} × {e.qtd}</b><br />{e.esp}</div>
          </div>
        ))}
      </div>
      <h4>8. Informações complementares</h4>
      <p>{v.rel.info.trim() || <span className="muted">Sem informações complementares.</span>}</p>
      <div className="sigs" style={{ marginTop: 70 }}>
        <div>
          <SigImg id={v.rel.sigResp} />
          {v.rel.respNome || 'Nome do responsável'}<br />CPF {v.rel.respCpf || '___.___.___-__'}<br /><span className="muted">Responsável do grupo / quem atendeu</span>
        </div>
        <div>
          <SigImg id={v.rel.sigTec} />
          {tec?.nome}<br />CPF {v.rel.tecCpf || '___.___.___-__'}<br /><span className="muted">Técnico responsável</span>
        </div>
      </div>
    </div>
  );
}

export default function Relatorio({ v, ro, upd }: DocProps) {
  const ok = !!(v.rel.respNome.trim() && v.rel.respCpf.trim() && v.rel.tecCpf.trim() && v.rel.sigResp && v.rel.sigTec);
  const tecNome = useDB((s) => s.users.find((u) => u.id === v.tecnicoId)?.nome);
  const setRel = (fn: (r: Visita['rel']) => void) => upd((x) => { fn(x.rel); x.rel.saved = false; });
  const sig = (campo: 'sigResp' | 'sigTec') => async (d: string | null) => {
    const id = d ? await putMedia(await dataURLToBlob(d), 'assinatura.png') : undefined;
    setRel((r) => { r[campo] = id; });
  };
  return (
    <div>
      <div className="backbar">
        <h2>Relatório de Campo</h2>
        <span className={`tag ${v.rel.saved ? 'ok' : ok ? 'lime' : 'warn'}`}>{v.rel.saved ? 'Salvo' : ok ? 'Pronto para salvar' : 'Faltam dados ou assinaturas'}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="info mb-3">Montado automaticamente com as fotos, os equipamentos e a identificação da visita. Revise, preencha as assinaturas e exporte.</div>
          <ReportView v={v} />
        </div>
        <div className="card pad self-start grid gap-2.5">
          <h3 className="text-[15px] font-bold">Informações complementares <span className="opt">Opcional</span></h3>
          <textarea id="rel-info" className="field min-h-[80px]" disabled={ro} placeholder="Observações relevantes da visita (também entram no e-mail de conclusão)" value={v.rel.info} onChange={(e) => setRel((r) => { r.info = e.target.value; })} />
          <h3 className="text-[15px] font-bold mt-2">Responsável do grupo / quem atendeu</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Nome" req><input id="rel-rn" className="field" disabled={ro} value={v.rel.respNome} onChange={(e) => setRel((r) => { r.respNome = e.target.value; })} /></Field>
            <Field label="CPF" req><input id="rel-rc" className="field" disabled={ro} placeholder="000.000.000-00" value={v.rel.respCpf} onChange={(e) => setRel((r) => { r.respCpf = e.target.value; })} /></Field>
          </div>
          <Field label="Assinatura" req><SignaturePad disabled={ro} value={v.rel.sigResp} onChange={sig('sigResp')} /></Field>
          <h3 className="text-[15px] font-bold mt-2">Técnico responsável</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Nome"><input className="field" value={tecNome} disabled /></Field>
            <Field label="CPF" req><input id="rel-tc" className="field" disabled={ro} placeholder="000.000.000-00" value={v.rel.tecCpf} onChange={(e) => setRel((r) => { r.tecCpf = e.target.value; })} /></Field>
          </div>
          <Field label="Assinatura" req><SignaturePad disabled={ro} value={v.rel.sigTec} onChange={sig('sigTec')} /></Field>
          <div className="flex gap-2.5 mt-2 flex-wrap">
            {!ro && (
              <button className="btn dark" onClick={() => { if (!ok) return toast('Preencha nome, CPF e as duas assinaturas', true); upd((x) => { x.rel.saved = true; }); toast('Relatório de Campo salvo na visita'); }}>
                <Save /> Salvar relatório
              </button>
            )}
            <button className="btn pri" onClick={() => { if (!v.rel.saved) return toast('Salve o relatório com as assinaturas antes de exportar', true); imprimir(<ReportView v={v} />); }}>
              <Download /> Exportar PDF
            </button>
          </div>
          <p className="muted text-[11.5px]">Mesmo padrão de exportação do ROI (Retorna Machine).</p>
        </div>
      </div>
    </div>
  );
}
