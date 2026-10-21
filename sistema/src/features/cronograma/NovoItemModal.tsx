import { useEffect, useState } from 'react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { today } from '@/lib/dates';
import { uid } from '@/lib/utils';
import type { ItemCrono } from '@/lib/types';
import { Field, Modal, toast } from '@/components/ui';
import { TIPOS, TIPOS_COM_GRUPO } from './logic';

export default function NovoItemModal({ open, init, onClose }: { open: boolean; init: { data?: string; tecnicoId?: string }; onClose: () => void }) {
  const me = useMe()!;
  const scope = useScope();
  const db = useDB();
  const editaOutros = can(me, 'crono.editarTodos');
  const blank = () => ({
    tecnicoId: init.tecnicoId ?? (editaOutros ? scope.tecnicos[0]?.id ?? me.id : me.id),
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
    const it: ItemCrono = {
      id: 'cr_' + uid(), tecnicoId: f.tecnicoId, tipo: f.tipo, data: f.data, ini: f.ini, fim: f.fim, status: f.status,
      coopId: comGrupo ? f.coopId || undefined : undefined, projetoId, endereco: comGrupo ? f.endereco : undefined, obs: f.obs || undefined,
    };
    const clash = db.crono.find((e) => e.tecnicoId === it.tecnicoId && e.data === it.data && e.status !== 'Cancelado' && e.status !== 'Reagendado' && !(it.fim <= e.ini || it.ini >= e.fim));
    db.mut((d) => { d.crono.push(it); });
    toast(clash ? 'Item incluído. Atenção: há conflito de horário com outro item.' : 'Item incluído no cronograma', !!clash);
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
        <Field label="Técnico" req>
          <select id="ni-tec" className="field" value={f.tecnicoId} disabled={!editaOutros} onChange={(e) => setF({ ...f, tecnicoId: e.target.value, coopId: '', projetoId: '' })}>
            {(editaOutros ? scope.tecnicos : [me]).map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
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
      {(comGrupo || f.tipo === 'Capacitação online (P5)') && (
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
