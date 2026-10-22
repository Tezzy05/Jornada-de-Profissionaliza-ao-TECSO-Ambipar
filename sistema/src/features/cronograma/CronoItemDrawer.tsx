import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CalendarClock, XCircle, PlayCircle, ArrowRight, MapPin, Trash2 } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmt, fmtShort, weekdayName } from '@/lib/dates';
import { uid } from '@/lib/utils';
import { Avatar, confirmar, Drawer, Field, toast } from '@/components/ui';
import { statusEfetivo, stTag } from './logic';
import { criarVisita } from '@/features/visitas/actions';
import { integracaoStatus } from '@/features/aceleracao/logic';
import { STATUS_VISITA } from '@/features/visitas/dco';
import { TecnicoSelect, trocarResponsavel } from '@/components/TecnicoSelect';
import { nivel, NOME_NIVEL, pessoasDoItem, podeAprovar, situacao } from '@/lib/hierarquia';
import { fmtDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { BotoesAprovacao } from './aprovacao';

export default function CronoItemDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const nav = useNavigate();
  const [reag, setReag] = useState<{ data: string; ini: string; fim: string } | null>(null);
  const item = db.crono.find((c) => c.id === id);
  if (!item) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;

  const tec = db.users.find((u) => u.id === item.tecnicoId);
  const coop = db.coops.find((c) => c.id === item.coopId);
  const proj = db.projetos.find((p) => p.id === item.projetoId);
  const st = statusEfetivo(item);
  const podeEditar = me.perfil === 'adm' || item.tecnicoId === me.id || nivel(me) > nivel(tec);
  const souTecnico = item.tecnicoId === me.id && can(me, 'visitas.preencher');
  const visita = db.visitas.find((v) => v.id === item.visitaId);
  const aberta = !visita && coop ? db.visitas.filter((v) => v.coopId === coop.id && v.tecnicoId === item.tecnicoId && (v.status === 'rascunho' || v.status === 'devolvida')).sort((a, b) => b.data.localeCompare(a.data))[0] : undefined;
  const ig = coop ? integracaoStatus(db, coop.id) : null;
  const ehVisita = item.tipo === 'Visita DCO' || item.tipo === 'Retorno ao grupo';

  const setStatus = (s: typeof item.status, obs?: string) =>
    db.mut((d) => {
      const c = d.crono.find((x) => x.id === item.id)!;
      c.status = s;
      if (obs) c.obs = c.obs ? `${c.obs} · ${obs}` : obs;
    });

  const iniciar = () => {
    const r = criarVisita({ coopId: item.coopId!, tecnicoId: me.id, data: item.data, endereco: item.endereco, cronoId: item.id, projetoId: item.projetoId });
    if ('erro' in r) return toast(r.erro, true);
    toast('Visita criada em rascunho. Os 7 documentos estão prontos para preencher.');
    onClose();
    nav(`/visitas/${r.id}`);
  };

  return (
    <Drawer
      open={!!item}
      onClose={() => { setReag(null); onClose(); }}
      title={coop?.nome ?? item.tipo}
      sub={`${weekdayName(item.data)} ${fmt(item.data)} · ${item.ini}–${item.fim}`}
      footer={
        podeEditar && !['Concluído', 'Cancelado', 'Reagendado'].includes(item.status) ? (
          <>
            <button
              className="btn ghost sm"
              onClick={async () => {
                if (await confirmar('Cancelar item', 'O item fica riscado no cronograma e não conta no andamento da semana.', 'Cancelar item', true)) {
                  setStatus('Cancelado');
                  toast('Item cancelado');
                }
              }}
            >
              <XCircle /> Cancelar
            </button>
            <button className="btn ghost sm" onClick={() => setReag({ data: item.data, ini: item.ini, fim: item.fim })}><CalendarClock /> Reagendar</button>
            <button className="btn dark sm" onClick={() => { setStatus('Concluído'); toast('Item concluído. O andamento da semana foi atualizado.'); }}><CheckCircle2 /> Marcar como concluído</button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-2">
        <span className={`tag ${stTag(st)}`}>{st}</span>
        <span className="tag">{item.tipo}</span>
        {proj && <span className="tag blue">{proj.nome}</span>}
      </div>
      <div className="grid gap-2 text-[13.5px]">
        <div className="flex items-center gap-2">
          <Avatar u={tec} size="sm" />
          {tec?.perfil === 'tecnico' && podeEditar && (can(me, 'aceleracao.responsaveis') || can(me, 'crono.editarTodos')) ? (
            <TecnicoSelect
              id="crono-item-tec"
              className="!w-auto !py-1.5"
              value={item.tecnicoId}
              onChange={(id) => {
                db.mut((d) => {
                  const c = d.crono.find((x) => x.id === item.id)!;
                  c.tecnicoId = id;
                  const v = d.visitas.find((x) => x.id === c.visitaId);
                  if (v && v.status !== 'aprovada') v.tecnicoId = id;
                });
                trocarResponsavel(id, item.projetoId, `o item de ${fmtShort(item.data)} no cronograma`);
              }}
            />
          ) : (
            <span><b>{tec?.nome}</b><span className="muted"> · {tec?.cargo}</span></span>
          )}
        </div>
        {coop && (
          <div className="flex items-center gap-2 muted"><MapPin className="w-4 h-4" /> {item.endereco ?? 'Matriz'} · {coop.enderecos.find((e) => e.tipo === (item.endereco ?? 'Matriz'))?.end ?? coop.enderecos[0]?.end} · {coop.cidade}/{coop.uf}</div>
        )}
        {item.obs && <div className="info">{item.obs}</div>}
      </div>

      <div>
        <span className="lbl block mb-1.5">Participantes</span>
        <div className="panel">
          {pessoasDoItem(item).map((p) => {
            const u = db.users.find((x) => x.id === p);
            const sp = situacao(item, p);
            const a = item.aprov?.[p];
            return (
              <div key={p} className="flex items-start gap-2.5 px-3 py-2.5 border-b last:border-0 border-[var(--line)] text-[13px]">
                <Avatar u={u} size="xs" />
                <div className="flex-1 min-w-0">
                  <b>{u?.nome}</b>
                  <span className="muted"> · {p === item.tecnicoId ? 'Responsável' : 'Participante'}{u && u.perfil !== 'tecnico' ? ` · ${NOME_NIVEL[u.perfil]}` : ''}</span>
                  {sp === 'recusado' && <div className="text-[12px] text-[#a3281b]">Recusou{a?.motivo ? `: ${a.motivo}` : ''} · {fmtDateTime(a?.em)}</div>}
                  {sp === 'pendente' && <div className="muted text-[12px]">Aguardando aprovação desde {fmtDateTime(a?.em)}</div>}
                </div>
                {sp === 'pendente' && u && podeAprovar(me, u) ? (
                  <BotoesAprovacao itemId={item.id} pessoa={p} por={me.id} sm />
                ) : (
                  <span className={cn('tag', sp === 'aprovado' ? 'ok' : sp === 'pendente' ? 'blue' : 'red')}>{sp === 'aprovado' ? 'Confirmado' : sp === 'pendente' ? 'Pendente' : 'Recusou'}</span>
                )}
              </div>
            );
          })}
        </div>
        {item.criadoPor && item.criadoPor !== item.tecnicoId && <p className="muted text-[12px] mt-1.5">Incluído por {db.users.find((u) => u.id === item.criadoPor)?.nome}</p>}
      </div>

      {reag && (
        <div className="panel p-4 grid gap-3">
          <b className="font-display">Reagendar para</b>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Data"><input id="reag-data" type="date" className="field" value={reag.data} onChange={(e) => setReag({ ...reag, data: e.target.value })} /></Field>
            <Field label="Início"><input id="reag-ini" type="time" className="field" value={reag.ini} onChange={(e) => setReag({ ...reag, ini: e.target.value })} /></Field>
            <Field label="Fim"><input id="reag-fim" type="time" className="field" value={reag.fim} onChange={(e) => setReag({ ...reag, fim: e.target.value })} /></Field>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn ghost sm" onClick={() => setReag(null)}>Voltar</button>
            <button
              className="btn pri sm"
              onClick={() => {
                if (reag.fim <= reag.ini) return toast('O horário de fim deve ser depois do início', true);
                const novoId = 'cr_' + uid();
                db.mut((d) => {
                  const c = d.crono.find((x) => x.id === item.id)!;
                  c.status = 'Reagendado';
                  c.obs = (c.obs ? c.obs + ' · ' : '') + `Remarcado para ${fmtShort(reag.data)} às ${reag.ini}`;
                  d.crono.push({ ...JSON.parse(JSON.stringify(c)), id: novoId, data: reag.data, ini: reag.ini, fim: reag.fim, status: 'Planejado', obs: item.obs, visitaId: c.visitaId });
                  c.visitaId = undefined;
                });
                setReag(null);
                toast(`Reagendado para ${fmtShort(reag.data)} às ${reag.ini}`);
                onClose();
              }}
            >
              Confirmar reagendamento
            </button>
          </div>
        </div>
      )}

      {ehVisita && coop && (
        <div className="panel p-4 grid gap-3">
          <b className="font-display">Diagnóstico de Capacidade Operacional (DCO)</b>
          {ig && !ig.completa && (
            <div className="alert red">
              A integração da cooperativa está incompleta ({ig.feitos}/{ig.total}). A visita só pode começar depois do checklist de integração.
              <button className="btn link block mt-1 !px-0" onClick={() => { onClose(); nav(`/aceleracao/${coop.id}`); }}>Abrir checklist de integração →</button>
            </div>
          )}
          {visita ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span>Visita de {fmtShort(visita.data)} · <span className={`tag ${STATUS_VISITA[visita.status].cls}`}>{STATUS_VISITA[visita.status].t}</span></span>
              <button className="btn pri sm" onClick={() => { onClose(); nav(`/visitas/${visita.id}`); }}>{visita.status === 'rascunho' || visita.status === 'devolvida' ? 'Continuar visita' : 'Abrir visita'} <ArrowRight /></button>
            </div>
          ) : aberta ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span>Há uma visita em aberto de {fmtShort(aberta.data)}.</span>
              <button className="btn pri sm" onClick={() => { onClose(); nav(`/visitas/${aberta.id}`); }}>Continuar visita <ArrowRight /></button>
            </div>
          ) : souTecnico ? (
            <button className="btn pri" disabled={!!ig && !ig.completa} onClick={iniciar}><PlayCircle /> Iniciar visita DCO a partir deste item</button>
          ) : (
            <span className="muted text-[13px]">A visita é iniciada pelo técnico responsável.</span>
          )}
        </div>
      )}

      {coop && !ehVisita && db.projetos.some((p) => p.tipo === 'aceleracao' && p.coops.includes(coop.id)) && (
        <button className="btn ghost" onClick={() => { onClose(); nav(`/aceleracao/${coop.id}`); }}>Abrir a jornada da {coop.nome} <ArrowRight /></button>
      )}
      {proj?.tipo === 'cidades' && (
        <button className="btn ghost" onClick={() => { onClose(); nav(`/cidades/${proj.id}`); }}>Abrir o projeto {proj.nome} <ArrowRight /></button>
      )}

      {podeEditar && !item.visitaId && (
        <button
          className="btn link !px-0 justify-self-start text-[var(--danger)]"
          onClick={async () => {
            if (await confirmar('Excluir item do cronograma', 'O item será removido da agenda.', 'Excluir', true)) {
              db.mut((d) => { d.crono = d.crono.filter((x) => x.id !== item.id); });
              toast('Item excluído');
              onClose();
            }
          }}
        >
          <Trash2 /> Excluir item
        </button>
      )}
    </Drawer>
  );
}
