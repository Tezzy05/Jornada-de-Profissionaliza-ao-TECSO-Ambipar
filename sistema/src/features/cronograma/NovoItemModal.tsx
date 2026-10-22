import { useEffect, useState } from 'react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { modoInclusao, NOME_NIVEL, nivel } from '@/lib/hierarquia';
import { nowISO, today } from '@/lib/dates';
import { cn, uid } from '@/lib/utils';
import type { ItemCrono, Usuario } from '@/lib/types';
import { Avatar } from '@/components/ui';
import { Field, Modal, toast } from '@/components/ui';
import { TIPOS, TIPOS_COM_GRUPO } from './logic';

export default function NovoItemModal({ open, init, onClose }: { open: boolean; init: { data?: string; tecnicoId?: string }; onClose: () => void }) {
  const me = useMe()!;
  const scope = useScope();
  const db = useDB();
  // pessoas em cujo cronograma posso incluir (direto ou por pedido de aprovação)
  const possiveis = db.users
    .filter((u) => u.ativo && (u.perfil !== 'adm' || u.id === me.id) && modoInclusao(me, u) !== 'bloqueado')
    .sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id) || nivel(b) - nivel(a) || a.nome.localeCompare(b.nome));
  const rotulo = (u: Usuario) => `${u.id === me.id ? 'Meu cronograma' : u.nome}${u.perfil !== 'tecnico' && u.id !== me.id ? ` · ${NOME_NIVEL[u.perfil]}` : ''}${modoInclusao(me, u) === 'pedido' ? ' · pedido de aprovação' : ''}`;
  const blank = () => ({
    tecnicoId: init.tecnicoId && possiveis.some((u) => u.id === init.tecnicoId) ? init.tecnicoId : me.perfil === 'adm' ? possiveis.find((u) => u.id !== me.id)?.id ?? me.id : me.id,
    participantes: [] as string[],
    tipo: 'Visita DCO' as ItemCrono['tipo'],
    data: init.data ?? today(),
    ini: '09:00',
    fim: '12:00',
    coopId: '',
    projetoId: '',
    endereco: 'Matriz' as ItemCrono['endereco'],
    status: 'Planejado' as ItemCrono['status'],
    obs: '',
  });
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (open) setF(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // cooperativas e projetos possíveis para o técnico escolhido (respeita o vínculo)
  const projTec = db.projetos.filter((p) => p.tecnicos.includes(f.tecnicoId) && scope.projetoIds.has(p.id));
  const coopsTec = db.coops.filter((c) => projTec.some((p) => p.coops.includes(c.id)) || c.tecnicoId === f.tecnicoId);
  const comGrupo = TIPOS_COM_GRUPO.includes(f.tipo);
  const coop = db.coops.find((c) => c.id === f.coopId);

  const salvar = () => {
    if (!f.data) return toast('Informe a data', true);
    if (f.fim <= f.ini) return toast('O horário de fim deve ser depois do início', true);
    if (comGrupo && !f.coopId && f.tipo !== 'Ação Cidades Circular') return toast('Escolha a cooperativa', true);
    if (f.tipo === 'Ação Cidades Circular' && !f.projetoId) return toast('Escolha o projeto do Cidades Circular', true);
    const projetoId = f.projetoId || db.projetos.find((p) => p.coops.includes(f.coopId) && p.tecnicos.includes(f.tecnicoId))?.id || undefined;
    const parts = f.participantes.filter((p) => p !== f.tecnicoId);
    const aprov: NonNullable<ItemCrono['aprov']> = {};
    [f.tecnicoId, ...parts].forEach((p) => {
      const u = db.users.find((x) => x.id === p)!;
      if (modoInclusao(me, u) === 'pedido') aprov[p] = { st: 'pendente', em: nowISO() };
    });
    const it: ItemCrono = {
      id: 'cr_' + uid(), tecnicoId: f.tecnicoId, tipo: f.tipo, data: f.data, ini: f.ini, fim: f.fim, status: f.status,
      coopId: comGrupo ? f.coopId || undefined : undefined, projetoId, endereco: comGrupo ? f.endereco : undefined, obs: f.obs || undefined,
      criadoPor: me.id, participantes: parts.length ? parts : undefined, aprov: Object.keys(aprov).length ? aprov : undefined,
    };
    const clash = db.crono.find((e) => e.tecnicoId === it.tecnicoId && e.data === it.data && e.status !== 'Cancelado' && e.status !== 'Reagendado' && !(it.fim <= e.ini || it.ini >= e.fim));
    db.mut((d) => { d.crono.push(it); });
    const pend = Object.keys(aprov).map((p) => db.users.find((u) => u.id === p)?.nome.split(' ')[0]);
    if (pend.length) toast(`Pedido enviado para aprovação de ${pend.join(', ')}. Acompanhe em Eventos Solicitados.`);
    else toast(clash ? 'Item incluído. Atenção: há conflito de horário com outro item.' : 'Item incluído no cronograma', !!clash);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo item do cronograma"
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn pri" onClick={salvar}>Incluir no cronograma</button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="No cronograma de" req>
          <select id="ni-tec" className="field" value={f.tecnicoId} onChange={(e) => setF({ ...f, tecnicoId: e.target.value, participantes: f.participantes.filter((p) => p !== e.target.value), coopId: '', projetoId: '' })}>
            {possiveis.map((t) => (
              <option key={t.id} value={t.id}>{rotulo(t)}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de atividade" req>
          <select id="ni-tipo" className="field" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as ItemCrono['tipo'] })}>
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Data" req><input id="ni-data" type="date" className="field" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <Field label="Início" req><input id="ni-ini" type="time" className="field" value={f.ini} onChange={(e) => setF({ ...f, ini: e.target.value })} /></Field>
        <Field label="Fim" req><input id="ni-fim" type="time" className="field" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} /></Field>
      </div>
      {(comGrupo || f.tipo === 'Capacitação online') && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Projeto" req={f.tipo === 'Ação Cidades Circular'}>
            <select id="ni-proj" className="field" value={f.projetoId} onChange={(e) => setF({ ...f, projetoId: e.target.value, coopId: '' })}>
              <option value="">{projTec.length ? 'Escolher pela cooperativa' : 'Sem projeto vinculado'}</option>
              {projTec.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </Field>
          {comGrupo && (
            <Field label="Cooperativa" req={f.tipo !== 'Ação Cidades Circular'}>
              <select id="ni-coop" className="field" value={f.coopId} onChange={(e) => setF({ ...f, coopId: e.target.value })}>
                <option value="">Escolher</option>
                {coopsTec.filter((c) => !f.projetoId || db.projetos.find((p) => p.id === f.projetoId)?.coops.includes(c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}
      {comGrupo && coop && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Endereço" req>
            <select id="ni-end" className="field" value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value as ItemCrono['endereco'] })}>
              {coop.enderecos.map((e) => (
                <option key={e.tipo} value={e.tipo}>{e.tipo} · {e.end}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <div>
        <span className="fl"><label>Participantes</label></span>
        <div className="flex flex-wrap gap-1.5">
          {possiveis.filter((u) => u.id !== f.tecnicoId).map((u) => {
            const on = f.participantes.includes(u.id);
            const pedido = modoInclusao(me, u) === 'pedido';
            return (
              <button
                key={u.id}
                type="button"
                className={cn('tag !py-1 !pl-1 !pr-2.5 border transition', on ? '!bg-[var(--ink)] !text-white border-[var(--ink)]' : 'border-[var(--line)] !bg-white')}
                onClick={() => setF({ ...f, participantes: on ? f.participantes.filter((p) => p !== u.id) : [...f.participantes, u.id] })}
                aria-pressed={on}
              >
                <Avatar u={u} size="xs" /> {u.id === me.id ? 'Eu' : [u.nome.split(' ')[0], u.nome.split(' ').slice(-1)[0]].join(' ')}
                {pedido && <span className={cn('text-[10px] font-bold', on ? 'text-[var(--lime)]' : 'text-[#1f5f86]')}>· aprovação</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Status" req>
          <select id="ni-st" className="field" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ItemCrono['status'] })}>
            <option>Planejado</option>
            <option>Confirmado</option>
          </select>
        </Field>
        <Field label="Observação" opt><input id="ni-obs" className="field" value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
