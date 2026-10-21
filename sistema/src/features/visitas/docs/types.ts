import type { Usuario, Visita } from '@/lib/types';

export interface DocProps {
  v: Visita;
  ro: boolean; // somente leitura (outro perfil, ou visita já enviada)
  upd: (fn: (v: Visita) => void) => void;
  me: Usuario;
  online: boolean;
}
