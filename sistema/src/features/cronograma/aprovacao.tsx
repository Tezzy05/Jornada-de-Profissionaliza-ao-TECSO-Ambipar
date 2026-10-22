import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { getDB, log, mut } from '@/store/db';
import { nowISO, fmtShort } from '@/lib/dates';
import { Field, Modal, toast } from '@/components/ui';

const nome = (id?: string) => getDB().users.find((u) => u.id === id)?.nome ?? '';

export function aprovar(itemId: string, pessoa: string, por: string) {
  const c = getDB().crono.find((x) => x.id === itemId);
  mut((d) => {
    const it = d.crono.find((x) => x.id === itemId)!;
    it.aprov = { ...(it.aprov ?? {}), [pessoa]: { st: 'aprovado', em: nowISO(), por } };
  });
  log('sistema', `Inclusão aprovada: ${c?.obs ?? c?.tipo} (${fmtShort(c?.data)}) para ${nome(pessoa)}`, itemId);
  toast(pessoa === por ? 'Evento aprovado e incluído no seu cronograma' : `Evento aprovado e incluído no cronograma de ${nome(pessoa)}`);
}

export function recusar(itemId: string, pessoa: string, por: string, motivo: string) {
  const c = getDB().crono.find((x) => x.id === itemId);
  mut((d) => {
    const it = d.crono.find((x) => x.id === itemId)!;
    it.aprov = { ...(it.aprov ?? {}), [pessoa]: { st: 'recusado', em: nowISO(), por, motivo: motivo.trim() || undefined } };
  });
  log('sistema', `Inclusão recusada: ${c?.obs ?? c?.tipo} (${fmtShort(c?.data)}) para ${nome(pessoa)}`, itemId);
  toast('Evento recusado');
}

/** Botões Aprovar / Recusar (com motivo opcional). */
export function BotoesAprovacao({ itemId, pessoa, por, sm }: { itemId: string; pessoa: string; por: string; sm?: boolean }) {
  const [recusa, setRecusa] = useState(false);
  const [motivo, setMotivo] = useState('');
  return (
    <>
      <div className="flex gap-1.5 flex-wrap">
        <button className={`btn ghost ${sm ? 'xs' : 'sm'}`} onClick={(e) => { e.stopPropagation(); setRecusa(true); }}><X /> Recusar</button>
        <button className={`btn pri ${sm ? 'xs' : 'sm'}`} onClick={(e) => { e.stopPropagation(); aprovar(itemId, pessoa, por); }}><Check /> Aprovar</button>
      </div>
      <Modal
        open={recusa}
        onClose={() => setRecusa(false)}
        title="Recusar evento"
        footer={<><button className="btn ghost" onClick={() => setRecusa(false)}>Cancelar</button><button className="btn danger" onClick={() => { recusar(itemId, pessoa, por, motivo); setRecusa(false); setMotivo(''); }}>Recusar</button></>}
      >
        <Field label="Motivo" opt><textarea id="recusa-motivo" className="field" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Field>
      </Modal>
    </>
  );
}
