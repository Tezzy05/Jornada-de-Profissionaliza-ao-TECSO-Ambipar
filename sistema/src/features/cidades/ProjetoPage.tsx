import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, FileSpreadsheet, Paperclip, Download, Trash2, MapPin, CalendarRange, Check, Pencil, Users, Lock } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { useMe } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmt, fmtShort } from '@/lib/dates';
import { cn, saveBlob, uid } from '@/lib/utils';
import { getMediaBlob } from '@/lib/media';
import { Avatar, Bar, confirmar, Empty, Field, Modal, toast } from '@/components/ui';
import type { Agente, Tarefa, TipoAgente } from '@/lib/types';
import { cmpCodigo, PRIO_CLS, SIT_CLS, situacaoPrazo, STATUS_CLS, STATUS_TAREFA, type SituacaoPrazo } from './constants';
import { progresso, respLabel, resumoProjeto } from './logic';
import { exportarProjeto, RespSelect } from './shared';
import { trocarResponsavel } from '@/components/TecnicoSelect';
import TarefaDrawer, { NovaTarefaModal } from './TarefaDrawer';

type Aba = 'estrutura' | 'lista' | 'responsaveis';

export default function ProjetoPage() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const db = useDB();
  const me = useMe()!;
  const nav = useNavigate();
  const [aba, setAba] = useState<Aba>('estrutura');
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const [aberta, setAberta] = useState<string | null>(sp.get('t'));
  const [nova, setNova] = useState<{ projetoId: string; topicoId: string; parentId?: string } | null>(null);
  const [novoTopico, setNovoTopico] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<{ status: string; sit: string; resp: string }>({ status: '', sit: '', resp: '' });
  useEffect(() => setAberta(sp.get('t')), [sp]);

  const p = db.projetos.find((x) => x.id === id);
  if (!p) return <Empty title="Projeto não encontrado" />;
  if (!can(me, 'projetos.todos') && !p.tecnicos.includes(me.id))
    return <Empty icon={<Lock />} title="Você não está vinculado a este projeto" text="A coordenação define quais técnicos enxergam cada projeto." />;
  const gere = can(me, 'cidades.gerir');
  const r = resumoProjeto(db, p);
  const tops = db.topicos.filter((t) => t.projetoId === p.id).sort((a, b) => cmpCodigo(a.codigo, b.codigo));
  const ts = db.tarefas.filter((t) => t.projetoId === p.id);
  const abrir = (tid: string | null) => {
    setAberta(tid);
    if (!tid) setSp({});
  };

  const linha = (t: Tarefa, child = false) => {
    const rl = respLabel(db, t.responsavel, p.id);
    const s = situacaoPrazo(t);
    return (
      <div key={t.id} className={cn('trow', child && 'child')} onClick={() => abrir(t.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && abrir(t.id)}>
        <span className="tnum muted text-[12px]">{p.sigla}-{t.codigo}</span>
        <span className="tdem min-w-0"><b className="font-medium">{t.demanda}</b>{t.anexos.length > 0 && <Paperclip className="inline w-3 h-3 ml-1 muted" />}</span>
        <span className="min-w-0 truncate text-[12.5px]">{rl.nome}{rl.externo && <span className="block text-[11px] text-[#5b3d9a]">{rl.tipo}</span>}</span>
        <span className="tnum text-[12.5px]">{fmtShort(t.prazo)}</span>
        <span><span className={`tag ${SIT_CLS[s]}`}>{s}</span></span>
        <span><span className={`tag ${PRIO_CLS[t.prioridade]}`}>{t.prioridade}</span></span>
        <span><span className={`tag ${STATUS_CLS[t.status]}`}>{t.status}</span></span>
        <ChevronRight className="w-4 h-4 muted" />
      </div>
    );
  };

  const lista = ts
    .filter((t) => !filtro.status || t.status === filtro.status)
    .filter((t) => !filtro.sit || situacaoPrazo(t) === filtro.sit)
    .filter((t) => !filtro.resp || t.responsavel === filtro.resp)
    .sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
  const responsaveisUsados = [...new Set(ts.map((t) => t.responsavel))];

  return (
    <div>
      <div className="crumbs"><button onClick={() => nav('/cidades')}>Cidades Circular</button> › {p.nome}</div>
      <div className="card overflow-hidden">
        <div className="p-5 text-white flex gap-4 flex-wrap items-end justify-between" style={{ background: 'linear-gradient(135deg,var(--ink),#0c3a24)' }}>
          <div className="min-w-0">
            <span className="lbl !text-[#9fb6a3]">{p.cliente}</span>
            <h1 className="text-[24px] font-extrabold">{p.nome}</h1>
            <div className="flex gap-4 mt-1.5 text-[12.5px] text-[#b9cbbd] flex-wrap [&_svg]:w-3.5 [&_svg]:h-3.5 [&>span]:flex [&>span]:gap-1 [&>span]:items-center">
              <span><MapPin /> {p.municipio}/{p.uf}</span>
              <span><CalendarRange /> Vigência {fmt(p.inicio)} a {fmt(p.fim)}</span>
              <span><Users /> {p.tecnicos.map((t) => db.users.find((u) => u.id === t)?.nome).join(', ')}</span>
            </div>
            {p.descricao && <p className="text-[13px] text-[#dfe9df] mt-2 max-w-[760px]">{p.descricao}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {p.documento && (
              <button className="btn sm" style={{ color: '#fff', border: '1.5px solid #2f5a3a' }} onClick={async () => { const b = await getMediaBlob(p.documento!.mediaId); if (b) saveBlob(b, p.documento!.nome); }}>
                <Download /> Macro projeto aprovado
              </button>
            )}
            <button className="btn pri sm" onClick={() => exportarProjeto(db, p).then(() => toast('Planilha exportada'))}><FileSpreadsheet /> Exportar Excel</button>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 p-5 items-center">
          <div className="col-span-2">
            <div className="flex justify-between text-[12.5px] mb-1"><span className="muted">Progresso do projeto · {r.feitas} de {r.total} demandas</span><b className="tnum">{r.pct}%</b></div>
            <Bar v={r.pct} thick />
          </div>
          <div><span className="lbl">Atrasadas</span><b className="block text-[22px] font-display tnum" style={{ color: r.atrasadas ? 'var(--danger)' : undefined }}>{r.atrasadas}</b></div>
          <div><span className="lbl">Vencem em até 3 dias</span><b className="block text-[22px] font-display tnum" style={{ color: r.breve ? 'var(--warn)' : undefined }}>{r.breve}</b></div>
          <div><span className="lbl">Bloqueadas</span><b className="block text-[22px] font-display tnum">{r.bloqueadas}</b></div>
        </div>
      </div>

      <div className="flex gap-3 justify-between items-center flex-wrap my-4">
        <div className="tabs">
          {([['estrutura', 'Tópicos e subtarefas'], ['lista', 'Lista de demandas'], ['responsaveis', 'Responsáveis']] as [Aba, string][]).map(([k, l]) => (
            <button key={k} className={cn('tab', aba === k && 'on')} onClick={() => setAba(k)}>{l}</button>
          ))}
        </div>
        {aba === 'estrutura' && gere && <button className="btn pri sm" onClick={() => setNovoTopico('')}><Plus /> Novo tópico</button>}
      </div>

      {aba === 'estrutura' && (
        <div className="grid gap-3">
          {tops.length === 0 && <div className="card"><Empty title="Nenhum tópico ainda" /></div>}
          {tops.map((tp) => {
            const doTopico = ts.filter((t) => t.topicoId === tp.id);
            const subs = doTopico.filter((t) => !t.parentId).sort((a, b) => cmpCodigo(a.codigo, b.codigo));
            const pr = progresso(doTopico);
            const aberto = !fechados.has(tp.id);
            const atras = doTopico.filter((t) => situacaoPrazo(t) === 'Atrasada').length;
            return (
              <div key={tp.id} className="topic">
                <div className="topic-h" onClick={() => { const n = new Set(fechados); if (aberto) n.add(tp.id); else n.delete(tp.id); setFechados(n); }}>
                  {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className="w-8 h-8 rounded-lg bg-[var(--ink)] text-[var(--lime)] grid place-items-center font-display font-extrabold text-[13px] flex-none">{tp.codigo}</span>
                  <div className="flex-1 min-w-0">
                    <b className="font-display text-[15px]">{tp.titulo}</b>
                    <div className="muted text-[12px]">{subs.length} subtarefa{subs.length === 1 ? '' : 's'} · {doTopico.length - subs.length} ite{doTopico.length - subs.length === 1 ? 'm' : 'ns'}{atras ? ` · ${atras} atrasada${atras > 1 ? 's' : ''}` : ''}</div>
                  </div>
                  <div className="w-40 hidden sm:block"><Bar v={pr.pct} /><small className="muted tnum">{pr.feitas}/{pr.total} · {pr.pct}%</small></div>
                  {gere && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="btn ghost xs" onClick={() => setNova({ projetoId: p.id, topicoId: tp.id })}><Plus /> Subtarefa</button>
                      <button className="icon-btn" aria-label="Renomear tópico" onClick={() => setNovoTopico(tp.id)}><Pencil /></button>
                      <button
                        className="icon-btn"
                        aria-label="Excluir tópico"
                        onClick={async () => {
                          if (!(await confirmar('Excluir tópico', `O tópico "${tp.titulo}" e as ${doTopico.length} demandas dele serão excluídos.`, 'Excluir', true))) return;
                          db.mut((d) => { d.topicos = d.topicos.filter((x) => x.id !== tp.id); d.tarefas = d.tarefas.filter((x) => x.topicoId !== tp.id); });
                          toast('Tópico excluído');
                        }}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  )}
                </div>
                {aberto && (
                  <div className="overflow-x-auto">
                    <div className="trow head"><span>ID</span><span>Demanda</span><span>Responsável</span><span>Prazo</span><span>Situação de prazo</span><span>Prioridade</span><span>Status</span><span /></div>
                    {subs.map((s) => [linha(s), ...ts.filter((x) => x.parentId === s.id).sort((a, b) => cmpCodigo(a.codigo, b.codigo)).map((c) => linha(c, true))])}
                    {subs.length === 0 && <div className="px-5 py-4 muted text-[13px] border-t border-[var(--line)]">Nenhuma subtarefa neste tópico.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {aba === 'lista' && (
        <div className="card">
          <div className="pad flex gap-2 flex-wrap">
            <select id="fl-st" className="field !w-auto" value={filtro.status} onChange={(e) => setFiltro({ ...filtro, status: e.target.value })}><option value="">Todos os status</option>{STATUS_TAREFA.map((s) => <option key={s}>{s}</option>)}</select>
            <select id="fl-sit" className="field !w-auto" value={filtro.sit} onChange={(e) => setFiltro({ ...filtro, sit: e.target.value })}>
              <option value="">Toda situação de prazo</option>
              {(['Atrasada', 'Vence em breve', 'No prazo', 'Sem prazo', 'Concluída no prazo', 'Concluída com atraso'] as SituacaoPrazo[]).map((s) => <option key={s}>{s}</option>)}
            </select>
            <select id="fl-resp" className="field !w-auto" value={filtro.resp} onChange={(e) => setFiltro({ ...filtro, resp: e.target.value })}>
              <option value="">Todos os responsáveis</option>
              {responsaveisUsados.map((x) => <option key={x} value={x}>{respLabel(db, x, p.id).nome}</option>)}
            </select>
            <span className="muted text-[12.5px] self-center ml-auto">{lista.length} demandas · ordenadas por prazo</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>ID</th><th>Data de Entrada</th><th>Solicitante</th><th>Área</th><th>Demanda</th><th>Prioridade</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>Data de Conclusão</th><th>Situação de Prazo</th><th>Observações</th></tr></thead>
              <tbody>
                {lista.map((t) => {
                  const s = situacaoPrazo(t);
                  return (
                    <tr key={t.id} className="clickable" onClick={() => abrir(t.id)}>
                      <td className="tnum muted whitespace-nowrap">{p.sigla}-{t.codigo}</td>
                      <td className="tnum">{fmtShort(t.dataEntrada)}</td>
                      <td className="text-[12.5px]">{t.solicitante}</td>
                      <td><span className="tag">{t.area}</span></td>
                      <td className="min-w-[220px]"><b className="font-medium text-[13px]">{t.demanda}</b></td>
                      <td><span className={`tag ${PRIO_CLS[t.prioridade]}`}>{t.prioridade}</span></td>
                      <td><span className={`tag ${STATUS_CLS[t.status]}`}>{t.status}</span></td>
                      <td className="text-[12.5px] whitespace-nowrap">{respLabel(db, t.responsavel, p.id).nome}</td>
                      <td className="tnum">{fmtShort(t.prazo)}</td>
                      <td className="tnum">{fmtShort(t.dataConclusao)}</td>
                      <td><span className={`tag ${SIT_CLS[s]}`}>{s}</span></td>
                      <td className="muted text-[12px] min-w-[160px]">{t.observacoes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'responsaveis' && <Responsaveis projetoId={p.id} />}

      <TarefaDrawer id={aberta} onClose={() => abrir(null)} onNovoItem={(parentId) => { const t = ts.find((x) => x.id === parentId)!; setNova({ projetoId: p.id, topicoId: t.topicoId, parentId }); }} />
      <NovaTarefaModal ctx={nova} onClose={() => setNova(null)} />
      <TopicoModal projetoId={p.id} editId={novoTopico} onClose={() => setNovoTopico(null)} />
    </div>
  );
}

function TopicoModal({ projetoId, editId, onClose }: { projetoId: string; editId: string | null; onClose: () => void }) {
  const db = useDB();
  const tp = db.topicos.find((t) => t.id === editId);
  const [titulo, setTitulo] = useState('');
  const [k, setK] = useState<string | null>(null);
  if (k !== editId) {
    setK(editId);
    setTitulo(tp?.titulo ?? '');
  }
  const salvar = () => {
    if (!titulo.trim()) return toast('Escreva o título do tópico', true);
    db.mut((d) => {
      if (tp) d.topicos.find((x) => x.id === tp.id)!.titulo = titulo.trim();
      else {
        const n = d.topicos.filter((t) => t.projetoId === projetoId).map((t) => +t.codigo);
        d.topicos.push({ id: 'tp_' + uid(), projetoId, codigo: String((n.length ? Math.max(...n) : 0) + 1), titulo: titulo.trim() });
      }
    });
    toast(tp ? 'Tópico renomeado' : 'Tópico criado');
    onClose();
  };
  return (
    <Modal open={editId !== null} onClose={onClose} title={tp ? 'Renomear tópico' : 'Novo tópico do macro projeto'} footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}><Check /> Salvar</button></>}>
      <Field label="Título" req><input id="tp-titulo" className="field" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}

function Responsaveis({ projetoId }: { projetoId: string }) {
  const db = useDB();
  const me = useMe()!;
  const p = db.projetos.find((x) => x.id === projetoId)!;
  const gere = can(me, 'cidades.gerir');
  const [ag, setAg] = useState<Agente | null>(null);
  const [transf, setTransf] = useState<string | null>(null);
  const tecs = db.users.filter((u) => u.ativo && u.perfil === 'tecnico');
  const cont = (resp: string) => db.tarefas.filter((t) => t.projetoId === p.id && t.responsavel === resp && t.status !== 'Concluída').length;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="card">
        <div className="pad pb-2"><h3 className="text-[15px] font-bold m-0">Técnicos vinculados ao projeto</h3></div>
        <div className="tbl-wrap">
          <table>
            <tbody>
              {tecs.map((u) => {
                const on = p.tecnicos.includes(u.id);
                if (!gere && !on) return null;
                return (
                  <tr key={u.id}>
                    <td><div className="tc"><Avatar u={u} size="sm" />{u.nome}</div></td>
                    <td className="muted text-[12.5px]">
                      {cont('u:' + u.id)} demandas abertas
                      {gere && cont('u:' + u.id) > 0 && <button className="btn link xs !flex !px-0 mt-0.5" onClick={() => setTransf('u:' + u.id)}>Transferir</button>}
                    </td>
                    <td className="text-right">
                      {gere ? (
                        <button
                          className={cn('btn xs', on ? 'dark' : 'ghost')}
                          onClick={() => {
                            if (on && p.tecnicos.length === 1) return toast('O projeto precisa de pelo menos um técnico principal', true);
                            db.mut((d) => { const x = d.projetos.find((y) => y.id === p.id)!; x.tecnicos = on ? x.tecnicos.filter((t) => t !== u.id) : [...x.tecnicos, u.id]; });
                            log('projeto', `${on ? 'Desvinculou' : 'Vinculou'} ${u.nome} ${on ? 'do' : 'ao'} projeto ${p.nome}`, p.id);
                            toast(on ? `${u.nome} não vê mais este projeto` : `${u.nome} agora vê este projeto`);
                          }}
                        >
                          {on ? <><Check /> Vinculado</> : 'Vincular'}
                        </button>
                      ) : (
                        <span className="tag ok">Vinculado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <div className="pad pb-2 flex justify-between items-start gap-3">
          <div><h3 className="text-[15px] font-bold m-0">Responsáveis externos</h3></div>
          {gere && <button className="btn pri sm" onClick={() => setAg({ id: '', tipo: 'Cliente', nome: '', organizacao: '', contato: '' })}><Plus /> Incluir</button>}
        </div>
        <div className="tbl-wrap">
          <table>
            <tbody>
              {p.agentes.map((a) => (
                <tr key={a.id} className={gere ? 'clickable' : ''} onClick={() => gere && setAg(a)}>
                  <td><span className="tag violet">{a.tipo}</span></td>
                  <td><b>{a.nome}</b><div className="muted text-[12px]">{a.organizacao}</div></td>
                  <td className="text-[12.5px] select-all">{a.contato || <span className="text-[var(--danger)]">Sem contato</span>}</td>
                  <td className="muted text-[12.5px] whitespace-nowrap">
                    {cont('a:' + a.id)} abertas
                    {gere && cont('a:' + a.id) > 0 && <button className="btn link xs !flex !px-0 mt-0.5" onClick={(e) => { e.stopPropagation(); setTransf('a:' + a.id); }}>Transferir</button>}
                  </td>
                </tr>
              ))}
              {p.agentes.length === 0 && <tr><td className="muted">Nenhum responsável externo.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <AgenteModal projetoId={p.id} ag={ag} onClose={() => setAg(null)} />
      <TransferirModal projetoId={p.id} de={transf} onClose={() => setTransf(null)} />
    </div>
  );
}

function AgenteModal({ projetoId, ag, onClose }: { projetoId: string; ag: Agente | null; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState<Agente | null>(ag);
  const [k, setK] = useState(ag);
  if (k !== ag) {
    setK(ag);
    setF(ag);
  }
  if (!f) return null;
  const salvar = () => {
    if (!f.nome.trim() || !f.contato.trim()) return toast('Nome e contato são obrigatórios', true);
    db.mut((d) => {
      const p = d.projetos.find((x) => x.id === projetoId)!;
      if (f.id) p.agentes = p.agentes.map((a) => (a.id === f.id ? f : a));
      else p.agentes.push({ ...f, id: 'ag_' + uid() });
    });
    toast('Responsável externo salvo');
    onClose();
  };
  const remover = async () => {
    const usado = db.tarefas.some((t) => t.responsavel === 'a:' + f.id);
    if (usado) return toast('Este responsável tem demandas. Troque o responsável delas antes de remover.', true);
    if (!(await confirmar('Remover responsável externo', `${f.nome} será removido do projeto.`, 'Remover', true))) return;
    db.mut((d) => { const p = d.projetos.find((x) => x.id === projetoId)!; p.agentes = p.agentes.filter((a) => a.id !== f.id); });
    onClose();
  };
  return (
    <Modal
      open={!!ag}
      onClose={onClose}
      title={f.id ? 'Editar responsável externo' : 'Novo responsável externo'}
      footer={<>{f.id && <button className="btn danger mr-auto" onClick={remover}><Trash2 /> Remover</button>}<button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Salvar</button></>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Tipo" req><select id="agm-tipo" className="field" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoAgente })}><option>Cliente</option><option>Cooperativa</option><option>Prefeitura</option></select></Field>
        <Field label="Nome" req><input id="agm-nome" className="field" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
        <Field label="Organização"><input id="agm-org" className="field" value={f.organizacao ?? ''} onChange={(e) => setF({ ...f, organizacao: e.target.value })} /></Field>
        <Field label="Contato" req><input id="agm-cont" className="field" placeholder="Telefone e/ou e-mail" value={f.contato} onChange={(e) => setF({ ...f, contato: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}


/** Passa todas as demandas abertas de um responsável para outro (ex.: técnico que saiu do projeto). */
function TransferirModal({ projetoId, de, onClose }: { projetoId: string; de: string | null; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const p = db.projetos.find((x) => x.id === projetoId)!;
  const [para, setPara] = useState('');
  const [desvincular, setDesvincular] = useState(true);
  const [k, setK] = useState(de);
  if (k !== de) {
    setK(de);
    setPara('');
    setDesvincular(true);
  }
  if (!de) return null;
  const abertas = db.tarefas.filter((t) => t.projetoId === p.id && t.responsavel === de && t.status !== 'Concluída');
  const origem = respLabel(db, de, p.id).nome;
  const salvar = () => {
    if (!para || para === de) return toast('Escolha quem vai assumir as demandas', true);
    const destino = respLabel(db, para, p.id).nome;
    db.mut((d) => {
      d.tarefas.forEach((t) => {
        if (t.projetoId === p.id && t.responsavel === de && t.status !== 'Concluída') {
          t.responsavel = para;
          t.comentarios.push({ id: uid(), por: me.id, em: new Date().toISOString(), texto: `Responsável alterado de ${origem} para ${destino}` });
        }
      });
      if (desvincular && de.startsWith('u:')) {
        const x = d.projetos.find((y) => y.id === p.id)!;
        if (x.tecnicos.length > 1) x.tecnicos = x.tecnicos.filter((t) => t !== de.slice(2));
      }
    });
    if (para.startsWith('u:')) trocarResponsavel(para.slice(2), p.id, `${abertas.length} demandas de ${origem}`);
    else toast(`${abertas.length} demandas transferidas para ${destino}`);
    log('projeto', `${abertas.length} demandas transferidas de ${origem} para ${destino} (${p.nome})`, p.id);
    onClose();
  };
  return (
    <Modal open={!!de} onClose={onClose} title={`Transferir demandas de ${origem}`} footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Transferir {abertas.length} demandas</button></>}>
      <div className="panel max-h-[200px] overflow-auto">
        {abertas.map((t) => (
          <div key={t.id} className="flex gap-2 px-3 py-2 border-b last:border-0 border-[var(--line)] text-[13px]"><span className="tnum muted">{p.sigla}-{t.codigo}</span><span className="min-w-0 truncate">{t.demanda}</span></div>
        ))}
      </div>
      <Field label="Novo responsável" req><RespSelect id="tr-para" projeto={p} value={para} onChange={setPara} /></Field>
      {de.startsWith('u:') && p.tecnicos.includes(de.slice(2)) && (
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={desvincular} onChange={(e) => setDesvincular(e.target.checked)} /> Desvincular {origem} do projeto</label>
      )}
    </Modal>
  );
}
