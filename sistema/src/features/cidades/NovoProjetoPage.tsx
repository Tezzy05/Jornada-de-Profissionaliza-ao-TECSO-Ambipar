import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, Paperclip, Plus, Trash2, Upload, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { useMe } from '@/store/scope';
import { addDays, nowISO, today } from '@/lib/dates';
import { cn, uid } from '@/lib/utils';
import { baixarModeloMacro, lerMacroProjeto, type ResultadoImportacao } from '@/lib/excel';
import { anexarArquivo } from '@/lib/upload';
import { pickFile, Avatar, Field, PageHead, toast } from '@/components/ui';
import type { Agente, Anexo, Projeto, Tarefa, Topico, TipoAgente } from '@/lib/types';

const PASSOS = ['Dados do projeto', 'Técnicos e responsáveis', 'Macro projeto aprovado', 'Revisar e criar'];

export default function NovoProjetoPage() {
  const db = useDB();
  const me = useMe()!;
  const nav = useNavigate();
  const [passo, setPasso] = useState(0);
  const [d, setD] = useState({ municipio: '', uf: 'GO', cliente: '', nome: '', sigla: '', inicio: today(), fim: addDays(today(), 180), descricao: '', coops: [] as string[] });
  const [tecnicos, setTecnicos] = useState<string[]>([]);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [novoAg, setNovoAg] = useState({ tipo: 'Cliente' as TipoAgente, nome: '', organizacao: '', contato: '' });
  const [imp, setImp] = useState<ResultadoImportacao | null>(null);
  const [arquivoImp, setArquivoImp] = useState('');
  const [doc, setDoc] = useState<Anexo | null>(null);
  const [lendo, setLendo] = useState(false);

  const tecs = db.users.filter((u) => u.ativo && u.perfil === 'tecnico');
  const nomeAuto = d.municipio ? `Cidades Circular · ${d.municipio}/${d.uf}` : '';
  const siglaAuto = d.municipio.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

  const valida = (p: number) => {
    if (p === 0) {
      if (!d.cliente.trim() || !d.municipio.trim()) return 'Preencha cliente e município.';
      if (d.fim < d.inicio) return 'O fim da vigência deve ser depois do início.';
    }
    if (p === 1 && tecnicos.length === 0) return 'Vincule pelo menos um técnico principal ao projeto.';
    if (p === 2 && imp && imp.erros.length) return 'Corrija os erros da planilha ou remova a importação para criar os tópicos depois.';
    return null;
  };
  const avancar = () => {
    const e = valida(passo);
    if (e) return toast(e, true);
    setPasso(passo + 1);
  };

  const importar = async () => {
    const f = await pickFile('.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', false);
    if (!f) return;
    setLendo(true);
    try {
      const r = await lerMacroProjeto(f, db.users, agentes);
      setImp(r);
      setArquivoImp(f.name);
      if (!r.erros.length) toast(`Planilha lida: ${r.linhas.filter((l) => l.nivel === 1).length} tópicos e ${r.linhas.filter((l) => l.nivel > 1).length} demandas`);
    } catch {
      toast('Não foi possível ler o arquivo. Confira se é um .xlsx no formato do modelo.', true);
    } finally {
      setLendo(false);
    }
  };

  const criar = () => {
    const id = 'p_' + uid();
    const sigla = (d.sigla || siglaAuto || 'CC').toUpperCase();
    const novosAg = [...agentes, ...(imp?.agentes ?? [])];
    const p: Projeto = {
      id, tipo: 'cidades', nome: d.nome || nomeAuto, sigla, cliente: d.cliente, municipio: d.municipio, uf: d.uf, inicio: d.inicio, fim: d.fim,
      descricao: d.descricao, tecnicos, coops: d.coops, agentes: novosAg, documento: doc ?? undefined, status: 'Ativo', criadoEm: nowISO(), criadoPor: me.id,
    };
    const topicos: Topico[] = [];
    const tarefas: Tarefa[] = [];
    const porCodigo = new Map<string, string>();
    (imp?.linhas ?? []).forEach((l) => {
      if (l.nivel === 1) {
        const t = { id: 'tp_' + uid(), projetoId: id, codigo: l.codigo, titulo: l.titulo };
        topicos.push(t);
        porCodigo.set(l.codigo, t.id);
        return;
      }
      const partes = l.codigo.split('.');
      const topicoId = porCodigo.get(partes[0])!;
      const tid = 'tk_' + uid();
      porCodigo.set(l.codigo, tid);
      tarefas.push({
        id: tid, projetoId: id, topicoId, parentId: l.nivel === 3 ? porCodigo.get(partes.slice(0, 2).join('.')) : undefined, codigo: l.codigo,
        dataEntrada: l.dataEntrada ?? today(), solicitante: l.solicitante, area: l.area, demanda: l.titulo, prioridade: l.prioridade, status: l.status,
        responsavel: l.responsavel, prazo: l.prazo, dataConclusao: l.dataConclusao, observacoes: l.observacoes, anexos: [], comentarios: [], criadaEm: nowISO(),
      });
    });
    db.mut((x) => {
      x.projetos.push(p);
      x.topicos.push(...topicos);
      x.tarefas.push(...tarefas);
    });
    log('projeto', `Projeto criado${imp ? ` e macro projeto importado (${topicos.length} tópicos, ${tarefas.length} demandas)` : ''}: ${p.nome}`, id);
    toast('Projeto criado. Os técnicos vinculados já enxergam o projeto.');
    nav(`/cidades/${id}`);
  };

  const topicosPrev = imp?.linhas.filter((l) => l.nivel === 1) ?? [];

  return (
    <div className="max-w-[1100px]">
      <PageHead crumbs={<><button onClick={() => nav('/cidades')}>Cidades Circular</button> › Novo projeto</>} title="Novo projeto Cidades Circular" />

      <ol className="grid gap-2 grid-cols-2 lg:grid-cols-4 mb-5">
        {PASSOS.map((t, i) => (
          <li key={t} className={cn('step !cursor-default', i === passo && 'on')}>
            <span className="n">PASSO {i + 1}</span>
            <b className="flex items-center gap-1.5">{i < passo && <CheckCircle2 className="w-4 h-4 text-[var(--ok)]" />}{t}</b>
          </li>
        ))}
      </ol>

      <div className="card pad grid gap-4">
        {passo === 0 && (
          <>
            <div className="grid sm:grid-cols-[2fr_1fr_1fr] gap-3">
              <Field label="Cliente" req><input id="np-cli" className="field" value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value })} placeholder="Empresa contratante" /></Field>
              <Field label="Município" req><input id="np-mun" className="field" value={d.municipio} onChange={(e) => setD({ ...d, municipio: e.target.value })} /></Field>
              <Field label="UF" req><input id="np-uf" className="field" maxLength={2} value={d.uf} onChange={(e) => setD({ ...d, uf: e.target.value.toUpperCase() })} /></Field>
            </div>
            <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
              <Field label="Nome do projeto"><input id="np-nome" className="field" value={d.nome} placeholder={nomeAuto || 'Cidades Circular · Município/UF'} onChange={(e) => setD({ ...d, nome: e.target.value })} /></Field>
              <Field label="Sigla (para os IDs)"><input id="np-sigla" className="field" maxLength={5} value={d.sigla} placeholder={siglaAuto} onChange={(e) => setD({ ...d, sigla: e.target.value.toUpperCase() })} /></Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Início da vigência" req><input id="np-ini" type="date" className="field" value={d.inicio} onChange={(e) => setD({ ...d, inicio: e.target.value })} /></Field>
              <Field label="Fim da vigência" req><input id="np-fim" type="date" className="field" value={d.fim} onChange={(e) => setD({ ...d, fim: e.target.value })} /></Field>
            </div>
            <Field label="Cooperativas envolvidas" opt>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {db.coops.map((c) => (
                  <label key={c.id} className="inline-flex gap-1.5 items-center">
                    <input type="checkbox" checked={d.coops.includes(c.id)} onChange={(e) => setD({ ...d, coops: e.target.checked ? [...d.coops, c.id] : d.coops.filter((x) => x !== c.id) })} />
                    {c.nome} <span className="muted text-[12px]">· {c.cidade}/{c.uf}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Resumo do que foi fechado com o cliente" opt><textarea id="np-desc" className="field min-h-[80px]" value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} /></Field>
          </>
        )}

        {passo === 1 && (
          <>
            <div>
              <h3 className="text-[15px] font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Técnicos principais responsáveis pelo projeto <span className="req">Obrig.</span></h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {tecs.map((u) => {
                const on = tecnicos.includes(u.id);
                const n = db.projetos.filter((p) => p.tecnicos.includes(u.id)).length;
                return (
                  <button key={u.id} className={cn('panel p-3 flex items-center gap-3 text-left transition', on ? '!border-[var(--ink)] shadow-[0_0_0_2px_var(--ink)]' : 'hover:border-[var(--leaf)]')} onClick={() => setTecnicos(on ? tecnicos.filter((x) => x !== u.id) : [...tecnicos, u.id])}>
                    <span className={cn('cb', on && 'y')}>{on && <Check strokeWidth={3} />}</span>
                    <Avatar u={u} size="sm" />
                    <span className="min-w-0"><b className="block">{u.nome}</b><small className="muted">{n} projeto{n === 1 ? '' : 's'} hoje</small></span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[var(--line)] pt-4">
              <h3 className="text-[15px] font-bold">Responsáveis externos <span className="opt">Opcional</span></h3>
              <div className="grid sm:grid-cols-[140px_1fr_1fr_1fr_auto] gap-2 mt-3 items-end">
                <Field label="Tipo"><select id="ag-tipo" className="field" value={novoAg.tipo} onChange={(e) => setNovoAg({ ...novoAg, tipo: e.target.value as TipoAgente })}><option>Cliente</option><option>Cooperativa</option><option>Prefeitura</option></select></Field>
                <Field label="Nome" req><input id="ag-nome" className="field" value={novoAg.nome} onChange={(e) => setNovoAg({ ...novoAg, nome: e.target.value })} /></Field>
                <Field label="Organização"><input id="ag-org" className="field" value={novoAg.organizacao} onChange={(e) => setNovoAg({ ...novoAg, organizacao: e.target.value })} /></Field>
                <Field label="Contato" req><input id="ag-cont" className="field" placeholder="Telefone e/ou e-mail" value={novoAg.contato} onChange={(e) => setNovoAg({ ...novoAg, contato: e.target.value })} /></Field>
                <button className="btn dark" onClick={() => { if (!novoAg.nome.trim() || !novoAg.contato.trim()) return toast('Informe nome e contato do responsável externo', true); setAgentes([...agentes, { id: 'ag_' + uid(), ...novoAg }]); setNovoAg({ ...novoAg, nome: '', organizacao: '', contato: '' }); }}><Plus /> Incluir</button>
              </div>
              {agentes.length > 0 && (
                <div className="tbl-wrap panel mt-3">
                  <table>
                    <tbody>
                      {agentes.map((a) => (
                        <tr key={a.id}><td><span className="tag violet">{a.tipo}</span></td><td><b>{a.nome}</b><div className="muted text-[12px]">{a.organizacao}</div></td><td className="muted">{a.contato}</td><td className="text-right"><button className="icon-btn" aria-label="Remover" onClick={() => setAgentes(agentes.filter((x) => x.id !== a.id))}><Trash2 /></button></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {passo === 2 && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="panel p-4 grid gap-3 content-start">
                <h3 className="text-[15px] font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /> Planilha do macro projeto (Excel)</h3>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn pri" onClick={importar} disabled={lendo}><Upload /> {lendo ? 'Lendo…' : imp ? 'Importar outra planilha' : 'Importar planilha'}</button>
                  <button className="btn ghost" onClick={() => baixarModeloMacro()}><FileSpreadsheet /> Baixar modelo</button>
                  {imp && <button className="btn link" onClick={() => { setImp(null); setArquivoImp(''); }}>Remover importação</button>}
                </div>
                {imp && (
                  <div className="grid gap-2">
                    <span className="tag self-start">{arquivoImp}</span>
                    {imp.erros.length > 0 && (
                      <div className="alert red"><b className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {imp.erros.length} erro{imp.erros.length > 1 ? 's' : ''} para corrigir na planilha</b><ul className="list-disc ml-5 mt-1">{imp.erros.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul></div>
                    )}
                    {imp.avisos.length > 0 && (
                      <div className="alert"><b>{imp.avisos.length} aviso{imp.avisos.length > 1 ? 's' : ''}</b><ul className="list-disc ml-5 mt-1">{imp.avisos.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>{imp.avisos.length > 8 && <span className="muted">e mais {imp.avisos.length - 8}…</span>}</div>
                    )}
                    {!imp.erros.length && <div className="info flex gap-2 items-center"><CheckCircle2 className="w-4 h-4 text-[var(--ok)]" /> {topicosPrev.length} tópicos, {imp.linhas.filter((l) => l.nivel === 2).length} subtarefas, {imp.linhas.filter((l) => l.nivel === 3).length} itens e {imp.agentes.length} novos agentes externos.</div>}
                  </div>
                )}
              </div>
              <div className="panel p-4 grid gap-3 content-start">
                <h3 className="text-[15px] font-bold flex items-center gap-2"><Paperclip className="w-4 h-4" /> Documento aprovado com o cliente</h3>
                <div className="flex gap-2 items-center flex-wrap">
                  <button className="btn ghost" onClick={async () => { const a = await anexarArquivo(me.id, '.pdf,.doc,.docx,.xlsx,.ppt,.pptx,image/*'); if (a) setDoc(a); }}><Paperclip /> {doc ? 'Trocar documento' : 'Anexar documento'}</button>
                  {doc && <span className="tag ok">{doc.nome}</span>}
                </div>
              </div>
            </div>
            {imp && !imp.erros.length && (
              <div className="panel overflow-hidden">
                <div className="px-4 py-2.5 lbl bg-[#fafbf8] border-b border-[var(--line)]">Pré-visualização</div>
                <div className="max-h-[360px] overflow-auto">
                  {imp.linhas.map((l) => (
                    <div key={l.codigo} className={cn('flex gap-3 px-4 py-2 border-b border-[var(--line)] text-[13px] items-center', l.nivel === 1 && 'bg-[var(--lime-soft)] font-semibold')} style={{ paddingLeft: 16 + (l.nivel - 1) * 22 }}>
                      <span className="tnum muted w-12 flex-none">{l.codigo}</span>
                      <span className="flex-1 min-w-0">{l.titulo}</span>
                      {l.nivel > 1 && <span className="muted text-[12px] w-48 truncate">{l.responsavelNome || 'Sem responsável'}</span>}
                      {l.nivel > 1 && <span className="tnum muted text-[12px] w-20">{l.prazo ? l.prazo.split('-').reverse().join('/') : ''}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {passo === 3 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2 text-[13.5px] content-start">
              <span className="lbl">Projeto</span>
              <b className="font-display text-[17px]">{d.nome || nomeAuto}</b>
              <span>Cliente: {d.cliente}</span>
              <span>Vigência: {d.inicio.split('-').reverse().join('/')} a {d.fim.split('-').reverse().join('/')}</span>
              <span>Sigla dos IDs: {(d.sigla || siglaAuto).toUpperCase()}</span>
              <span>Cooperativas: {d.coops.map((c) => db.coops.find((x) => x.id === c)?.nome).join(', ') || '—'}</span>
              <span>Documento aprovado: {doc?.nome ?? 'não anexado'}</span>
            </div>
            <div className="grid gap-2 content-start">
              <span className="lbl">Técnicos principais</span>
              <div className="flex gap-2 flex-wrap">{tecnicos.map((t) => { const u = db.users.find((x) => x.id === t); return <span key={t} className="tag"><Avatar u={u} size="xs" /> {u?.nome}</span>; })}</div>
              <span className="lbl mt-2">Estrutura</span>
              <span className="text-[13.5px]">{imp ? `${topicosPrev.length} tópicos e ${imp.linhas.length - topicosPrev.length} demandas importadas` : 'Sem importação: os tópicos serão criados no projeto'}</span>
              <span className="lbl mt-2">Responsáveis externos</span>
              <span className="text-[13.5px]">{agentes.length + (imp?.agentes.length ?? 0)} cadastrados</span>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 border-t border-[var(--line)] pt-4">
          <button className="btn ghost" onClick={() => (passo ? setPasso(passo - 1) : nav('/cidades'))}><ArrowLeft /> {passo ? 'Voltar' : 'Cancelar'}</button>
          {passo < 3 ? <button className="btn pri" onClick={avancar}>Continuar <ArrowRight /></button> : <button className="btn pri" onClick={criar}><Check /> Criar projeto</button>}
        </div>
      </div>
    </div>
  );
}
