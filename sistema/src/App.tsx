import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMe } from '@/store/scope';
import { can } from '@/lib/permissions';
import type { PermKey } from '@/lib/types';
import Shell from '@/components/layout/Shell';
import { ConfirmHost, Empty, Toasts } from '@/components/ui';
import LoginPage from '@/features/auth/LoginPage';
import PainelPage from '@/features/painel/PainelPage';
import CronogramaPage from '@/features/cronograma/CronogramaPage';
import VisitasPage from '@/features/visitas/VisitasPage';
import VisitaPage from '@/features/visitas/VisitaPage';
import DemandasPage from '@/features/cidades/DemandasPage';
import AceleracaoPage from '@/features/aceleracao/AceleracaoPage';
import JornadaCoopPage from '@/features/aceleracao/JornadaCoopPage';
import CapacitacoesPage from '@/features/aceleracao/CapacitacoesPage';
import ProjetosPage from '@/features/cidades/ProjetosPage';
import NovoProjetoPage from '@/features/cidades/NovoProjetoPage';
import ProjetoPage from '@/features/cidades/ProjetoPage';
import GruposPage from '@/features/cooperativas/GruposPage';
import HistoricoPage from '@/features/cooperativas/HistoricoPage';
import UsuariosPage from '@/features/admin/UsuariosPage';
import IntegracaoPage from '@/features/admin/IntegracaoPage';
import { Lock } from 'lucide-react';
import { PrintHost } from '@/components/Print';

function Guard({ any, children }: { any: PermKey[]; children: ReactNode }) {
  const me = useMe();
  if (!any.some((k) => can(me, k)))
    return <Empty icon={<Lock />} title="Seu perfil não tem acesso a esta área" text="Se precisar, peça ao ADM para liberar o acesso em Usuários e acessos." />;
  return <>{children}</>;
}

export default function App() {
  const me = useMe();
  return (
    <HashRouter>
      {!me ? (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<Shell />}>
            <Route path="/painel" element={<PainelPage />} />
            <Route path="/cronograma" element={<Guard any={['crono.proprio', 'crono.todos']}><CronogramaPage /></Guard>} />
            <Route path="/visitas" element={<Guard any={['visitas.preencher', 'visitas.verTodas']}><VisitasPage /></Guard>} />
            <Route path="/visitas/:id" element={<Guard any={['visitas.preencher', 'visitas.verTodas']}><VisitaPage /></Guard>} />
            <Route path="/visitas/:id/:doc" element={<Guard any={['visitas.preencher', 'visitas.verTodas']}><VisitaPage /></Guard>} />
            <Route path="/demandas" element={<Guard any={['cidades.atualizarProprias']}><DemandasPage /></Guard>} />
            <Route path="/aceleracao" element={<Guard any={['aceleracao.ver']}><AceleracaoPage /></Guard>} />
            <Route path="/aceleracao/:coopId" element={<Guard any={['aceleracao.ver']}><JornadaCoopPage /></Guard>} />
            <Route path="/capacitacoes" element={<Guard any={['aceleracao.ver']}><CapacitacoesPage /></Guard>} />
            <Route path="/cidades" element={<Guard any={['cidades.ver']}><ProjetosPage /></Guard>} />
            <Route path="/cidades/novo" element={<Guard any={['cidades.gerir']}><NovoProjetoPage /></Guard>} />
            <Route path="/cidades/:id" element={<Guard any={['cidades.ver']}><ProjetoPage /></Guard>} />
            <Route path="/grupos" element={<GruposPage />} />
            <Route path="/historico" element={<Guard any={['coop.historico']}><HistoricoPage /></Guard>} />
            <Route path="/usuarios" element={<Guard any={['usuarios.gerir']}><UsuariosPage /></Guard>} />
            <Route path="/integracao" element={<Guard any={['sistema.integracao']}><IntegracaoPage /></Guard>} />
            <Route path="*" element={<Navigate to="/painel" replace />} />
          </Route>
        </Routes>
      )}
      <Toasts />
      <ConfirmHost />
      <PrintHost />
    </HashRouter>
  );
}
