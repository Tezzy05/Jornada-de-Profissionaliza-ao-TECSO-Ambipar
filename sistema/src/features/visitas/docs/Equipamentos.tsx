import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { uid } from '@/lib/utils';
import { capturarFoto } from '@/lib/upload';
import { Field, MediaThumb, toast } from '@/components/ui';
import type { Equip } from '@/lib/types';
import { EQ_TIPOS } from '../dco';
import type { DocProps } from './types';

export default function Equipamentos({ v, ro, upd, online }: DocProps) {
  const blank = { tipo: 'Prensa', qtd: 1, cap: '', esp: '', est: 'Operando' as Equip['est'], nr: 'Sim' as Equip['nr'], dano: '' };
  const [f, setF] = useState(blank);
  const comFoto = v.eq.filter((e) => e.foto).length;

  const adicionar = () => {
    if (!f.esp.trim()) return toast('Preencha a especificação/modelo', true);
    if (f.est !== 'Operando' && !f.dano.trim()) return toast('Descreva os danos observados', true);
    upd((x) => { x.eq.push({ id: uid(), ...f, qtd: Math.max(1, +f.qtd || 1), dano: f.est === 'Operando' ? '' : f.dano, foto: null }); });
    setF(blank);
    toast('Equipamento adicionado. Agora registre a foto dele.');
  };
  const foto = async (id: string) => {
    if (ro) return toast('Somente o técnico da visita registra fotos', true);
    const r = await capturarFoto();
    if (!r) return;
    upd((x) => { x.eq.find((e) => e.id === id)!.foto = { id: r.id, kind: 'img' }; });
    toast('Foto do equipamento salva');
  };

  return (
    <div>
      <div className="backbar"><h2>Equipamentos</h2><span className="tag tnum">{comFoto} de {v.eq.length} com foto</span></div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="card">
          <div className="pad pb-2 flex justify-between items-center gap-3 flex-wrap"><h3 className="m-0 text-[15px] font-bold">Inventário do grupo</h3><span className="muted text-[12px]">Cada equipamento gera uma foto obrigatória</span></div>
          {v.eq.length === 0 && <p className="pad muted">Nenhum equipamento cadastrado.</p>}
          {v.eq.map((e) => (
            <div key={e.id} className="eq">
              {e.foto ? (
                <button className="slot fill" onClick={() => foto(e.id)} aria-label="Trocar foto"><MediaThumb id={e.foto.id} kind="img" className="!absolute inset-0" /><span className="sl">Foto</span></button>
              ) : (
                <button className="slot need" onClick={() => foto(e.id)}><span><Plus className="w-4 h-4 mx-auto" />Foto<span className="rq">OBRIG.</span></span></button>
              )}
              <div className="min-w-0">
                <b className="font-display">{e.tipo} × {e.qtd}</b>
                <div className="muted text-[12.5px]">{e.esp}{e.cap ? ' · ' + e.cap : ''}</div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className={`tag ${e.est === 'Operando' ? 'ok' : e.est === 'Parado' ? 'red' : 'warn'}`}>{e.est}</span>
                  <span className="tag">NR: {e.nr}</span>
                  {e.dano && <span className="tag red">{e.dano}</span>}
                </div>
              </div>
              <div className="act flex items-center gap-2">
                {e.foto ? (online ? <span className="tag ok">Sincronizado</span> : <span className="tag warn">Na fila</span>) : <span className="tag warn">Foto pendente</span>}
                {!ro && (
                  <button className="icon-btn" aria-label="Remover equipamento" onClick={() => upd((x) => { x.eq = x.eq.filter((y) => y.id !== e.id); })}><Trash2 /></button>
                )}
              </div>
            </div>
          ))}
        </div>
        {!ro && (
          <div className="card pad self-start grid gap-2.5">
            <h3 className="text-[15px] font-bold">Adicionar equipamento</h3>
            <Field label="Tipo" req>
              <select id="eq-tipo" className="field" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{EQ_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Quantidade" req><input id="eq-qtd" type="number" min={1} className="field" value={f.qtd} onChange={(e) => setF({ ...f, qtd: +e.target.value })} /></Field>
              <Field label="Capacidade" opt><input id="eq-cap" className="field" placeholder="ex.: 500 kg" value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value })} /></Field>
            </div>
            <Field label="Especificação / modelo" req><input id="eq-esp" className="field" placeholder="ex.: Prensa vertical hidráulica 15 t" value={f.esp} onChange={(e) => setF({ ...f, esp: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Estado" req>
                <select id="eq-est" className="field" value={f.est} onChange={(e) => setF({ ...f, est: e.target.value as Equip['est'] })}>
                  <option>Operando</option><option>Operando com danos</option><option>Parado</option>
                </select>
              </Field>
              <Field label="Conforme NR" req>
                <select id="eq-nr" className="field" value={f.nr} onChange={(e) => setF({ ...f, nr: e.target.value as Equip['nr'] })}>
                  <option>Sim</option><option>Não</option><option>Não avaliado</option>
                </select>
              </Field>
            </div>
            {f.est !== 'Operando' && (
              <Field label="Danos observados" req><input id="eq-dano" className="field" value={f.dano} onChange={(e) => setF({ ...f, dano: e.target.value })} /></Field>
            )}
            <button className="btn pri" onClick={adicionar}><Plus /> Adicionar ao inventário</button>
          </div>
        )}
      </div>
    </div>
  );
}
