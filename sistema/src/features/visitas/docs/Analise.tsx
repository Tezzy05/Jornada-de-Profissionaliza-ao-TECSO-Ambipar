import { useState } from 'react';
import { Camera, Lock } from 'lucide-react';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { capturarFoto } from '@/lib/upload';
import { CheckBox, MediaThumb, toast } from '@/components/ui';
import { EIXOS, chkTotals, eixoPct } from '../dco';
import type { DocProps } from './types';

export default function Analise({ v, ro, upd, me, onFotos }: DocProps & { onFotos: () => void }) {
  const [eixo, setEixo] = useState(1);
  const seesDH = can(me, 'dados.eixo8');
  const e = EIXOS.find((x) => x.n === eixo)!;
  const [d, t] = chkTotals(v, seesDH);

  return (
    <div>
      <div className="backbar"><h2>Análise Situacional</h2><span className="tag tnum">{d} de {t} itens</span></div>
      <div className="tabs mb-3.5">
        {EIXOS.map((x) => {
          const p = eixoPct(v, x);
          return (
            <button key={x.n} className={cn('tab', x.n === eixo && 'on')} onClick={() => setEixo(x.n)}>
              {x.dh && <Lock className="w-3 h-3" />}Eixo {x.n}
              {p !== null && (!x.dh || seesDH) && <span className="pc tnum">{p}%</span>}
            </button>
          );
        })}
      </div>

      {e.foto ? (
        <div className="card pad">
          <b className="font-display">Eixo 6 · Registro fotográfico</b>
          <p className="muted my-2">Este eixo é preenchido no documento próprio, com as 14 cenas obrigatórias.</p>
          <button className="btn pri" onClick={onFotos}>Abrir registro fotográfico →</button>
        </div>
      ) : e.dh && !seesDH ? (
        <div className="card text-center py-12 muted">
          <Lock className="mx-auto mb-2" />
          <h3 className="text-[var(--text)]">Acesso restrito</h3>
          <p>O Eixo 8 é visível apenas para o técnico, a coordenação e a Gestão.</p>
        </div>
      ) : (
        <>
          {e.dh ? (
            <div className="conf mb-3.5">
              <Lock className="w-5 h-5 flex-none text-[var(--lime)]" />
              <div><b>Eixo confidencial</b><br /><span className="text-[13px]">Preencher só por observação pessoal, sem perguntas diretas ao grupo. Não sai em nenhum material devolvido à cooperativa.</span></div>
            </div>
          ) : (
            <div className="info mb-3.5"><b className="font-display">Eixo {e.n} · {e.t}</b> — {e.req}</div>
          )}
          <div className="card">
            {e.itens.map((it, i) => {
              const k = `${e.n}-${i}`;
              const c = v.chk[k];
              return (
                <div key={k} className="ci">
                  <div className="l" onClick={() => !ro && upd((x) => { x.chk[k].ok = !x.chk[k].ok; })}>
                    <CheckBox on={c.ok} disabled={ro} label={it} />
                    <span className="lt">{it}</span>
                    {c.fotos.length > 0 && <span className="tag blue"><Camera /> {c.fotos.length}</span>}
                  </div>
                  <div className="ex">
                    <div className="grid gap-2">
                      {e.cond && (
                        <div className="grid grid-cols-2 gap-2">
                          <select id={`infra-${k}`} className="field" disabled={ro} value={c.infra ?? ''} onChange={(ev) => upd((x) => { x.chk[k].infra = ev.target.value; })} aria-label="Infraestrutura">
                            <option value="">Infraestrutura…</option>
                            {['Adequada', 'Regular', 'Inadequada', 'Não possui'].map((o) => <option key={o}>{o}</option>)}
                          </select>
                          <select id={`limp-${k}`} className="field" disabled={ro} value={c.limpeza ?? ''} onChange={(ev) => upd((x) => { x.chk[k].limpeza = ev.target.value; })} aria-label="Limpeza">
                            <option value="">Limpeza…</option>
                            {['Adequada', 'Regular', 'Inadequada', 'Não possui'].map((o) => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                      )}
                      {e.risco && (
                        <textarea id={`cond-${k}`} className="field" disabled={ro} placeholder="Condição atual" value={c.cond ?? ''} onChange={(ev) => upd((x) => { x.chk[k].cond = ev.target.value; })} />
                      )}
                      <textarea
                        id={`obs-${k}`}
                        className="field"
                        disabled={ro}
                        placeholder={e.dh ? 'Observação reservada do técnico' : e.risco ? 'Potenciais riscos / observação' : 'Observação (opcional)'}
                        value={c.obs}
                        onChange={(ev) => upd((x) => { x.chk[k].obs = ev.target.value; })}
                      />
                    </div>
                    {!ro && (
                      <button
                        className="photo-btn"
                        onClick={async () => {
                          const f = await capturarFoto();
                          if (!f) return;
                          upd((x) => { x.chk[k].fotos.push(f.id); });
                          toast('Foto anexada ao item');
                        }}
                      >
                        <Camera /> Foto <span className="opt !m-0">opcional</span>
                      </button>
                    )}
                  </div>
                  {c.fotos.length > 0 && (
                    <div className="thumbs">
                      {c.fotos.map((f) => <MediaThumb key={f} id={f} kind="img" />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
