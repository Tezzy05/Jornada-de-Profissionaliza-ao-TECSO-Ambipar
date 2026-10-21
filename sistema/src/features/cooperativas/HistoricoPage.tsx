import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, FolderArchive, Search, Camera, History, ArrowRight } from 'lucide-react';
import { useDB } from '@/store/db';
import { useMe, useScope } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmtShort } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Empty, MediaThumb, Modal, PageHead, toast } from '@/components/ui';
import { acoesDaCooperativa, baixarZipFotos, exportarHistoricoExcel, type Acao } from './historico';
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
      <PageHead crumbs="Cooperativas" title="Histórico da cooperativa" sub="Escolha a cooperativa para ver todas as ações feitas com ela ao longo da jornada, exportar em Excel e baixar as fotos em ZIP." />

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
        <div className="card"><Empty icon={<History />} title="Escolha uma cooperativa" text="O histórico junta integração, plano de ação, visitas DCO, suporte, capacitações, cronograma e demandas do Cidades Circular." /></div>
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
                    <span key={i} className={cn('tag', e.estado === 'ok' ? 'ok' : e.estado === 'cur' ? 'lime' : e.estado === 'lock' ? 'red' : '')} title={PRODUTOS[i].t}>P{i + 1} · {e.estado === 'lock' ? 'Bloqueado' : e.resumo}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-center px-3"><b className="block text-[24px] font-display tnum">{acoes.length}</b><span className="muted text-[12px]">ações</span></div>
            <div className="text-center px-3"><b className="block text-[24px] font-display tnum">{totalFotos}</b><span className="muted text-[12px]">fotos</span></div>
            {exporta && (
              <div className="flex gap-2 flex-wrap">
                <button className="btn dark" onClick={() => exportarHistoricoExcel(db, coop.id, acoes, me).then(() => toast('Excel exportado com 9 abas'))}><FileSpreadsheet /> Exportar Excel</button>
                <button
                  className="btn pri"
                  disabled={!!zip || !totalFotos}
                  onClick={async () => {
                    setZip('Preparando…');
                    try {
                      const n = await baixarZipFotos(db, coop.id, acoes, (a, b) => setZip(`${a}/${b}`));
                      toast(`ZIP gerado com ${n} fotos organizadas por etapa`);
                    } finally {
                      setZip(null);
                    }
                  }}
                >
                  <FolderArchive /> {zip ? `Gerando ZIP ${zip}` : 'Baixar fotos (ZIP)'}
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
                      <td>{a.fotos.length > 0 ? <button className="tag blue" onClick={() => setFotos(a)}><Camera /> {a.fotos.length}</button> : <span className="muted">—</span>}</td>
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

      <Modal open={!!fotos} onClose={() => setFotos(null)} title={fotos?.acao ?? ''} wide>
        <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {fotos?.fotos.map((f) => (
            <figure key={f.pasta + f.arquivo} className="m-0">
              <MediaThumb id={f.mediaId} kind={f.mediaId.startsWith('seed:vid') || f.arquivo.endsWith('_video') ? 'vid' : 'img'} className="aspect-[4/3] rounded-lg" />
              <figcaption className="text-[11px] muted mt-1 leading-tight">{f.descricao}</figcaption>
            </figure>
          ))}
        </div>
      </Modal>
    </div>
  );
}
