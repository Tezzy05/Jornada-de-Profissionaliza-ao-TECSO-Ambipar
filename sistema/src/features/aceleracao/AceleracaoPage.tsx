import { useNavigate } from 'react-router-dom';
import { ArrowRight, Rocket } from 'lucide-react';
import { useDB } from '@/store/db';
import { useScope } from '@/store/scope';
import { Avatar, Empty, PageHead } from '@/components/ui';
import { cn } from '@/lib/utils';
import { PRODUTOS } from './constants';
import { etapas, naAceleracao } from './logic';

export default function AceleracaoPage() {
  const db = useDB();
  const scope = useScope();
  const nav = useNavigate();
  const coops = scope.coops.filter((c) => naAceleracao(db, c.id) && scope.projetos.some((p) => p.tipo === 'aceleracao' && p.coops.includes(c.id)));
  const linhas = coops.map((c) => ({ c, e: etapas(db, c.id) }));
  const cont = (i: number) => linhas.filter((l) => l.e[i].estado === 'ok').length;

  return (
    <div>
      <PageHead crumbs="Programas" title="Programa de Aceleração" sub="Jornada de profissionalização de cada cooperativa, do produto 1 ao 5. A integração precisa estar completa antes de seguir com a cooperativa." />

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5 mb-4">
        {PRODUTOS.map((p, i) => (
          <div key={p.k} className="card p-4">
            <span className="lbl">Produto {p.n}</span>
            <b className="block font-display text-[13.5px] leading-tight mt-1 mb-2 min-h-[34px]">{p.t}</b>
            <div className="flex items-baseline gap-1.5"><b className="text-[24px] font-display font-extrabold tnum">{i >= 3 ? linhas.filter((l) => l.e[i].estado !== 'todo' && l.e[i].estado !== 'lock').length : cont(i)}</b><span className="muted text-[12px]">de {linhas.length} {i >= 3 ? 'em andamento' : 'concluídas'}</span></div>
          </div>
        ))}
      </div>

      {linhas.length === 0 ? (
        <div className="card"><Empty icon={<Rocket />} title="Nenhuma cooperativa no filtro atual" text="Ajuste o filtro de projeto no topo da tela." /></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cooperativa</th><th>Técnico</th>
                  {PRODUTOS.map((p) => <th key={p.k} title={p.t}>P{p.n}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ c, e }) => {
                  const tec = db.users.find((u) => u.id === c.tecnicoId);
                  return (
                    <tr key={c.id} className="clickable" onClick={() => nav(`/aceleracao/${c.id}`)}>
                      <td><b>{c.nome}</b><div className="muted text-[12px]">{c.cidade}/{c.uf} · {c.classificacao}</div></td>
                      <td><div className="tc text-[13px] font-medium"><Avatar u={tec} size="xs" />{tec?.nome}</div></td>
                      {e.map((x, i) => (
                        <td key={i}>
                          <span className={cn('tag', x.estado === 'ok' ? 'ok' : x.estado === 'cur' ? 'lime' : x.estado === 'lock' ? 'red' : '')} title={PRODUTOS[i].t}>
                            {x.estado === 'lock' ? 'Bloqueado' : x.resumo}
                          </span>
                        </td>
                      ))}
                      <td className="text-right"><ArrowRight className="w-4 h-4 muted inline" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
