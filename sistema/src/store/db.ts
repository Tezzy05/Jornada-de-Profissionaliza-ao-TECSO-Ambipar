import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer';
import type {
  Atendimento, Auditoria, Capacitacao, Config, Coop, Integracao, ItemCrono, Mentoria, Projeto, Tarefa, Topico, Usuario, Visita,
} from '@/lib/types';
import { uid } from '@/lib/utils';
import { nowISO } from '@/lib/dates';
import { buildSeed } from './seed';
import { clearMedia } from '@/lib/media';

export interface DB {
  version: number;
  seededAt: string;
  users: Usuario[];
  projetos: Projeto[];
  coops: Coop[];
  crono: ItemCrono[];
  visitas: Visita[];
  integracoes: Integracao[];
  mentorias: Mentoria[];
  atendimentos: Atendimento[];
  capacitacoes: Capacitacao[];
  topicos: Topico[];
  tarefas: Tarefa[];
  audit: Auditoria[];
  config: Config;
}

export interface Session {
  userId: string | null;
  filtroTipo: '' | 'aceleracao' | 'cidades';
  filtroProjeto: string;
}

interface Store extends DB, Session {
  /** Atualização genérica com immer: mut(d => { d.visitas.push(...) }) */
  mut: (fn: (d: DB & Session) => void) => void;
  log: (tipo: Auditoria['tipo'], texto: string, alvo?: string) => void;
  login: (email: string, senha: string) => { ok: true } | { ok: false; erro: string };
  loginAs: (id: string) => void;
  logout: () => void;
  resetDemo: () => Promise<void>;
}

const STORAGE_KEY = 'jornada-tecso-ambipar-v1';

export const useDB = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      userId: null,
      filtroTipo: '',
      filtroProjeto: '',
      mut: (fn) => set((s) => produce(s, (d) => void fn(d as DB & Session))),
      log: (tipo, texto, alvo) =>
        set((s) => ({ audit: [{ id: uid(), em: nowISO(), por: s.userId ?? 'sistema', tipo, texto, alvo }, ...s.audit].slice(0, 500) })),
      login: (email, senha) => {
        const u = get().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u) return { ok: false, erro: 'Não encontramos esse e-mail. Confira o endereço ou use o acesso rápido.' };
        if (!u.ativo) return { ok: false, erro: 'Este usuário está inativo. Fale com o ADM para reativar.' };
        if (u.senha !== senha) return { ok: false, erro: 'Senha incorreta. Na demonstração a senha é planetaA.' };
        get().loginAs(u.id);
        return { ok: true };
      },
      loginAs: (id) => {
        set((s) =>
          produce(s, (d) => {
            d.userId = id;
            d.filtroTipo = '';
            d.filtroProjeto = '';
            const u = d.users.find((x) => x.id === id);
            if (u) u.ultimoAcesso = nowISO();
          }),
        );
      },
      logout: () => set({ userId: null }),
      resetDemo: async () => {
        await clearMedia();
        const uidAtual = get().userId;
        set({ ...buildSeed(), userId: uidAtual, filtroTipo: '', filtroProjeto: '' });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ mut, log, login, loginAs, logout, resetDemo, ...rest }) => rest,
    },
  ),
);

export const getDB = () => useDB.getState();
export const mut = (fn: (d: DB & Session) => void) => useDB.getState().mut(fn);
export const log = (tipo: Auditoria['tipo'], texto: string, alvo?: string) => useDB.getState().log(tipo, texto, alvo);
