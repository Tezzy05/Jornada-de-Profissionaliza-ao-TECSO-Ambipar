import { useState } from 'react';
import { Copy, Paperclip, Send, CheckCircle2, FileText, Download } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { fmt, fmtDateTime, nowISO } from '@/lib/dates';
import { anexarArquivo } from '@/lib/upload';
import { getMediaBlob } from '@/lib/media';
import { saveBlob } from '@/lib/utils';
import { CheckBox, confirmar, Field, toast } from '@/components/ui';
import { delivItems, termosOk } from '../dco';
import type { DocProps } from './types';

export default function Entrega({ v, ro, upd, me }: DocProps) {
  const db = useDB();
  const coop = db.coops.find((c) => c.id === v.coopId)!;
  const tec = db.users.find((u) => u.id === v.tecnicoId);
  const itens = delivItems(v);
  const tudo = itens.every((i) => i[1]);
  const [dest, setDest] = useState(v.plano.destinatario);
  const mentoria = db.mentorias.filter((m) => m.coopId === v.coopId).sort((a, b) => b.data.localeCompare(a.data))[0];

  const mail = `Assunto: Diagnóstico de Capacidade Operacional (DCO) – ${coop.nome} – Visita de campo realizada

Olá, informo que a visita de campo à ${coop.nome} foi realizada em ${fmt(v.data)} e os registros estão disponíveis no sistema.

Checklist de entrega: Análise Situacional preenchida; Declaração de Capacidade Operacional assinada; Relatório de Campo assinado; ${termosOk(v)} Termos de Uso de Imagem assinados e digitalizados; inventário de equipamentos com fotos; ${v.plano.enviadoEm ? `plano de ação entregue em ${fmtDateTime(v.plano.enviadoEm)}` : 'plano de ação ainda não entregue'}.

Informações complementares: ${v.rel.info.trim() || 'Sem informações complementares.'}

${tec?.nome}`;

  return (
    <div>
      <div className="backbar"><h2>Entrega</h2>{tudo ? <span className="tag ok">Pronta para enviar</span> : <span className="tag warn">{itens.filter((i) => i[1]).length} de {itens.length} itens</span>}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-4 self-start">
          <div className="card pad">
            <h3 className="text-[15px] font-bold mb-1">Checklist de entrega</h3>
            {itens.map(([t, ok]) => (
              <div key={t} className="chk"><CheckBox on={ok} disabled label={t} /><span className={ok ? '' : 'muted'}>{t}</span></div>
            ))}
            {!ro && (
              <button
                className="btn dark w-full mt-4"
                disabled={!tudo}
                onClick={async () => {
                  if (!(await confirmar('Enviar para a coordenação', `A visita à ${coop.nome} vai para aprovação e deixa de ser editável, a menos que seja devolvida.`, 'Enviar'))) return;
                  upd((x) => {
                    x.status = 'enviada';
                    x.enviadaEm = nowISO();
                    x.devolucao = undefined;
                    x.hist.push({ em: nowISO(), por: me.id, acao: 'Enviada para a coordenação' });
                  });
                  db.mut((d) => {
                    const c = d.crono.find((x) => x.id === v.cronoId);
                    if (c && c.status !== 'Concluído') c.status = 'Concluído';
                  });
                  log('visita', `Visita DCO enviada para aprovação: ${coop.nome}`, v.id);
                  toast('Visita enviada para a coordenação');
                }}
              >
                <Send /> Enviar para a coordenação
              </button>
            )}
            {!ro && <p className="muted text-[12px] mt-2 text-center">Liberado quando todos os itens estiverem completos.</p>}
          </div>

          <div className="card pad grid gap-3">
            <div>
              <h3 className="text-[15px] font-bold">Entrega do plano de ação</h3>
              <p className="muted text-[12.5px]">Anexe o plano entregue à cooperativa e confirme o envio.</p>
            </div>
            {mentoria && (
              <div className="info text-[12.5px]">Plano construído na mentoria online de {fmt(mentoria.data)} ({mentoria.acoes.length} ações).</div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {v.plano.anexo ? (
                <button className="tag ok !py-1.5" onClick={async () => { const b = await getMediaBlob(v.plano.anexo!.mediaId); if (b) saveBlob(b, v.plano.anexo!.nome); }}>
                  <FileText /> {v.plano.anexo.nome} <Download />
                </button>
              ) : (
                <span className="tag warn">Sem anexo</span>
              )}
              {!ro && !v.plano.enviadoEm && (
                <button className="photo-btn" onClick={async () => { const a = await anexarArquivo(me.id); if (a) { upd((x) => { x.plano.anexo = a; }); toast('Plano de ação anexado'); } }}>
                  <Paperclip /> {v.plano.anexo ? 'Trocar anexo' : 'Anexar plano de ação'}
                </button>
              )}
            </div>
            <Field label="Enviado para (nome e contato)">
              <input id="plano-dest" className="field" disabled={ro || !!v.plano.enviadoEm} value={dest} onChange={(e) => setDest(e.target.value)} onBlur={() => upd((x) => { x.plano.destinatario = dest; })} />
            </Field>
            {v.plano.enviadoEm ? (
              <div className="alert !bg-[#e1f4e6] !border-[#bfe3c9] !text-[#1d6a33] flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 flex-none mt-0.5" />
                <span>Envio confirmado em <b>{fmtDateTime(v.plano.enviadoEm)}</b> por {db.users.find((u) => u.id === v.plano.enviadoPor)?.nome}, para {v.plano.destinatario}.</span>
              </div>
            ) : (
              !ro && (
                <button
                  className="btn pri justify-self-start"
                  disabled={!v.plano.anexo}
                  onClick={async () => {
                    if (!(await confirmar('Confirmar envio do plano de ação', `Registrar que o plano de ação foi enviado para ${dest || 'a cooperativa'} agora (${fmtDateTime(nowISO())})?`, 'Confirmar envio'))) return;
                    upd((x) => {
                      x.plano.destinatario = dest;
                      x.plano.enviadoEm = nowISO();
                      x.plano.enviadoPor = me.id;
                      x.hist.push({ em: nowISO(), por: me.id, acao: 'Plano de ação entregue', detalhe: `Para ${dest}` });
                    });
                    toast('Envio do plano de ação registrado com data e hora');
                  }}
                >
                  <Send /> Confirmar envio
                </button>
              )
            )}
          </div>
        </div>

        <div className="card pad self-start">
          <h3 className="text-[15px] font-bold mb-3">E-mail de conclusão</h3>
          <div className="text-[13px] bg-[#fafbf8] border border-[var(--line)] rounded-[10px] p-3.5 whitespace-pre-wrap">{mail}</div>
          <button
            className="btn ghost mt-3"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(mail);
                toast('Texto do e-mail copiado');
              } catch {
                toast('Não foi possível copiar automaticamente. Selecione o texto e copie.', true);
              }
            }}
          >
            <Copy /> Copiar texto
          </button>
        </div>
      </div>
    </div>
  );
}
