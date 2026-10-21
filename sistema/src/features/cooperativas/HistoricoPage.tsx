import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, FolderArchive, Search, Camera, History, ArrowRight, Check } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmtShort } from '@/lib/dates';
import { cn, slug } from '@/lib/utils';
import { Empty, MediaThumb, Modal, PageHead, toast } from '@/components/ui';
import { acoesDaCooperativa, baixarZipFotos, exportarHistoricoExcel, fotosDasAcoes, type Acao, type FotoRef } from './historico';
import { etapas, naAceleracao } from '@/features/aceleracao/logic';
import { PRODUTOS } from '@/features/aceleracao/constants';

export default function HistoricoPage() {
  const db = useDB();
  const me = useMe()!;
  const scope = useScope();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const coopId = sp.get('coop') ?? '';
  const [busca, setBusca] = useState('');
  const [etapa, setEtapa] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [texto, setTexto] = useState('');
  const [zip, setZip] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Acao | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const chave = (f: FotoRef) => f.pasta + '/' + f.arquivo;
  const abrirFotos = (a: Acao) => {
    setFotos(a);
    setSel(new Set(a.fotos.map(chave)));
  };
  const gerarZip = async (lista: Acao['fotos'], acao: Acao | null, sufixo: string) => {
    if (!coop || !lista.length) return;
    setZip('Preparando…');
    try {
      const fs = acao ? lista.map((f) => ({ ...f, data: acao.data, acao: acao.acao })) : fotosDasAcoes(acoes);
      const n = await baixarZipFotos(db, coop.id, fs, sufixo, (a, b) => setZip(`${a}/${b}`));
      toast(`ZIP gerado com ${n} foto${n === 1 ? '' : 's'}`);
    } finally {
      setZip(null);
    }
  };
  const coop = scope.coops.find((c) => c.id === coopId);
  const acoes = useMemo(() => (coop ? acoesDaCooperativa(db, coop.id, me) : []), [db, coop, me]);
  const etapasUsadas = [...new Set(acoes.map((a) => a.etapa))];
  const filtradas = acoes
    .filter((a) => !etapa || a.etapa === etapa)
    .filter((a) => !de || a.data >= de)
    .filter((a) => !ate || a.data <= ate)
    .filter((a) => !texto || `${a.acao} ${a.detalhes} ${a.responsavel}`.toLowerCase().includes(texto.toLowerCase()));
  const totalFotos = acoes.reduce((s, a) => s + a.fotos.length, 0);
  const sugestoes = scope.coops.filter((c) => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  const exporta = can(me, 'coop.exportar');

  return (
    <div>
      <PageHead crumbs="Cooperativas" title="Histórico da cooperativa" />

      <div className="card pad mb-4 grid gap-3">
        <label className="flex items-center gap-2 field !py-2">
          <Search className="w-4 h-4 muted" />
          <input id="hist-busca" className="bg-transparent outline-none flex-1" placeholder="Digite o nome da cooperativa" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="flex gap-2 flex-wrap">
          {sugestoes.map((c) => (
            <button key={c.id} className={cn('tab', c.id === coopId && 'on')} onClick={() => { setSp({ coop: c.id }); setEtapa(''); }}>
              {c.nome} <span className="pc">{c.cidade}/{c.uf}</span>
            </button>
          ))}
          {sugestoes.length === 0 && <span className="muted text-[13px]">Nenhuma cooperativa com esse nome no seu acesso.</span>}
        </div>
      </div>

      {!coop ? (
        <div className="card"><Empty icon={<History />} title="Escolha uma cooperativa" /></div>
      ) : (
        <>
          <div className="card p-5 flex gap-4 flex-wrap items-center mb-4">
            <div className="w-[54px] h-[54px] rounded-[14px] bg-[var(--ink)] grid place-items-center text-[var(--lime)] font-display font-extrabold text-[18px] flex-none">{coop.sigla}</div>
            <div className="flex-1 min-w-[220px]">
              <h2 className="text-[20px] font-extrabold">{coop.nome}</h2>
              <div className="muted text-[12.5px]">{coop.cidade}/{coop.uf} · {coop.lideranca} · {db.projetos.filter((p) => p.coops.includes(coop.id)).map((p) => p.nome).join(' · ')}</div>
              {naAceleracao(db, coop.id) && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {etapas(db, coop.id).map((e, i) => (
                    <span key={i} className={cn('tag', e.estado === 'ok' ? 'ok' : e.estado === 'cur' ? 'lime' : e.estado === 'lock' ? 'red' : '')} title={PRODUTOS[i].t}>{PRODUTOS[i].c} · {e.estado === 'lock' ? 'Bloqueado' : e.resumo}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-center px-3"><b className="block text-[24px] font-display tnum">{acoes.length}</b><span className="muted text-[12px]">ações</span></div>
            <div className="text-center px-3"><b className="block text-[24px] font-display tnum">{totalFotos}</b><span className="muted text-[12px]">fotos</span></div>
            {exporta && (
              <div className="flex gap-2 flex-wrap">
                <button className="btn dark" onClick={() => exportarHistoricoExcel(db, coop.id, acoes, me).then(() => toast('Excel exportado'))}><FileSpreadsheet /> Exportar Excel</button>
                <button
                  className="btn pri"
                  disabled={!!zip || !totalFotos}
                  onClick={() => gerarZip(acoes.flatMap((a) => a.fotos), null, 'fotos_jornada')}
                >
                  <FolderArchive /> {zip && !fotos ? `Gerando ZIP ${zip}` : 'Baixar todas as fotos (ZIP)'}
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <div className="pad flex gap-2 flex-wrap items-center">
              <select id="hist-etapa" className="field !w-auto" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
                <option value="">Todas as etapas</option>
                {etapasUsadas.map((e) => <option key={e}>{e}</option>)}
              </select>
              <label className="flex items-center gap-1.5 text-[12.5px] muted">De <input id="hist-de" type="date" className="field !w-auto" value={de} onChange={(e) => setDe(e.target.value)} /></label>
              <label className="flex items-center gap-1.5 text-[12.5px] muted">até <input id="hist-ate" type="date" className="field !w-auto" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
              <input id="hist-texto" className="field !w-56" placeholder="Filtrar por texto" value={texto} onChange={(e) => setTexto(e.target.value)} />
              <span className="muted text-[12.5px] ml-auto">{filtradas.length} de {acoes.length} ações</span>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Data</th><th>Programa · etapa</th><th>Ação</th><th>Responsável</th><th>Status</th><th>Detalhes</th><th>Fotos</th></tr></thead>
                <tbody>
                  {filtradas.map((a, i) => (
                    <tr key={i}>
                      <td className="tnum whitespace-nowrap">{fmtShort(a.data)}{a.hora && <div className="muted text-[11.5px]">{a.hora}</div>}</td>
                      <td className="text-[12.5px] min-w-[150px]"><span className="muted block text-[11px]">{a.programa}</span>{a.etapa}</td>
                      <td className="min-w-[220px]"><b className="font-medium text-[13px]">{a.acao}</b></td>
                      <td className="text-[12.5px] whitespace-nowrap">{a.responsavel}</td>
                      <td><span className="tag">{a.status}</span></td>
                      <td className="muted text-[12px] min-w-[220px] max-w-[380px]">{a.detalhes}</td>
                      <td>{a.fotos.length > 0 ? <button className="tag blue" onClick={() => abrirFotos(a)}><Camera /> {a.fotos.length}</button> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                  {filtradas.length === 0 && <tr><td colSpan={7} className="muted">Nenhuma ação com esses filtros.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          {naAceleracao(db, coop.id) && (
            <button className="btn link mt-3" onClick={() => nav(`/aceleracao/${coop.id}`)}>Abrir a jornada da cooperativa <ArrowRight /></button>
          )}
        </>
      )}

      <Modal
        open={!!fotos}
        onClose={() => setFotos(null)}
        title={fotos?.acao ?? ''}
        wide
        footer={
          fotos && exporta ? (
            <>
              <button className="btn ghost" disabled={!!zip} onClick={() => gerarZip(fotos.fotos, fotos, `fotos_${slug(fotos.etapa)}_${fotos.data}`)}>
                <FolderArchive /> Baixar todas desta ação ({fotos.fotos.length})
              </button>
              <button className="btn pri" disabled={!!zip || sel.size === 0} onClick={() => gerarZip(fotos.fotos.filter((f) => sel.has(chave(f))), fotos, 'fotos_selecionadas')}>
                <FolderArchive /> {zip ? `Gerando ZIP ${zip}` : `Baixar selecionadas (${sel.size}) .zip`}
              </button>
            </>
          ) : undefined
        }
      >
        {fotos && exporta && (
          <div className="flex items-center gap-3 flex-wrap text-[13px]">
            <b className="tnum">{sel.size} de {fotos.fotos.length} selecionadas</b>
            <button className="btn link xs" onClick={() => setSel(new Set(fotos.fotos.map(chave)))}>Selecionar todas</button>
            <button className="btn link xs" onClick={() => setSel(new Set())}>Limpar seleção</button>
          </div>
        )}
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {fotos?.fotos.map((f) => {
            const k = chave(f);
            const on = sel.has(k);
            return (
              <figure key={k} className="m-0">
                <button
                  type="button"
                  className={cn('relative block w-full rounded-lg overflow-hidden transition', exporta && (on ? 'ring-[3px] ring-[var(--leaf)]' : 'opacity-60'))}
                  onClick={() => exporta && setSel((x) => { const n = new Set(x); if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                  aria-pressed={on}
                  aria-label={`Selecionar ${f.descricao}`}
                >
                  <MediaThumb id={f.mediaId} kind={f.mediaId.startsWith('seed:vid') || f.arquivo.endsWith('_video') ? 'vid' : 'img'} className="aspect-[4/3]" />
                  {exporta && (
                    <span className={cn('absolute top-1.5 right-1.5 w-6 h-6 rounded-md grid place-items-center border-2', on ? 'bg-[var(--leaf)] border-[var(--leaf)] text-white' : 'bg-white/90 border-[#c6d1bf]')}>
                      {on && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                  )}
                </button>
                <figcaption className="text-[11px] muted mt-1 leading-tight">{f.descricao}</figcaption>
              </figure>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
