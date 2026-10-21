import { useDB, log, getDB, mut } from '@/store/db';
import { toast } from '@/components/ui';
import { cn } from '@/lib/utils';

/** Lista de técnicos ativos (mantém o atual na lista mesmo se ele saiu ou mudou de perfil). */
export function TecnicoSelect({ value, onChange, id, className, incluirCoord }: { value: string; onChange: (id: string) => void; id?: string; className?: string; incluirCoord?: boolean }) {
  const users = useDB((s) => s.users);
  const opcoes = users.filter((u) => u.id === value || (u.ativo && (u.perfil === 'tecnico' || (incluirCoord && u.perfil === 'coord'))));
  return (
    <select id={id} className={cn('field', className)} value={value} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} aria-label="Técnico responsável">
      {opcoes.map((u) => (
        <option key={u.id} value={u.id}>{u.nome}{!u.ativo ? ' (inativo)' : ''}</option>
      ))}
    </select>
  );
}

/** Garante que o novo responsável enxergue o projeto do item e registra a troca. */
export function trocarResponsavel(novoId: string, projetoId: string | undefined, oQue: string) {
  const db = getDB();
  const u = db.users.find((x) => x.id === novoId);
  const p = db.projetos.find((x) => x.id === projetoId);
  if (p && !p.tecnicos.includes(novoId) && !u?.perms.includes('projetos.todos')) {
    mut((d) => {
      d.projetos.find((x) => x.id === p.id)!.tecnicos.push(novoId);
    });
    toast(`${u?.nome} assumiu ${oQue} e foi vinculado(a) ao projeto ${p.nome}`);
  } else toast(`${u?.nome} assumiu ${oQue}`);
  log('acesso', `Responsável trocado: ${oQue} → ${u?.nome}`, novoId);
}
