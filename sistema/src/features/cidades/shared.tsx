import { useDB, type DB } from '@/store/db';
import type { Projeto, Tarefa } from '@/lib/types';
import { exportarExcel, xd } from '@/lib/excel';
import { slug } from '@/lib/utils';
import { cmpCodigo, situacaoPrazo } from './constants';
import { respLabel } from './logic';

/** Lista de responsáveis possíveis: time técnico, coordenação/diretoria e agentes externos do projeto. */
export function RespSelect({ projeto, value, onChange, disabled, id }: { projeto: Projeto; value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  const users = useDB((s) => s.users).filter((u) => u.ativo);
  const tecnicos = users.filter((u) => u.perfil === 'tecnico').sort((a, b) => Number(projeto.tecnicos.includes(b.id)) - Number(projeto.tecnicos.includes(a.id)));
  const coord = users.filter((u) => u.perfil === 'coord' || u.perfil === 'gestao');
  return (
    <select id={id} className="field" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">Escolher responsável</option>
      <optgroup label="Time técnico">
        {tecnicos.map((u) => (
          <option key={u.id} value={'u:' + u.id}>{u.nome}{projeto.tecnicos.includes(u.id) ? ' · vinculado' : ''}</option>
        ))}
      </optgroup>
      <optgroup label="Coordenação / Diretoria">
        {coord.map((u) => (
          <option key={u.id} value={'u:' + u.id}>{u.nome} · {u.cargo}</option>
        ))}
      </optgroup>
      {(['Cliente', 'Cooperativa', 'Prefeitura'] as const).map((t) => {
        const ags = projeto.agentes.filter((a) => a.tipo === t);
        return ags.length ? (
          <optgroup key={t} label={`Agente externo · ${t}`}>
            {ags.map((a) => (
              <option key={a.id} value={'a:' + a.id}>{a.nome}{a.organizacao ? ` · ${a.organizacao}` : ''}</option>
            ))}
          </optgroup>
        ) : null;
      })}
    </select>
  );
}

/** Exporta as demandas do projeto com as colunas da planilha da coordenação. */
export async function exportarProjeto(db: DB, p: Projeto) {
  const tops = db.topicos.filter((t) => t.projetoId === p.id).sort((a, b) => cmpCodigo(a.codigo, b.codigo));
  const ts = db.tarefas.filter((t) => t.projetoId === p.id).sort((a, b) => cmpCodigo(a.codigo, b.codigo));
  const linha = (t: Tarefa) => {
    const r = respLabel(db, t.responsavel, p.id);
    return [
      `${p.sigla}-${t.codigo}`, tops.find((x) => x.id === t.topicoId)?.titulo ?? '', t.parentId ? 'Item da subtarefa' : 'Subtarefa',
      xd(t.dataEntrada), t.solicitante, t.area, t.demanda, t.prioridade, t.status, r.nome, r.externo ? `${r.tipo} · ${r.contato}` : 'Interno',
      xd(t.prazo), xd(t.dataConclusao), situacaoPrazo(t), t.observacoes,
    ];
  };
  await exportarExcel(
    [
      {
        nome: 'Demandas',
        titulo: `${p.nome}${p.cliente ? ' · ' + p.cliente : ''}`,
        colunas: [
          { h: 'ID', w: 12 }, { h: 'Tópico', w: 30 }, { h: 'Nível', w: 16 }, { h: 'Data de Entrada', w: 14, date: true }, { h: 'Solicitante', w: 24 }, { h: 'Área', w: 14 },
          { h: 'Demanda', w: 48 }, { h: 'Prioridade', w: 11 }, { h: 'Status', w: 14 }, { h: 'Responsável', w: 26 }, { h: 'Tipo / contato', w: 34 },
          { h: 'Prazo', w: 12, date: true }, { h: 'Data de Conclusão', w: 15, date: true }, { h: 'Situação de Prazo', w: 20 }, { h: 'Observações', w: 40 },
        ],
        linhas: ts.map(linha),
      },
      {
        nome: 'Responsáveis externos',
        colunas: [{ h: 'Tipo', w: 14 }, { h: 'Nome', w: 28 }, { h: 'Organização', w: 40 }, { h: 'Contato', w: 40 }],
        linhas: p.agentes.map((a) => [a.tipo, a.nome, a.organizacao ?? '', a.contato]),
      },
    ],
    `Demandas_${slug(p.nome)}.xlsx`,
  );
}
