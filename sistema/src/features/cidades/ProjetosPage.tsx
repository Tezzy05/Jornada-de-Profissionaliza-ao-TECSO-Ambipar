import { useNavigate } from 'react-router-dom';
import { Plus, FileSpreadsheet, Building2, CalendarRange, MapPin } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmt } from '@/lib/dates';
import { baixarModeloMacro } from '@/lib/excel';
import { Avatar, Bar, Empty, PageHead } from '@/components/ui';
import { resumoProjeto } from './logic';

export default function ProjetosPage() {
  const db = useDB();
  const me = useMe()!;
  const scope = useScope();
  const nav = useNavigate();
  const projetos = scope.projetos.filter((p) => p.tipo === 'cidades');
  const gere = can(me, 'cidades.gerir');

  return (
    <div>
      <PageHead
        crumbs="Programas"
        title="Programa Cidades Circular"
        sub={gere ? 'Cada cliente entra como um novo projeto. O macro projeto aprovado vira tópicos, subtarefas e itens com responsáveis e prazos.' : 'Projetos em que você está vinculado como técnico.'}
      >
        {gere && <button className="btn ghost" onClick={() => baixarModeloMacro()}><FileSpreadsheet /> Baixar modelo Excel</button>}
        {gere && <button className="btn pri" onClick={() => nav('/cidades/novo')}><Plus /> Novo projeto</button>}
      </PageHead>

      {projetos.length === 0 ? (
        <div className="card"><Empty icon={<Building2 />} title="Nenhum projeto Cidades Circular no seu filtro" text={gere ? 'Crie o primeiro projeto pelo botão "Novo projeto".' : 'Quando a coordenação vincular você a um projeto, ele aparece aqui.'} /></div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]">
          {projetos.map((p) => {
            const r = resumoProjeto(db, p);
            const tops = db.topicos.filter((t) => t.projetoId === p.id).length;
            return (
              <button key={p.id} className="card overflow-hidden text-left hover:border-[var(--leaf)] transition" onClick={() => nav(`/cidades/${p.id}`)}>
                <div className="p-5 text-white relative" style={{ background: 'linear-gradient(135deg,var(--ink),#0c3a24)' }}>
                  <span className="tag dark absolute right-4 top-4">{p.status}</span>
                  <span className="lbl !text-[#9fb6a3]">{p.cliente}</span>
                  <b className="block font-display text-[18px] mt-1 pr-16">{p.nome}</b>
                  <div className="flex gap-3 mt-2 text-[12px] text-[#b9cbbd] flex-wrap [&_svg]:w-3.5 [&_svg]:h-3.5 [&>span]:flex [&>span]:gap-1 [&>span]:items-center">
                    <span><MapPin /> {p.municipio}/{p.uf}</span>
                    <span><CalendarRange /> {fmt(p.inicio)} a {fmt(p.fim)}</span>
                  </div>
                </div>
                <div className="p-5 grid gap-3">
                  <div>
                    <div className="flex justify-between text-[12.5px] mb-1"><span className="muted">{r.feitas} de {r.total} demandas concluídas · {tops} tópicos</span><b className="tnum">{r.pct}%</b></div>
                    <Bar v={r.pct} thick />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {r.atrasadas > 0 ? <span className="tag red">{r.atrasadas} atrasada{r.atrasadas > 1 ? 's' : ''}</span> : <span className="tag ok">Sem atrasos</span>}
                    {r.breve > 0 && <span className="tag warn">{r.breve} vence{r.breve > 1 ? 'm' : ''} em breve</span>}
                    {r.bloqueadas > 0 && <span className="tag red">{r.bloqueadas} bloqueada{r.bloqueadas > 1 ? 's' : ''}</span>}
                    <span className="tag violet">{p.agentes.length} agentes externos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="lbl">Técnicos</span>
                    <div className="flex -space-x-1.5">{p.tecnicos.map((t) => <Avatar key={t} u={db.users.find((u) => u.id === t)} size="sm" />)}</div>
                    <span className="muted text-[12px]">{p.tecnicos.map((t) => db.users.find((u) => u.id === t)?.nome.split(' ')[0]).join(', ')}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
