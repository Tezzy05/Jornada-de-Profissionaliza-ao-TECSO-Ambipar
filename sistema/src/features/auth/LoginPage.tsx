import { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Eye, EyeOff, LogIn, ChevronDown, Mail, Lock } from 'lucide-react';
import { useDB } from '@/store/db';
import { AmbiparMark, AmbiparWord } from '@/components/brand/Brand';
import { Avatar } from '@/components/ui';
import { PERFIS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const Globe = lazy(() => import('./Globe'));

const ORDEM = ['tecnico', 'coord', 'gestao', 'adm'];

export default function LoginPage() {
  const users = useDB((s) => s.users);
  const login = useDB((s) => s.login);
  const loginAs = useDB((s) => s.loginAs);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [rapido, setRapido] = useState(false);

  const ativos = users.filter((u) => u.ativo).sort((a, b) => ORDEM.indexOf(b.perfil) - ORDEM.indexOf(a.perfil) || a.nome.localeCompare(b.nome));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(email, senha);
    if (!r.ok) setErro(r.erro);
  };

  return (
    <div className="login-root">
      <Suspense fallback={null}>
        <Globe className="absolute inset-0" />
      </Suspense>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between gap-4 px-[max(20px,4vw)] pt-6">
          <AmbiparWord className="h-9 text-[var(--brand-dark)]" />
        </header>

        <main className="flex-1 grid place-items-center px-4 py-8">
          <motion.div
            className="login-card w-full max-w-[430px]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <h1 className="login-titulo text-center">Jornada de Profissionalização TECSO</h1>
            <p className="slogan text-center">
              Cuide do planeta{' '}
              <span className="planeta-a" aria-label="A"><AmbiparMark className="w-full h-full" title="A" /></span>
            </p>

            <form onSubmit={submit} className="grid gap-3 mt-6">
              <div>
                <label htmlFor="login-email" className="login-lbl">E-mail</label>
                <div className="relative">
                  <Mail className="login-ico" />
                  <input id="login-email" className="login-input !pl-10" type="email" autoComplete="username" placeholder="nome.sobrenome@tecso.demo" value={email} onChange={(e) => { setEmail(e.target.value); setErro(''); }} />
                </div>
              </div>
              <div>
                <label htmlFor="login-senha" className="login-lbl">Senha</label>
                <div className="relative">
                  <Lock className="login-ico" />
                  <input id="login-senha" className="login-input !pl-10 !pr-11" type={ver ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(''); }} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>
                    {ver ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>
              {erro && <p className="text-[12.5px] text-[#a3281b]" role="alert">{erro}</p>}
              <button className="login-btn" type="submit"><LogIn className="w-4 h-4" /> Entrar</button>
            </form>

            <div className="mt-5 border-t border-[rgba(6,38,15,.08)] pt-3">
              <button type="button" className="login-quick-toggle" onClick={() => setRapido(!rapido)} aria-expanded={rapido}>
                Acesso de demonstração
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', rapido && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {rapido && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="grid gap-1 pt-2">
                      {ativos.map((u) => (
                        <button key={u.id} className="quick" onClick={() => loginAs(u.id)}>
                          <Avatar u={u} size="xs" />
                          <span className="min-w-0 text-left flex-1 truncate"><b>{u.nome}</b> <small>· {PERFIS[u.perfil].nome}</small></span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-40 flex-none" />
                        </button>
                      ))}
                      <p className="text-[11px] text-[#7a8a74] text-center mt-1">Senha de todos: <b>planetaA</b></p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </main>

        <footer className="px-[max(20px,4vw)] pb-5 text-[11.5px] text-[#4f6a52] text-center">
          Ambipar · Programa de Aceleração e Programa Cidades Circular
        </footer>
      </div>
    </div>
  );
}
