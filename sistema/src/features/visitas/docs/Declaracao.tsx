import { dataURLToBlob, putMedia } from '@/lib/media';
import { SignaturePad } from '@/components/ui';
import { DECL, OPT, type DeclField } from '../dco';
import type { DocProps } from './types';

const TAG = { R: <span className="req">Obrigatório</span>, C: <span className="req !bg-[#fff2d1] !text-[#835800]">Condicional</span>, O: <span className="opt">Opcional</span> };

export default function Declaracao({ v, ro, upd }: DocProps) {
  const val = (k: string) => v.decl[k];
  const set = (k: string, x: string | string[]) => upd((d) => { d.decl[k] = x; });

  const campo = (f: DeclField) => {
    switch (f.type) {
      case 'text':
        return <input id={`dc-${f.k}`} className="field" placeholder={f.ph} disabled={ro} value={(val(f.k) as string) ?? ''} onChange={(e) => set(f.k, e.target.value)} />;
      case 'sel':
        return (
          <select id={`dc-${f.k}`} className="field" disabled={ro} value={(val(f.k) as string) ?? ''} onChange={(e) => set(f.k, e.target.value)}>
            <option value="">Escolher um item</option>
            {OPT[f.opt].map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case 'pair': {
        const p = (val(f.k) as string[]) ?? ['', ''];
        return (
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1].map((i) => (
              <input key={i} id={`dc-${f.k}-${i}`} className="field" placeholder={f.ph[i]} disabled={ro} value={p[i] ?? ''} onChange={(e) => { const n = [...p]; n[i] = e.target.value; set(f.k, n); }} />
            ))}
          </div>
        );
      }
      case 'cbs': {
        const arr = (val(f.k) as string[]) ?? [];
        return (
          <div>
            {f.opts.map((o) => (
              <label key={o} className="inline-flex gap-1.5 mr-3 mb-1.5 items-center">
                <input type="checkbox" disabled={ro} checked={arr.includes(o)} onChange={(e) => set(f.k, e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} /> {o}
              </label>
            ))}
          </div>
        );
      }
      case 'area':
        return <textarea id={`dc-${f.k}`} className="field" placeholder={f.ph} disabled={ro} value={(val(f.k) as string) ?? ''} onChange={(e) => set(f.k, e.target.value)} />;
      case 'date':
        return <input id={`dc-${f.k}`} type="date" className="field" disabled={ro} value={(val(f.k) as string) ?? ''} onChange={(e) => set(f.k, e.target.value)} />;
      case 'note':
        return <span className="muted text-[12.5px]">{f.note}</span>;
      case 'sig':
        return (
          <SignaturePad
            height={100}
            disabled={ro}
            value={v.sigDecl}
            onChange={async (d) => {
              const id = d ? await putMedia(await dataURLToBlob(d), 'assinatura-declaracao.png') : undefined;
              upd((x) => { x.sigDecl = id; });
            }}
          />
        );
    }
  };

  const dark = { background: 'var(--ink-2)', borderColor: '#2d4f37', color: '#fff', font: '800 20px Montserrat' };
  return (
    <div>
      <div className="backbar"><h2>Declaração de Capacidade Operacional</h2>{v.capAno && v.capDia && v.sigDecl ? <span className="tag ok">Completa</span> : <span className="tag warn">Pendente</span>}</div>
      <div className="card pad mb-3.5 border-0" style={{ background: 'linear-gradient(135deg,var(--ink),#0c3a24)', color: '#fff' }}>
        <div className="flex justify-between gap-4 flex-wrap items-end">
          <div>
            <span className="tag dark">Conclusão da Declaração</span>
            <h3 className="mt-2.5 mb-1 text-[18px] font-bold">Capacidade operacional do grupo</h3>
            <p className="text-[13px] text-[#b9cbbd]">Com base na estrutura verificada na unidade de triagem visitada.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 w-full max-w-[440px]">
            <div className="fl"><label className="!text-[#b9cbbd]">Capacidade máxima (t/ano) <span className="req">Obrig.</span></label><input id="cap-ano" type="number" className="field" style={dark} placeholder="0" disabled={ro} value={v.capAno} onChange={(e) => upd((x) => { x.capAno = e.target.value; })} /></div>
            <div className="fl"><label className="!text-[#b9cbbd]">Produção média (colab./dia) <span className="req">Obrig.</span></label><input id="cap-dia" type="number" className="field" style={dark} placeholder="0" disabled={ro} value={v.capDia} onChange={(e) => upd((x) => { x.capDia = e.target.value; })} /></div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="pad border-b border-[var(--line)] bg-[#f8fde8] text-[13px]">Use "Não aplicável", "N/A" ou "Não possui" quando for o caso. <b className="text-[var(--danger)]">Sem assinatura o documento não é aceito.</b></div>
        {DECL.map(([t, rows]) => (
          <div key={t}>
            <div className="pad pb-0"><h3 className="text-[15px] font-bold text-[var(--leaf-d)]">{t}</h3></div>
            {rows.map((f) => (
              <div key={f.k} className="ci dq">
                <label className="font-semibold text-[13px]">{f.l} {TAG[f.r]}</label>
                <div>{campo(f)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
