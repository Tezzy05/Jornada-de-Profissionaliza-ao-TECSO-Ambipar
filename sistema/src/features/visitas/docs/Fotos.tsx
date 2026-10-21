import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { capturarFoto, capturarVideo } from '@/lib/upload';
import { MediaThumb, toast } from '@/components/ui';
import type { Slot } from '@/lib/types';
import { CENAS, phTotals, sceneReq } from '../dco';
import type { DocProps } from './types';

export default function Fotos({ v, ro, upd, online }: DocProps) {
  const [g, n] = phTotals(v);

  const preencher = async (i: number, k: 'h' | 'v' | 'vid') => {
    if (ro) return toast('Somente o técnico da visita registra fotos, e só enquanto a visita está em aberto', true);
    if (k === 'vid') {
      const r = await capturarVideo();
      if (!r) return;
      upd((x) => { x.ph[i].vid = { id: r.id, kind: 'vid' }; });
    } else {
      const r = await capturarFoto();
      if (!r) return;
      const land = r.w > r.h;
      if (k === 'h' && !land) return toast('Essa foto está na vertical. Use o espaço "Vertical" ou tire na horizontal.', true);
      if (k === 'v' && land) return toast('Essa foto está na horizontal. Use o espaço "Vertical" só com foto em pé.', true);
      upd((x) => { x.ph[i][k] = { id: r.id, kind: 'img' }; });
    }
    toast(online ? 'Registro salvo e sincronizado' : 'Registro salvo no dispositivo');
  };

  const slot = (i: number, k: 'h' | 'v' | 'vid', label: string, s: Slot | null) =>
    s ? (
      <button className={cn('slot fill', k)} onClick={() => preencher(i, k)} aria-label={`Trocar ${label}`}>
        <MediaThumb id={s.id} kind={s.kind} className="!absolute inset-0" />
        <span className="sl">{label}</span>
      </button>
    ) : (
      <button className={cn('slot need', k)} onClick={() => preencher(i, k)}>
        <span><Plus className="w-4 h-4 mx-auto" />{label}<span className="rq">{k === 'h' ? 'OBRIGATÓRIO' : 'OBRIG.'}</span></span>
      </button>
    );

  return (
    <div>
      <div className="backbar"><h2>Registro fotográfico · 14 cenas</h2><span className="tag tnum">{g} de {n} registros obrigatórios</span></div>
      <div className="info mb-3.5">
        Toque num espaço para tirar ou escolher a foto. O sistema confere se a foto está <b>na horizontal ou na vertical</b>. Espaços em vermelho são <b>obrigatórios</b>: a cena só fica completa com todos preenchidos, ou marcada como "Não possui" com justificativa.
      </div>
      <div className="photos">
        {CENAS.map(([nome, obs, vid], i) => {
          const p = v.ph[i];
          const [a, b] = sceneReq(v, i);
          return (
            <div key={i} className={cn('card ph', p.na && 'isna')}>
              <div className="t">
                <div><small>Cena {String(i + 1).padStart(2, '0')}</small><br /><b>{nome}</b></div>
                {p.na ? <span className="tag">Não possui</span> : a >= b ? <span className="tag ok">Completa</span> : <span className="tag warn">Pendente</span>}
              </div>
              <div className="obs"><b>O que a foto deve conter</b>{obs}<br /><span className="text-[#a3281b] font-semibold">Obrigatório: foto horizontal + vertical{vid ? ' + vídeo narrado' : ''}</span></div>
              <div className="slots">
                {slot(i, 'h', 'Horizontal', p.h)}
                {slot(i, 'v', 'Vertical', p.v)}
                {vid ? slot(i, 'vid', 'Vídeo', p.vid) : <div />}
              </div>
              <div className="st">
                <label className="na">
                  <input type="checkbox" id={`na-${i}`} disabled={ro} checked={p.na} onChange={(e) => upd((x) => { x.ph[i].na = e.target.checked; })} /> Não possui
                </label>
                <span className="muted tnum">{p.na ? '' : `${a}/${b}`}</span>
                {a > 0 && !p.na && (online ? <span className="tag ok">Sincronizado</span> : <span className="tag warn">Na fila</span>)}
              </div>
              {p.na && (
                <input id={`just-${i}`} className="field mt-2" disabled={ro} placeholder="Justificativa (obrigatória)" value={p.just} onChange={(e) => upd((x) => { x.ph[i].just = e.target.value; })} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
