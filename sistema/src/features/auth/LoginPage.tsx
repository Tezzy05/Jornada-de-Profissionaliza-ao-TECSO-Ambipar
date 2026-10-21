import { lazy, Suspense, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react';
import { useDB } from '@/store/db';
import { AmbiparMark, AmbiparWord } from '@/components/brand/Brand';
import { Avatar } from '@/components/ui';
import { PERFIS } from '@/lib/permissions';

const Globe = lazy(() => import('./Globe'));

const ORDEM = ['tecnico', 'coord', 'gestao', 'adm', 'consulta'];

export default function LoginPage() {
  const users = useDB((s) => s.users);
  const login = useDB((s) => s.login);
  const loginAs = useDB((s) => s.loginAs);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');

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
      <div className="login-glow" aria-hidden="true" />

      <div className="relative z-10 min-h-full flex flex-col">
        <header className="flex items-center justify-between gap-4 px-[max(20px,4vw)] pt-6">
          <AmbiparWord className="h-7 text-white" />
          <span className="text-[12px] text-[#a9c2ad] tracking-[.5px] uppercase font-semibold hidden sm:block">TECSO · Protótipo para apresentação</span>
        </header>

        <main className="flex-1 grid items-center px-[max(20px,4vw)] py-8">
          <div className="w-full max-w-[540px] grid gap-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
              <p className="text-[12.5px] uppercase tracking-[1.6px] font-bold text-[var(--lime)] mb-3">Jornada de Profissionalização TECSO</p>
              <h1 className="slogan">
                Não existe planeta B.
                <span className="block">
                  Cuide do planeta <span className="planeta-a" aria-label="A"><AmbiparMark className="w-full h-full" title="A" /></span>
                </span>
              </h1>
            </motion.div>

            <motion.form
              onSubmit={submit}
              className="login-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <div className="grid gap-3">
                <div>
                  <label htmlFor="login-email" className="login-lbl">E-mail</label>
                  <input id="login-email" className="login-input" type="email" autoComplete="username" placeholder="nome.sobrenome@tecso.demo" value={email} onChange={(e) => { setEmail(e.target.value); setErro(''); }} />
                </div>
                <div>
                  <label htmlFor="login-senha" className="login-lbl">Senha</label>
                  <div className="relative">
                    <input id="login-senha" className="login-input pr-11" type={ver ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(''); }} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn text-[#a9c2ad] hover:bg-white/10 hover:text-white" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}>
                      {ver ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
                {erro && <p className="text-[12.5px] text-[#ffb4a8]" role="alert">{erro}</p>}
                <button className="btn pri w-full !py-3 !text-[14px]" type="submit"><LogIn /> Entrar</button>
                <p className="text-[11.5px] text-[#8fa894]">Demonstração: todos os usuários usam a senha <b className="text-[#dfe9df]">planetaA</b>.</p>
              </div>
            </motion.form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.35 }}>
              <p className="login-lbl mb-2">Acesso rápido para a apresentação</p>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {ativos.map((u) => (
                  <button key={u.id} className="quick" onClick={() => loginAs(u.id)}>
                    <Avatar u={u} size="sm" />
                    <span className="min-w-0 text-left">
                      <b className="block truncate">{u.nome}</b>
                      <small className="block truncate">{PERFIS[u.perfil].nome}</small>
                    </span>
                    <ArrowRight className="w-4 h-4 ml-auto opacity-50 flex-none" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </main>

        <footer className="px-[max(20px,4vw)] pb-5 text-[11.5px] text-[#7f9a84] flex flex-wrap gap-x-5 gap-y-1">
          <span>Ambipar · Programa de Aceleração e Programa Cidades Circular</span>
          <span>Continentes: Natural Earth</span>
        </footer>
      </div>
    </div>
  );
}
