import { ArrowRight, Check, Minus } from 'lucide-react';
import { PageHead } from '@/components/ui';
import { PERFIS, PERM_GRUPOS, TEMPLATES } from '@/lib/permissions';
import type { PerfilBase } from '@/lib/types';

const ORDEM: PerfilBase[] = ['tecnico', 'coord', 'gestao', 'adm', 'consulta'];

const FASES = [
  { t: 'Fase 1 · Protótipo funcional', st: 'Agora', d: 'Este sistema: login por perfil, cronograma, visitas DCO, Programa de Aceleração, Cidades Circular, histórico com Excel e ZIP. Dados salvos no navegador para a apresentação.' },
  { t: 'Fase 2 · Extensão do sistema atual', st: 'Próximo passo', d: 'Mesmo login e banco do sistema de coletas e retiradas (API Flask no PythonAnywhere). Fotos e vídeos no Google Drive via API, acessados só pelo sistema. App do técnico offline-first.' },
  { t: 'Fase 3 · Relatório consolidado ao MMA', st: 'Objetivo final', d: 'Consolidação automática das informações da TECSO com os dados que o sistema atual já tem, mais as fotos da operação TECSO, que hoje não existem lá. Um relatório único para a operação enviar ao MMA.' },
  { t: 'Fase 4 · Evoluções', st: 'Depois', d: 'Avisos por e-mail/WhatsApp de prazos e devoluções, assinatura eletrônica com validade jurídica e, se fizer sentido, acesso de leitura para cliente e prefeitura.' },
];

export default function IntegracaoPage() {
  return (
    <div className="grid gap-4">
      <PageHead crumbs="Sistema" title="Integração e roadmap" sub="Como a Jornada de Profissionalização TECSO entra como extensão do sistema que a Ambipar já usa." />

      <div className="card pad">
        <h3 className="text-[15px] font-bold mb-3">Arquitetura proposta</h3>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-center">
          <div className="panel p-4 text-center"><b className="font-display block">App do técnico</b><small className="muted">Celular · offline-first<br />dados no aparelho até sincronizar</small></div>
          <ArrowRight className="mx-auto text-[var(--leaf)] rotate-90 lg:rotate-0" />
          <div className="p-4 text-center rounded-[14px] bg-[var(--ink)] text-white"><b className="font-display block">API Flask (sistema atual)</b><small className="text-[#9fb6a3]">PythonAnywhere · mesmo banco e login<br />+ módulos da Jornada TECSO · PDF/XLSX</small></div>
          <ArrowRight className="mx-auto text-[var(--leaf)] rotate-90 lg:rotate-0" />
          <div className="panel p-4 text-center"><b className="font-display block">Armazenamento de mídia</b><small className="muted">Fotos e vídeos via API do Google Drive<br />(acesso só pelo sistema)</small></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          {['Cronograma de campo e visitas DCO', 'Programa de Aceleração', 'Cidades Circular (macro projeto → demandas)', 'Histórico da cooperativa (Excel + ZIP)'].map((m) => (
            <div key={m} className="info !mb-0 flex items-center gap-2"><Check className="w-4 h-4 text-[var(--ok)] flex-none" />{m}</div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {FASES.map((f, i) => (
          <div key={f.t} className={i === 0 ? 'card p-4 border-[var(--ink)] shadow-[0_0_0_2px_var(--ink)]' : 'card p-4'}>
            <span className={`tag ${i === 0 ? 'dark' : i === 2 ? 'lime' : ''}`}>{f.st}</span>
            <b className="block font-display mt-2 mb-1">{f.t}</b>
            <p className="muted text-[13px]">{f.d}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="pad pb-1.5"><h3 className="text-[15px] font-bold m-0">Matriz de permissões dos perfis-base</h3></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Acesso</th>{ORDEM.map((p) => <th key={p} className="!text-center">{PERFIS[p].nome}</th>)}</tr></thead>
            <tbody>
              {PERM_GRUPOS.map((g) => [
                <tr key={g.grupo}><td colSpan={6} className="!bg-[#fafbf8] font-semibold text-[12px] uppercase tracking-[.4px] muted">{g.grupo}</td></tr>,
                ...g.itens.map((i) => (
                  <tr key={i.k}>
                    <td className="text-[13px]">{i.t}</td>
                    {ORDEM.map((p) => (
                      <td key={p} className="text-center">
                        {TEMPLATES[p].includes(i.k) ? <Check className="w-4 h-4 mx-auto text-[var(--leaf-d)]" strokeWidth={3} /> : <Minus className="w-4 h-4 mx-auto text-[#c6d1bf]" />}
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
