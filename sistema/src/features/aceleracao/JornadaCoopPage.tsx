import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Plus, ArrowRight, Camera, Trash2, History, PlayCircle, CheckCircle2, FileText } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { useMe } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmt, fmtDateTime, fmtShort, nowISO, today } from '@/lib/dates';
import { cn, uid } from '@/lib/utils';
import { capturarFoto } from '@/lib/upload';
import { Avatar, Bar, CheckBox, Empty, Field, MediaThumb, Modal, toast } from '@/components/ui';
import type { AcaoPlano, Atendimento, Mentoria } from '@/lib/types';
import { CANAIS, INTEGRACAO_ITENS, MODALIDADES, PRODUTOS, TEMAS_SUPORTE } from './constants';
import { etapas, integracaoStatus } from './logic';
import { STATUS_VISITA, visitaPct } from '@/features/visitas/dco';
import { criarVisita } from '@/features/visitas/actions';
import { TecnicoSelect, trocarResponsavel } from '@/components/TecnicoSelect';

const projetoAcel = (db: { projetos: { id: string; tipo: string; coops: string[] }[] }, coopId: string) => db.projetos.find((p) => p.tipo === 'aceleracao' && p.coops.includes(coopId))?.id;

export default function JornadaCoopPage() {
  const { coopId } = useParams();
  const db = useDB();
  const me = useMe()!;
  const nav = useNavigate();
  const coop = db.coops.find((c) => c.id === coopId);
  const ets = coop ? etapas(db, coop.id) : [];
  const [sel, setSel] = useState(() => Math.max(0, ets.findIndex((e) => e.estado !== 'ok')));
  if (!coop) return <Empty title="Cooperativa não encontrada" />;
  const ig = integracaoStatus(db, coop.id);
  const tec = db.users.find((u) => u.id === coop.tecnicoId);
  const travado = !ig.completa;

  return (
    <div>
      <div className="crumbs"><button onClick={() => nav('/aceleracao')}>Programa de Aceleração</button> › {coop.nome}</div>
      <div className="card p-5 flex gap-4 items-center flex-wrap">
        <div className="w-[54px] h-[54px] rounded-[14px] bg-[var(--ink)] grid place-items-center text-[var(--lime)] font-display font-extrabold text-[18px] flex-none">{coop.sigla}</div>
        <div className="flex-1 min-w-[220px]">
          <div className="flex gap-2 items-center flex-wrap"><h1 className="text-[22px] font-extrabold">{coop.nome}</h1><span className="tag">{coop.classificacao}</span>{coop.rede !== 'Sem rede' && <span className="tag blue">{coop.rede}</span>}</div>
          <div className="muted text-[12.5px] mt-1">{coop.cidade}/{coop.uf} · Liderança: {coop.lideranca} · {coop.contato} · {coop.ativos} cooperados ativos</div>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <Avatar u={tec} size="sm" />
          <span>
            <span className="muted block">Técnico de referência</span>
            {can(me, 'aceleracao.responsaveis') ? (
              <TecnicoSelect
                id="coop-tec"
                className="!py-1 !w-auto"
                value={coop.tecnicoId}
                onChange={(id) => {
                  db.mut((d) => { d.coops.find((c) => c.id === coop.id)!.tecnicoId = id; });
                  trocarResponsavel(id, projetoAcel(db, coop.id), `a cooperativa ${coop.nome}`);
                }}
              />
            ) : (
              <b>{tec?.nome}</b>
            )}
          </span>
        </div>
        {can(me, 'coop.historico') && <button className="btn ghost sm" onClick={() => nav(`/historico?coop=${coop.id}`)}><History /> Histórico e exportação</button>}
      </div>

      <div className="steps mt-4">
        {PRODUTOS.map((p, i) => {
          const e = ets[i];
          return (
            <button key={p.k} className={cn('step', sel === i && 'on')} onClick={() => setSel(i)}>
                            <b>{p.t}</b>
              <div className="flex items-center justify-between gap-2">
                <span className={cn('tag', e.estado === 'ok' ? 'ok' : e.estado === 'cur' ? 'lime' : e.estado === 'lock' ? 'red' : '')}>
                  {e.estado === 'lock' ? <><Lock /> Bloqueado</> : e.estado === 'ok' ? <><CheckCircle2 /> {e.resumo}</> : e.resumo}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {sel > 0 && travado && (
          <div className="alert red mb-3 flex gap-2 items-start">
            <Lock className="w-4 h-4 flex-none mt-0.5" />
            <span>Integração incompleta ({ig.feitos}/{ig.total}). <button className="btn link !p-0" onClick={() => setSel(0)}>Ir para a integração</button></span>
          </div>
        )}
        {sel === 0 && <P1 coopId={coop.id} />}
        {sel === 1 && <P2 coopId={coop.id} travado={travado} />}
        {sel === 2 && <P3 coopId={coop.id} travado={travado} />}
        {sel === 3 && <P4 coopId={coop.id} travado={travado} />}
        {sel === 4 && <P5 coopId={coop.id} />}
      </div>
    </div>
  );
}

// ---------------- P1: integração ----------------
function P1({ coopId }: { coopId: string }) {
  const db = useDB();
  const me = useMe()!;
  const reg = db.integracoes.find((i) => i.coopId === coopId);
  const ig = integracaoStatus(db, coopId);
  const pode = can(me, 'integracao.checklist');
  const toggle = (k: string) => {
    if (!pode) return toast('Seu perfil não marca o checklist de integração', true);
    db.mut((d) => {
      let r = d.integracoes.find((i) => i.coopId === coopId);
      if (!r) {
        r = { coopId, itens: {} };
        d.integracoes.push(r);
      }
      const cur = r.itens[k]?.ok;
      r.itens[k] = cur ? { ok: false } : { ok: true, por: me.id, em: nowISO() };
    });
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="card">
        <div className="pad pb-2 flex justify-between items-center gap-3 flex-wrap">
          <h3 className="m-0 text-[15px] font-bold">Checklist de integração da cooperativa</h3>
          <span className={cn('tag tnum', ig.completa ? 'ok' : 'warn')}>{ig.feitos} de {ig.total}</span>
        </div>
        {INTEGRACAO_ITENS.map((it) => {
          const r = reg?.itens[it.k];
          return (
            <div key={it.k} className="ci">
              <div className="l" onClick={() => toggle(it.k)}>
                <CheckBox on={!!r?.ok} disabled={!pode} label={it.t} />
                <span className="lt">{it.t}</span>
              </div>
              {r?.ok && <div className="muted text-[12px] mt-1 ml-[34px]">Marcado por {db.users.find((u) => u.id === r.por)?.nome} em {fmtDateTime(r.em)}</div>}
            </div>
          );
        })}
      </div>
      <div className="card pad self-start grid gap-3">
        <h3 className="text-[15px] font-bold">Andamento da integração</h3>
        <Bar v={(ig.feitos / ig.total) * 100} thick />
        {ig.completa ? <span className="tag ok justify-self-start"><CheckCircle2 /> Integração completa</span> : <span className="tag warn justify-self-start">Faltam {ig.total - ig.feitos} itens</span>}
      </div>
    </div>
  );
}

// ---------------- P2: plano de ação online ----------------
function P2({ coopId, travado }: { coopId: string; travado: boolean }) {
  const db = useDB();
  const me = useMe()!;
  const [modal, setModal] = useState(false);
  const ms = db.mentorias.filter((m) => m.coopId === coopId).sort((a, b) => b.data.localeCompare(a.data));
  const pode = can(me, 'aceleracao.editar') && !travado;
  const podeResp = can(me, 'aceleracao.responsaveis');
  const setAcao = (mId: string, aId: string, status: AcaoPlano['status']) =>
    db.mut((d) => { d.mentorias.find((m) => m.id === mId)!.acoes.find((a) => a.id === aId)!.status = status; });
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold m-0">Mentorias online e plano de ação</h3>
        {can(me, 'aceleracao.editar') && <button className="btn pri sm" disabled={travado} onClick={() => setModal(true)}><Plus /> Registrar mentoria</button>}
      </div>
      {ms.length === 0 && <div className="card"><Empty title="Nenhuma mentoria registrada" /></div>}
      {ms.map((m) => (
        <div key={m.id} className="card">
          <div className="pad pb-3 flex justify-between gap-3 flex-wrap">
            <div>
              <b className="font-display">Mentoria de {fmt(m.data)}</b>
              <div className="muted text-[12.5px]">{m.modalidade} · {m.participantes}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[12.5px]">
                <span className="muted">Técnico responsável:</span>
                {podeResp ? (
                  <TecnicoSelect
                    className="!py-1 !w-auto !text-[12.5px]"
                    value={m.tecnicoId}
                    onChange={(id) => {
                      db.mut((d) => { d.mentorias.find((x) => x.id === m.id)!.tecnicoId = id; });
                      trocarResponsavel(id, projetoAcel(db, coopId), `a mentoria de ${fmt(m.data)}`);
                    }}
                  />
                ) : (
                  <b>{db.users.find((u) => u.id === m.tecnicoId)?.nome}</b>
                )}
              </div>
            </div>
            <span className="tag tnum self-start">{m.acoes.filter((a) => a.status === 'Concluída').length}/{m.acoes.length} ações concluídas</span>
          </div>
          <div className="px-5 pb-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="grid gap-3 min-w-0">
              <div className="text-[13px]"><span className="lbl block mb-1">Pontos levantados</span>{m.pontos}</div>
              <div className="tbl-wrap panel">
                <table>
                  <thead><tr><th>Ação</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
                  <tbody>
                    {m.acoes.map((a) => (
                      <tr key={a.id}>
                        <td>{a.acao}</td>
                        <td className="min-w-[160px]">
                          {pode ? (
                            <input className="field !py-1 !text-[12.5px]" value={a.responsavel} aria-label="Responsável pela ação" onChange={(e) => db.mut((d) => { d.mentorias.find((x) => x.id === m.id)!.acoes.find((y) => y.id === a.id)!.responsavel = e.target.value; })} />
                          ) : (
                            <span className="muted">{a.responsavel}</span>
                          )}
                        </td>
                        <td className="tnum">{fmtShort(a.prazo)}</td>
                        <td>
                          <select className="field !py-1 !text-[12.5px] min-w-[130px]" disabled={!pode} value={a.status} onChange={(e) => setAcao(m.id, a.id, e.target.value as AcaoPlano['status'])} aria-label="Status da ação">
                            <option>A fazer</option><option>Em andamento</option><option>Concluída</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 self-start">
              {m.fotos.map((f) => <MediaThumb key={f} id={f} kind="img" className="aspect-[4/3] rounded-lg" />)}
              {m.fotos.length === 0 && <span className="muted text-[12.5px]">Sem fotos.</span>}
            </div>
          </div>
        </div>
      ))}
      <MentoriaModal open={modal} coopId={coopId} onClose={() => setModal(false)} />
    </div>
  );
}

function MentoriaModal({ open, coopId, onClose }: { open: boolean; coopId: string; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const blank = (): Omit<Mentoria, 'id' | 'coopId' | 'tecnicoId'> => ({ data: today(), modalidade: MODALIDADES[0], participantes: '', pontos: '', fotos: [], acoes: [{ id: uid(), acao: '', responsavel: '', prazo: '', status: 'A fazer' }] });
  const [f, setF] = useState(blank);
  const [k, setK] = useState(open);
  if (k !== open) {
    setK(open);
    if (open) setF(blank());
  }
  const salvar = () => {
    if (!f.participantes.trim() || !f.pontos.trim()) return toast('Preencha participantes e pontos levantados', true);
    const acoes = f.acoes.filter((a) => a.acao.trim());
    if (!acoes.length) return toast('Inclua pelo menos uma ação no plano', true);
    const coop = db.coops.find((c) => c.id === coopId)!;
    db.mut((d) => { d.mentorias.push({ ...f, acoes, id: uid(), coopId, tecnicoId: me.id }); });
    log('sistema', `Mentoria online registrada: ${coop.nome}`, coopId);
    toast('Mentoria registrada. O técnico verá estas informações no dia da visita.');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Registrar mentoria online (Plano de Ação)" wide footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Salvar mentoria</button></>}>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Data" req><input id="me-data" type="date" className="field" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <Field label="Modalidade" req><select id="me-mod" className="field" value={f.modalidade} onChange={(e) => setF({ ...f, modalidade: e.target.value })}>{MODALIDADES.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Participantes" req><input id="me-part" className="field" placeholder="Nome (função), ..." value={f.participantes} onChange={(e) => setF({ ...f, participantes: e.target.value })} /></Field>
      </div>
      <Field label="Pontos levantados" req><textarea id="me-pontos" className="field min-h-[80px]" value={f.pontos} onChange={(e) => setF({ ...f, pontos: e.target.value })} /></Field>
      <div>
        <div className="flex justify-between items-center mb-2"><span className="fl"><label className="!mb-0">Ações do plano</label></span><button className="btn ghost xs" onClick={() => setF({ ...f, acoes: [...f.acoes, { id: uid(), acao: '', responsavel: '', prazo: '', status: 'A fazer' }] })}><Plus /> Ação</button></div>
        <div className="grid gap-2">
          {f.acoes.map((a, i) => (
            <div key={a.id} className="grid grid-cols-[1.6fr_1fr_140px_32px] gap-2 items-center">
              <input className="field" placeholder="Ação" value={a.acao} onChange={(e) => { const x = [...f.acoes]; x[i] = { ...a, acao: e.target.value }; setF({ ...f, acoes: x }); }} aria-label="Ação" />
              <input className="field" placeholder="Responsável" value={a.responsavel} onChange={(e) => { const x = [...f.acoes]; x[i] = { ...a, responsavel: e.target.value }; setF({ ...f, acoes: x }); }} aria-label="Responsável" />
              <input className="field" type="date" value={a.prazo} onChange={(e) => { const x = [...f.acoes]; x[i] = { ...a, prazo: e.target.value }; setF({ ...f, acoes: x }); }} aria-label="Prazo" />
              <button className="icon-btn" onClick={() => setF({ ...f, acoes: f.acoes.filter((y) => y.id !== a.id) })} aria-label="Remover ação"><Trash2 /></button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <span className="fl"><label>Fotos / prints da reunião</label></span>
        <div className="flex gap-2 flex-wrap items-center">
          {f.fotos.map((id) => <MediaThumb key={id} id={id} kind="img" className="w-20 h-16 rounded-lg" />)}
          <button className="photo-btn" onClick={async () => { const r = await capturarFoto(); if (r) setF({ ...f, fotos: [...f.fotos, r.id] }); }}><Camera /> Incluir foto</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- P3: DCO ----------------
function P3({ coopId, travado }: { coopId: string; travado: boolean }) {
  const db = useDB();
  const me = useMe()!;
  const nav = useNavigate();
  const vs = db.visitas.filter((v) => v.coopId === coopId).sort((a, b) => b.data.localeCompare(a.data));
  const podeResp = can(me, 'aceleracao.responsaveis');
  const podeIniciar = can(me, 'visitas.preencher') && db.projetos.some((p) => p.coops.includes(coopId) && p.tecnicos.includes(me.id));
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold m-0">Visitas DCO desta cooperativa</h3>
        {podeIniciar && (
          <button className="btn pri sm" disabled={travado} onClick={() => { const r = criarVisita({ coopId, tecnicoId: me.id }); if ('erro' in r) return toast(r.erro, true); nav(`/visitas/${r.id}`); }}>
            <PlayCircle /> Iniciar visita DCO
          </button>
        )}
      </div>
      {vs.length === 0 ? (
        <div className="card"><Empty title="Nenhuma visita DCO ainda" /></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Data</th><th>Técnico</th><th>Status</th><th>Preenchimento</th><th>Plano de ação entregue</th><th /></tr></thead>
              <tbody>
                {vs.map((v) => {
                  const ok = me.id === v.tecnicoId || can(me, 'visitas.verTodas');
                  return (
                    <tr key={v.id} className={ok ? 'clickable' : ''} onClick={() => ok && nav(`/visitas/${v.id}`)}>
                      <td className="tnum">{fmt(v.data)}</td>
                      <td onClick={(e) => podeResp && e.stopPropagation()}>
                        {podeResp && v.status !== 'aprovada' ? (
                          <TecnicoSelect
                            className="!py-1 !w-auto !text-[12.5px]"
                            value={v.tecnicoId}
                            onChange={(id) => {
                              db.mut((d) => {
                                const x = d.visitas.find((y) => y.id === v.id)!;
                                x.tecnicoId = id;
                                x.hist.push({ em: new Date().toISOString(), por: me.id, acao: 'Técnico responsável alterado', detalhe: db.users.find((u) => u.id === id)?.nome });
                              });
                              trocarResponsavel(id, v.projetoId, `a visita DCO de ${fmt(v.data)}`);
                            }}
                          />
                        ) : (
                          db.users.find((u) => u.id === v.tecnicoId)?.nome
                        )}
                      </td>
                      <td><span className={`tag ${STATUS_VISITA[v.status].cls}`}>{STATUS_VISITA[v.status].t}</span></td>
                      <td style={{ minWidth: 140 }}><Bar v={visitaPct(v)} /><small className="muted tnum">{visitaPct(v)}%</small></td>
                      <td>{v.plano.enviadoEm ? <span className="tag ok"><FileText /> {fmtDateTime(v.plano.enviadoEm)}</span> : <span className="tag warn">Pendente</span>}</td>
                      <td className="text-right">{ok && <ArrowRight className="w-4 h-4 muted inline" />}</td>
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

// ---------------- P4: suporte contínuo ----------------
function P4({ coopId, travado }: { coopId: string; travado: boolean }) {
  const db = useDB();
  const me = useMe()!;
  const [modal, setModal] = useState(false);
  const podeResp = can(me, 'aceleracao.responsaveis');
  const as = db.atendimentos.filter((a) => a.coopId === coopId).sort((a, b) => b.data.localeCompare(a.data));
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold m-0">Atendimentos de suporte contínuo</h3>
        {can(me, 'aceleracao.editar') && <button className="btn pri sm" disabled={travado} onClick={() => setModal(true)}><Plus /> Registrar atendimento</button>}
      </div>
      {as.length === 0 ? (
        <div className="card"><Empty title="Nenhum atendimento registrado" /></div>
      ) : (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Data</th><th>Tema</th><th>Canal</th><th>Resumo e encaminhamento</th><th>Técnico</th><th>Fotos</th></tr></thead>
              <tbody>
                {as.map((a) => (
                  <tr key={a.id}>
                    <td className="tnum">{fmtShort(a.data)}</td>
                    <td><span className="tag">{a.tema}</span></td>
                    <td className="muted">{a.canal}</td>
                    <td className="text-[13px]">{a.resumo}<div className="muted text-[12px]">→ {a.encaminhamento}</div></td>
                    <td>
                      {podeResp ? (
                        <TecnicoSelect
                          className="!py-1 !w-auto !text-[12.5px]"
                          value={a.tecnicoId}
                          onChange={(id) => {
                            db.mut((d) => { d.atendimentos.find((x) => x.id === a.id)!.tecnicoId = id; });
                            trocarResponsavel(id, projetoAcel(db, coopId), `o atendimento de ${fmtShort(a.data)}`);
                          }}
                        />
                      ) : (
                        <span className="muted">{db.users.find((u) => u.id === a.tecnicoId)?.nome}</span>
                      )}
                    </td>
                    <td><div className="flex gap-1">{a.fotos.map((f) => <MediaThumb key={f} id={f} kind="img" className="w-12 h-10 rounded-md" />)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AtendimentoModal open={modal} coopId={coopId} onClose={() => setModal(false)} />
    </div>
  );
}

function AtendimentoModal({ open, coopId, onClose }: { open: boolean; coopId: string; onClose: () => void }) {
  const db = useDB();
  const me = useMe()!;
  const blank = (): Omit<Atendimento, 'id' | 'coopId' | 'tecnicoId'> => ({ data: today(), tema: TEMAS_SUPORTE[0], canal: CANAIS[0], resumo: '', encaminhamento: '', fotos: [] });
  const [f, setF] = useState(blank);
  const [k, setK] = useState(open);
  if (k !== open) {
    setK(open);
    if (open) setF(blank());
  }
  const salvar = () => {
    if (!f.resumo.trim()) return toast('Descreva o atendimento', true);
    db.mut((d) => { d.atendimentos.push({ ...f, id: uid(), coopId, tecnicoId: me.id }); });
    toast('Atendimento registrado');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Registrar atendimento de suporte" footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn pri" onClick={salvar}>Salvar atendimento</button></>}>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Data" req><input id="at-data" type="date" className="field" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
        <Field label="Tema" req><select id="at-tema" className="field" value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })}>{TEMAS_SUPORTE.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Canal" req><select id="at-canal" className="field" value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value })}>{CANAIS.map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <Field label="Resumo da orientação" req><textarea id="at-res" className="field" value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} /></Field>
      <Field label="Encaminhamento" opt><input id="at-enc" className="field" value={f.encaminhamento} onChange={(e) => setF({ ...f, encaminhamento: e.target.value })} /></Field>
      <div className="flex gap-2 flex-wrap items-center">
        {f.fotos.map((id) => <MediaThumb key={id} id={id} kind="img" className="w-20 h-16 rounded-lg" />)}
        <button className="photo-btn" onClick={async () => { const r = await capturarFoto(); if (r) setF({ ...f, fotos: [...f.fotos, r.id] }); }}><Camera /> Incluir foto</button>
      </div>
    </Modal>
  );
}

// ---------------- P5: capacitações ----------------
function P5({ coopId }: { coopId: string }) {
  const db = useDB();
  const nav = useNavigate();
  const caps = db.capacitacoes.filter((c) => c.coops.includes(coopId)).sort((a, b) => b.data.localeCompare(a.data));
  // meta: ao menos 1 capacitação por mês
  const meses = new Map<string, boolean>();
  caps.filter((c) => c.status === 'Realizada').forEach((c) => {
    const m = c.data.slice(0, 7);
    meses.set(m, (meses.get(m) ?? false) || (c.presencas[coopId] ?? 0) > 0);
  });
  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <h3 className="text-[15px] font-bold m-0">Capacitações online com esta cooperativa</h3>
        <button className="btn ghost sm" onClick={() => nav('/capacitacoes')}>Agenda de capacitações <ArrowRight /></button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[...meses.entries()].sort().map(([m, ok]) => (
          <span key={m} className={cn('tag', ok ? 'ok' : 'red')}>{m.slice(5)}/{m.slice(0, 4)} · {ok ? 'participou' : 'não participou'}</span>
        ))}
      </div>
      <div className="card">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Data</th><th>Tema</th><th>Status</th><th>Participantes da cooperativa</th></tr></thead>
            <tbody>
              {caps.map((c) => (
                <tr key={c.id}>
                  <td className="tnum">{fmt(c.data)} · {c.ini}</td>
                  <td><b className="text-[13px]">{c.tema}</b></td>
                  <td><span className={`tag ${c.status === 'Realizada' ? 'ok' : c.status === 'Agendada' ? 'blue' : 'red'}`}>{c.status}</span></td>
                  <td className="tnum">{c.status === 'Realizada' ? (c.presencas[coopId] ? `${c.presencas[coopId]} pessoas` : <span className="tag red">Ausente</span>) : '—'}</td>
                </tr>
              ))}
              {caps.length === 0 && <tr><td colSpan={4} className="muted">Nenhuma capacitação com esta cooperativa.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

