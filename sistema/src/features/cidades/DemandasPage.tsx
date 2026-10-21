import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { fmtShort } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Empty, PageHead } from '@/components/ui';
import { PRIO_CLS, SIT_CLS, situacaoPrazo, STATUS_CLS } from './constants';

export default function DemandasPage() {
  const db = useDB();
  const me = useMe()!;
  const scope = useScope();
  const nav = useNavigate();
  const [aba, setAba] = useState<'abertas' | 'concluidas'>('abertas');
  const minhas = db.tarefas.filter((t) => t.responsavel === 'u:' + me.id && scope.projetoIds.has(t.projetoId));
  const lista = minhas
    .filter((t) => (aba === 'abertas' ? t.status !== 'Concluída' : t.status === 'Concluída'))
    .sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
  const atrasadas = minhas.filter((t) => situacaoPrazo(t) === 'Atrasada').length;

  return (
    <div>
      <PageHead crumbs="Operação" title="Minhas demandas" sub="Subtarefas e itens do Cidades Circular em que você é o responsável. Os prazos também aparecem no seu cronograma." />
      <div className="tabs mb-4">
        <button className={cn('tab', aba === 'abertas' && 'on')} onClick={() => setAba('abertas')}>Em aberto <span className="pc tnum">{minhas.filter((t) => t.status !== 'Concluída').length}</span></button>
        <button className={cn('tab', aba === 'concluidas' && 'on')} onClick={() => setAba('concluidas')}>Concluídas <span className="pc tnum">{minhas.filter((t) => t.status === 'Concluída').length}</span></button>
        {atrasadas > 0 && <span className="tag red self-center">{atrasadas} atrasada{atrasadas > 1 ? 's' : ''}</span>}
      </div>
      {lista.length === 0 ? (
        <div className="card"><Empty icon={<ListTodo />} title={aba === 'abertas' ? 'Nenhuma demanda em aberto' : 'Nenhuma demanda concluída'} /></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>ID</th><th>Demanda</th><th>Projeto · tópico</th><th>Prazo</th><th>Situação</th><th>Prioridade</th><th>Status</th></tr></thead>
              <tbody>
                {lista.map((t) => {
                  const p = db.projetos.find((x) => x.id === t.projetoId)!;
                  const tp = db.topicos.find((x) => x.id === t.topicoId);
                  const s = situacaoPrazo(t);
                  return (
                    <tr key={t.id} className="clickable" onClick={() => nav(`/cidades/${p.id}?t=${t.id}`)}>
                      <td className="tnum muted whitespace-nowrap">{p.sigla}-{t.codigo}</td>
                      <td><b className="font-medium">{t.demanda}</b></td>
                      <td className="muted text-[12.5px]">{p.nome} · {tp?.titulo}</td>
                      <td className="tnum">{fmtShort(t.prazo)}</td>
                      <td><span className={`tag ${SIT_CLS[s]}`}>{s}</span></td>
                      <td><span className={`tag ${PRIO_CLS[t.prioridade]}`}>{t.prioridade}</span></td>
                      <td><span className={`tag ${STATUS_CLS[t.status]}`}>{t.status}</span></td>
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
