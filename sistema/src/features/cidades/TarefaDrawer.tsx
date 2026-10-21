import { useState } from 'react';
import { Paperclip, Plus, Send, Trash2, Download, Phone, CornerDownRight } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { useMe } from '@/store/scope';
import { fmtDateTime, fmtShort, nowISO, today } from '@/lib/dates';
import { cn, saveBlob, uid } from '@/lib/utils';
import { getMediaBlob } from '@/lib/media';
import { anexarArquivo } from '@/lib/upload';
import { Avatar, confirmar, Drawer, Field, MediaThumb, Modal, toast } from '@/components/ui';
import type { Prioridade, StatusTarefa, Tarefa } from '@/lib/types';
import { AREAS, cmpCodigo, PRIORIDADES, PRIO_CLS, SIT_CLS, situacaoPrazo, STATUS_CLS, STATUS_TAREFA } from './constants';
import { podeAtualizar, respLabel } from './logic';
import { RespSelect } from './shared';
import { trocarResponsavel } from '@/components/TecnicoSelect';

export function proximoCodigo(irmaos: { codigo: string }[], prefixo: string) {
  const n = irmaos.map((t) => Number(t.codigo.split('.').pop())).filter((x) => !isNaN(x));
  return `${prefixo}.${(n.length ? Math.max(...n) : 0) + 1}`;
}

export default function TarefaDrawer({ id, onClose, onNovoItem }: { id: string | null; onClose: () => void; onNovoItem: (parentId: string) => void }) {
  const db = useDB();
  const me = useMe()!;
  const [coment, setComent] = useState('');
  const t = db.tarefas.find((x) => x.id === id);
  if (!t) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const p = db.projetos.find((x) => x.id === t.projetoId)!;
  const top = db.topicos.find((x) => x.id === t.topicoId);
  const gere = me.perms.includes('cidades.gerir');
  const pode = podeAtualizar(me.id, me.perms, t);
  const r = respLabel(db, t.responsavel, p.id);
  const sit = situacaoPrazo(t);
  const filhos = db.tarefas.filter((x) => x.parentId === t.id).sort((a, b) => cmpCodigo(a.codigo, b.codigo));
  const pai = db.tarefas.find((x) => x.id === t.parentId);

  const upd = (fn: (x: Tarefa) => void) => db.mut((d) => { fn(d.tarefas.find((x) => x.id === t.id)!); });
  const setStatus = (s: StatusTarefa) =>
    upd((x) => {
      x.status = s;
      if (s === 'Concluída' && !x.dataConclusao) x.dataConclusao = today();
      if (s !== 'Concluída') x.dataConclusao = undefined;
      x.comentarios.push({ id: uid(), por: me.id, em: nowISO(), texto: `Status alterado para "${s}"` });
    });

  return (
    <Drawer
      open={!!t}
      onClose={onClose}
      title={t.demanda}
      sub={<>{p.sigla}-{t.codigo} · {top?.codigo}. {top?.titulo}{pai && <> › {pai.codigo} {pai.demanda}</>}</>}
      footer={
        gere ? (
          <button
            className="btn danger sm mr-auto"
            onClick={async () => {
              if (!(await confirmar('Excluir demanda', filhos.length ? `A demanda e os ${filhos.length} itens dela serão excluídos.` : 'A demanda será excluída do projeto.', 'Excluir', true))) return;
              db.mut((d) => { d.tarefas = d.tarefas.filter((x) => x.id !== t.id && x.parentId !== t.id); });
              log('projeto', `Demanda excluída: ${p.sigla}-${t.codigo} ${t.demanda}`, p.id);
              toast('Demanda excluída');
              onClose();
            }}
          >
            <Trash2 /> Excluir
          </button>
        ) : undefined
      }
    >
      <div className="flex gap-1.5 flex-wrap">
        <span className={`tag ${STATUS_CLS[t.status]}`}>{t.status}</span>
        <span className={`tag ${SIT_CLS[sit]}`}>{sit}</span>
        <span className={`tag ${PRIO_CLS[t.prioridade]}`}>Prioridade {t.prioridade}</span>
        <span className="tag">{t.parentId ? 'Item da subtarefa' : 'Subtarefa'}</span>
      </div>

      {(pode || gere) && (
        <div>
          <span className="lbl block mb-1.5">Atualizar status</span>
          <div className="seg flex-wrap">
            {STATUS_TAREFA.map((s) => (
              <button key={s} className={cn(t.status === s && 'on')} onClick={() => t.status !== s && setStatus(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="panel p-3.5 flex gap-3 items-start">
        {r.externo ? (
          <span className="w-9 h-9 rounded-full bg-[#efe9fb] text-[#5b3d9a] grid place-items-center flex-none"><Phone className="w-4 h-4" /></span>
        ) : (
          <Avatar u={db.users.find((u) => 'u:' + u.id === t.responsavel)} size="sm" />
        )}
        <div className="min-w-0 text-[13px]">
          <span className="lbl block">Responsável</span>
          <b>{r.nome}</b> {r.tipo && <span className={cn('tag ml-1', r.externo ? 'violet' : '')}>{r.externo ? `Externo · ${r.tipo}` : r.tipo}</span>}
          {r.externo && (
            <>
              {'org' in r && r.org && <div className="muted">{r.org}</div>}
              <div className="select-all">{r.contato || <span className="text-[var(--danger)]">Contato não informado</span>}</div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Demanda" className="col-span-2"><input id="tk-dem" className="field" disabled={!gere} value={t.demanda} onChange={(e) => upd((x) => { x.demanda = e.target.value; })} /></Field>
        <Field label="Data de Entrada"><input id="tk-ent" type="date" className="field" disabled={!gere} value={t.dataEntrada} onChange={(e) => upd((x) => { x.dataEntrada = e.target.value; })} /></Field>
        <Field label="Solicitante"><input id="tk-sol" className="field" disabled={!gere} value={t.solicitante} onChange={(e) => upd((x) => { x.solicitante = e.target.value; })} /></Field>
        <Field label="Área">
          <select id="tk-area" className="field" disabled={!gere} value={t.area} onChange={(e) => upd((x) => { x.area = e.target.value; })}>{[...new Set([...AREAS, t.area])].map((a) => <option key={a}>{a}</option>)}</select>
        </Field>
        <Field label="Prioridade">
          <select id="tk-prio" className="field" disabled={!gere} value={t.prioridade} onChange={(e) => upd((x) => { x.prioridade = e.target.value as Prioridade; })}>{PRIORIDADES.map((a) => <option key={a}>{a}</option>)}</select>
        </Field>
        <Field label="Responsável" className="col-span-2"><RespSelect id="tk-resp" projeto={p} disabled={!gere} value={t.responsavel} onChange={(v) => { upd((x) => { x.responsavel = v; x.comentarios.push({ id: uid(), por: me.id, em: nowISO(), texto: `Responsável alterado para ${respLabel(db, v, p.id).nome}` }); }); if (v.startsWith('u:')) trocarResponsavel(v.slice(2), p.id, `a demanda ${p.sigla}-${t.codigo}`); }} /></Field>
        <Field label="Prazo"><input id="tk-prazo" type="date" className="field" disabled={!gere} value={t.prazo ?? ''} onChange={(e) => upd((x) => { x.prazo = e.target.value || undefined; })} /></Field>
        <Field label="Data de Conclusão"><input id="tk-conc" type="date" className="field" disabled={!(pode || gere) || t.status !== 'Concluída'} value={t.dataConclusao ?? ''} onChange={(e) => upd((x) => { x.dataConclusao = e.target.value || undefined; })} /></Field>
        <Field label="Situação de Prazo"><input className="field" disabled value={sit} /></Field>
        <Field label="ID"><input className="field" disabled value={`${p.sigla}-${t.codigo}`} /></Field>
        <Field label="Observações" className="col-span-2"><textarea id="tk-obs" className="field" disabled={!(pode || gere)} value={t.observacoes} onChange={(e) => upd((x) => { x.observacoes = e.target.value; })} /></Field>
      </div>

      {!t.parentId && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="lbl">Itens desta subtarefa ({filhos.length})</span>
            {gere && <button className="btn ghost xs" onClick={() => onNovoItem(t.id)}><Plus /> Item</button>}
          </div>
          {filhos.length ? (
            <div className="panel">
              {filhos.map((f) => {
                const rf = respLabel(db, f.responsavel, p.id);
                return (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 border-[var(--line)] text-[13px]">
                    <CornerDownRight className="w-3.5 h-3.5 muted flex-none" />
                    <span className="tnum muted">{f.codigo}</span>
                    <span className="flex-1 min-w-0 truncate">{f.demanda}</span>
                    <span className="muted text-[12px] truncate max-w-[120px]">{rf.nome}</span>
                    <span className={`tag ${STATUS_CLS[f.status]}`}>{f.status}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted text-[12.5px]">Sem itens.</p>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="lbl">Anexos ({t.anexos.length})</span>
          {(pode || gere) && (
            <button className="btn ghost xs" onClick={async () => { const a = await anexarArquivo(me.id); if (a) { upd((x) => { x.anexos.push(a); }); toast('Anexo incluído'); } }}><Paperclip /> Anexar</button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {t.anexos.map((a) => (
            <button key={a.id} className="panel overflow-hidden text-left" onClick={async () => { const b = await getMediaBlob(a.mediaId); if (b) saveBlob(b, a.nome); }} title="Baixar">
              <MediaThumb id={a.mediaId} kind={a.mime.startsWith('image/') ? 'img' : 'doc'} className="h-16" />
              <div className="px-2 py-1 text-[11px] truncate flex items-center gap-1"><Download className="w-3 h-3 flex-none" />{a.nome}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="lbl block mb-1.5">Comentários e histórico</span>
        <div className="grid gap-2">
          {[...t.comentarios].reverse().map((c) => {
            const u = db.users.find((x) => x.id === c.por);
            return (
              <div key={c.id} className="flex gap-2 text-[13px]">
                <Avatar u={u} size="xs" />
                <div className="min-w-0"><b>{u?.nome}</b> <span className="muted text-[11.5px]">{fmtDateTime(c.em)}</span><div>{c.texto}</div></div>
              </div>
            );
          })}
          {t.comentarios.length === 0 && <span className="muted text-[12.5px]">Nenhum comentário.</span>}
        </div>
        {(pode || gere) && (
          <div className="flex gap-2 mt-2">
            <input id="tk-com" className="field" placeholder={r.externo ? `Registrar retorno de ${r.nome}…` : 'Escrever comentário'} value={coment} onChange={(e) => setComent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && coment.trim() && (upd((x) => { x.comentarios.push({ id: uid(), por: me.id, em: nowISO(), texto: coment.trim() }); }), setComent(''))} />
            <button className="btn dark sm" disabled={!coment.trim()} onClick={() => { upd((x) => { x.comentarios.push({ id: uid(), por: me.id, em: nowISO(), texto: coment.trim() }); }); setComent(''); }}><Send /></button>
          </div>
        )}
      </div>
      <p className="muted text-[11.5px]">Criada em {fmtShort(t.criadaEm.slice(0, 10))}</p>
    </Drawer>
  );
}

export function NovaTarefaModal({ ctx, onClose }: { ctx: { projetoId: string; topicoId: string; parentId?: string } | null; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const blank = () => ({ demanda: '', solicitante: me.nome.split(' ').slice(0, 1).join(' ') + ' ' + me.nome.split(' ').slice(-1), area: 'TECSO', prioridade: 'Média' as Prioridade, status: 'A fazer' as StatusTarefa, responsavel: '', prazo: '', dataEntrada: today(), observacoes: '' });
  const [f, setF] = useState(blank);
  const [k, setK] = useState(JSON.stringify(ctx));
  if (k !== JSON.stringify(ctx)) {
    setK(JSON.stringify(ctx));
    setF(blank());
  }
  if (!ctx) return null;
  const p = db.projetos.find((x) => x.id === ctx.projetoId)!;
  const top = db.topicos.find((x) => x.id === ctx.topicoId)!;
  const pai = db.tarefas.find((x) => x.id === ctx.parentId);
  const irmaos = db.tarefas.filter((x) => x.topicoId === ctx.topicoId && (ctx.parentId ? x.parentId === ctx.parentId : !x.parentId));
  const codigo = proximoCodigo(irmaos, pai ? pai.codigo : top.codigo);
  const salvar = () => {
    if (!f.demanda.trim()) return toast('Descreva a demanda', true);
    if (!f.responsavel) return toast('Escolha o responsável', true);
    db.mut((d) => {
      d.tarefas.push({ id: 'tk_' + uid(), projetoId: p.id, topicoId: top.id, parentId: pai?.id, codigo, ...f, prazo: f.prazo || undefined, demanda: f.demanda.trim(), anexos: [], comentarios: [], criadaEm: nowISO() });
    });
    toast(pai ? `Item ${p.sigla}-${codigo} criado` : `Subtarefa ${p.sigla}-${codigo} criada`);
    onClose();
  };
  return (
    <Modal
      open={!!ctx}
      onClose={onClose}
      title={pai ? `Novo item em ${pai.codigo} ${pai.demanda}` : `Nova subtarefa em ${top.codigo}. ${top.titulo}`}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Criar {p.sigla}-{codigo}</button></>}
    >
      <Field label="Demanda" req><input id="nt-dem" className="field" value={f.demanda} onChange={(e) => setF({ ...f, demanda: e.target.value })} /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Responsável" req><RespSelect id="nt-resp" projeto={p} value={f.responsavel} onChange={(v) => setF({ ...f, responsavel: v })} /></Field>
        <Field label="Prazo"><input id="nt-prazo" type="date" className="field" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} /></Field>
        <Field label="Solicitante"><input id="nt-sol" className="field" value={f.solicitante} onChange={(e) => setF({ ...f, solicitante: e.target.value })} /></Field>
        <Field label="Área"><select id="nt-area" className="field" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Prioridade"><select id="nt-prio" className="field" value={f.prioridade} onChange={(e) => setF({ ...f, prioridade: e.target.value as Prioridade })}>{PRIORIDADES.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Data de Entrada"><input id="nt-ent" type="date" className="field" value={f.dataEntrada} onChange={(e) => setF({ ...f, dataEntrada: e.target.value })} /></Field>
      </div>
      <Field label="Observações" opt><textarea id="nt-obs" className="field" value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></Field>
    </Modal>
  );
}
