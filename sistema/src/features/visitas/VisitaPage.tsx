import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Camera, Wrench, PenLine, FileText, Receipt, Send, ChevronDown, ChevronUp, MapPin, User, CalendarDays, HardHat, CheckCircle2, Undo2, Lightbulb, History } from 'lucide-react';
import { useDB, log } from '@/store/db';
import { useMe } from '@/store/scope';
import { can } from '@/lib/permissions';
import { fmt, fmtDateTime, fmtShort, nowISO } from '@/lib/dates';
import { Bar, Empty, Field, MediaThumb, Modal, toast } from '@/components/ui';
import { chkTotals, phTotals, termosOk, declOk, planoOk, STATUS_VISITA, visitaPct } from './dco';
import { updVisita } from './actions';
import { TecnicoSelect, trocarResponsavel } from '@/components/TecnicoSelect';
import Analise from './docs/Analise';
import Fotos from './docs/Fotos';
import Equipamentos from './docs/Equipamentos';
import Termos from './docs/Termos';
import Declaracao from './docs/Declaracao';
import Relatorio from './docs/Relatorio';
import Entrega from './docs/Entrega';
import type { Visita } from '@/lib/types';

export default function VisitaPage() {
  const { id, doc } = useParams();
  const nav = useNavigate();
  const me = useMe()!;
  const db = useDB();
  const v = db.visitas.find((x) => x.id === id);
  const [planoAberto, setPlanoAberto] = useState(true);
  const [devolver, setDevolver] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [hist, setHist] = useState(false);

  if (!v) return <Empty title="Visita não encontrada" text="Ela pode ter sido excluída (só rascunhos podem ser excluídos)."><button className="btn pri" onClick={() => nav('/visitas')}>Voltar para as visitas</button></Empty>;
  const coop = db.coops.find((c) => c.id === v.coopId)!;
  const tec = db.users.find((u) => u.id === v.tecnicoId);
  const ehDono = v.tecnicoId === me.id && can(me, 'visitas.preencher');
  if (!ehDono && !can(me, 'visitas.verTodas')) return <Empty title="Esta visita é de outro técnico" text="Você só vê as suas visitas." />;
  const ro = !(ehDono && (v.status === 'rascunho' || v.status === 'devolvida'));
  const upd = (fn: (x: Visita) => void) => updVisita(v.id, fn);
  const st = STATUS_VISITA[v.status];
  const pct = visitaPct(v);
  const online = db.config.online;
  const end = coop.enderecos.find((e) => e.tipo === v.endereco)?.end ?? coop.enderecos[0]?.end;
  const mentoria = db.mentorias.filter((m) => m.coopId === v.coopId).sort((a, b) => b.data.localeCompare(a.data))[0];
  const props = { v, ro, upd, me, online };

  const [a, t] = chkTotals(v, can(me, 'dados.eixo8'));
  const [g, n] = phTotals(v);
  const cards: [string, ReactNode, string, string, number | null, number | null][] = [
    ['analise', <ClipboardList />, 'Análise Situacional', 'Checklist dos 8 eixos, com observação e foto por item.', a, t],
    ['fotos', <Camera />, 'Registro fotográfico', '14 cenas com foto H + V e vídeos obrigatórios.', g, n],
    ['equip', <Wrench />, 'Equipamentos', 'Inventário do grupo e foto de cada equipamento.', v.eq.filter((e) => e.foto).length, v.eq.length],
    ['termos', <PenLine />, 'Termos de imagem', 'Modelo padrão para imprimir e coleta das assinaturas.', termosOk(v), v.termos.length],
    ['decl', <FileText />, 'Declaração de Capacidade', 'Estrutura, resíduos, SST e capacidade operacional.', declOk(v) ? 1 : 0, 1],
    ['relat', <Receipt />, 'Relatório de Campo', 'Montado automaticamente; assinaturas e PDF.', v.rel.saved ? 1 : 0, 1],
    ['entrega', <Send />, 'Entrega', 'Checklist, plano de ação e e-mail de conclusão.', null, null],
  ];

  const aprovar = () => {
    upd((x) => {
      x.status = 'aprovada';
      x.aprovadaEm = nowISO();
      x.hist.push({ em: nowISO(), por: me.id, acao: 'Aprovada pela coordenação' });
    });
    log('visita', `Visita DCO aprovada: ${coop.nome}`, v.id);
    toast(`Visita da ${coop.nome} aprovada`);
  };
  const confirmarDevolucao = () => {
    if (!motivo.trim()) return toast('Escreva o motivo para o técnico saber o que ajustar', true);
    upd((x) => {
      x.status = 'devolvida';
      x.devolucao = { motivo: motivo.trim(), por: me.id, em: nowISO() };
      x.hist.push({ em: nowISO(), por: me.id, acao: 'Devolvida para ajuste', detalhe: motivo.trim() });
    });
    log('visita', `Visita DCO devolvida: ${coop.nome}`, v.id);
    setDevolver(false);
    setMotivo('');
    toast('Visita devolvida ao técnico com o motivo');
  };

  return (
    <div>
      <div className="crumbs">
        <button onClick={() => nav('/visitas')}>Visitas</button> › {doc ? <button onClick={() => nav(`/visitas/${v.id}`)}>{coop.nome}</button> : coop.nome}
      </div>
      <div className="card">
        <div className="flex gap-4 items-center p-5 flex-wrap">
          <div className="w-[54px] h-[54px] rounded-[14px] bg-[var(--ink)] grid place-items-center text-[var(--lime)] font-display font-extrabold text-[18px] flex-none">{coop.sigla}</div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex gap-2 items-center flex-wrap">
              <h1 className="text-[22px] font-extrabold">{coop.nome}</h1>
              <span className={`tag ${st.cls}`}>{st.t}</span>
              <span className="tag">{coop.classificacao}</span>
              {coop.rede !== 'Sem rede' && <span className="tag blue">{coop.rede}</span>}
            </div>
            <div className="flex gap-4 flex-wrap text-[12.5px] muted mt-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5 [&>span]:flex [&>span]:items-center [&>span]:gap-1">
              <span><MapPin /> {v.endereco} · {end} · {coop.cidade}-{coop.uf}</span>
              <span><User /> Liderança: {coop.lideranca}</span>
              {can(me, 'aceleracao.responsaveis') && v.status !== 'aprovada' ? (
                <span>
                  <HardHat /> Técnico:
                  <TecnicoSelect
                    className="!py-0.5 !px-2 !w-auto !text-[12.5px]"
                    value={v.tecnicoId}
                    onChange={(id) => {
                      upd((x) => {
                        x.tecnicoId = id;
                        x.hist.push({ em: nowISO(), por: me.id, acao: 'Técnico responsável alterado', detalhe: db.users.find((u) => u.id === id)?.nome });
                      });
                      trocarResponsavel(id, v.projetoId, `a visita DCO da ${coop.nome}`);
                    }}
                  />
                </span>
              ) : (
                <span><HardHat /> Técnico: {tec?.nome}</span>
              )}
              <span><CalendarDays /> {fmt(v.data)}</span>
            </div>
          </div>
          <div className="w-[180px]">
            <div className="flex justify-between text-[12px] mb-1"><span className="muted">Preenchimento</span><b className="tnum">{pct}%</b></div>
            <Bar v={pct} thick />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn ghost sm" onClick={() => setHist(true)}><History /> Histórico</button>
            {!ro && <button className="btn ghost sm" onClick={() => { upd(() => {}); toast(online ? 'Rascunho salvo e sincronizado' : 'Rascunho salvo no dispositivo'); }}>Salvar rascunho</button>}
            {v.status === 'enviada' && can(me, 'visitas.aprovar') && (
              <>
                <button className="btn ghost sm" onClick={() => setDevolver(true)}><Undo2 /> Devolver</button>
                <button className="btn pri sm" onClick={aprovar}><CheckCircle2 /> Aprovar visita</button>
              </>
            )}
          </div>
        </div>
      </div>

      {v.status === 'devolvida' && v.devolucao && (
        <div className="alert red mt-3"><b>Devolvida por {db.users.find((u) => u.id === v.devolucao!.por)?.nome} em {fmtDateTime(v.devolucao.em)}:</b> {v.devolucao.motivo}</div>
      )}
      {v.status === 'enviada' && <div className="info mt-3">Enviada em {fmtDateTime(v.enviadaEm)}. Aguardando aprovação da coordenação.</div>}
      {v.status === 'aprovada' && <div className="info mt-3">Aprovada em {fmtDateTime(v.aprovadaEm)}.</div>}

      {!doc ? (
        <>
          {mentoria && (
            <div className="card mt-4">
              <button className="w-full pad flex items-center justify-between gap-3 text-left" onClick={() => setPlanoAberto(!planoAberto)}>
                <span className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-[var(--lime-soft)] grid place-items-center"><Lightbulb className="w-5 h-5" /></span>
                  <span>
                    <b className="font-display block">Informações prévias do Plano de Ação</b>
                    <small className="muted">Mentoria online de {fmt(mentoria.data)} · {mentoria.modalidade} · para usar no dia da visita</small>
                  </span>
                </span>
                {planoAberto ? <ChevronUp className="w-5 h-5 muted" /> : <ChevronDown className="w-5 h-5 muted" />}
              </button>
              {planoAberto && (
                <div className="px-5 pb-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <div className="grid gap-3 min-w-0">
                    <div className="text-[13px]"><span className="lbl block mb-1">Pontos levantados</span>{mentoria.pontos}</div>
                    <div className="text-[13px]"><span className="lbl block mb-1">Participantes</span>{mentoria.participantes}</div>
                    <div className="tbl-wrap panel">
                      <table>
                        <thead><tr><th>Ação combinada</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr></thead>
                        <tbody>
                          {mentoria.acoes.map((ac) => (
                            <tr key={ac.id}>
                              <td>{ac.acao}</td>
                              <td className="muted">{ac.responsavel}</td>
                              <td className="tnum">{fmtShort(ac.prazo)}</td>
                              <td><span className={`tag ${ac.status === 'Concluída' ? 'ok' : ac.status === 'Em andamento' ? 'blue' : ''}`}>{ac.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <span className="lbl block mb-1">Fotos da mentoria</span>
                    <div className="grid grid-cols-2 gap-2">
                      {mentoria.fotos.map((f) => <MediaThumb key={f} id={f} kind="img" className="aspect-[4/3] rounded-lg" />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="backbar">
            <h2>{ro ? 'Documentos da visita' : 'Qual documento você quer preencher?'}</h2>
            <span className="muted text-[12.5px]">A identificação do grupo é digitada uma vez e reaproveitada em todos.</span>
          </div>
          <div className="docs">
            {cards.map(([k, ic, tt, d, x, y]) => {
              const p = y ? Math.round(((x ?? 0) / y) * 100) : null;
              const extra = k === 'entrega' ? (planoOk(v) ? 'Plano de ação entregue' : 'Plano de ação pendente') : null;
              return (
                <button key={k} className="card doc" onClick={() => nav(`/visitas/${v.id}/${k}`)}>
                  <div className="flex justify-between items-center">
                    <span className="di">{ic}</span>
                    {p === null ? null : p === 100 ? <span className="tag ok">Completo</span> : <span className="tag warn tnum">{p}%</span>}
                  </div>
                  <b>{tt}</b>
                  <p>{d}</p>
                  {p === null ? (
                    <div className="ft"><span className="muted">{extra}</span><span>Abrir →</span></div>
                  ) : (
                    <>
                      <Bar v={p} />
                      <div className="ft"><span className="muted tnum">{k === 'decl' || k === 'relat' ? (x ? 'Concluído' : 'Pendente') : `${x} de ${y}`}</span><span>Abrir →</span></div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div>
          <div className="crumbs mt-4"><button onClick={() => nav(`/visitas/${v.id}`)}>← Documentos</button></div>
          {doc === 'analise' && <Analise {...props} onFotos={() => nav(`/visitas/${v.id}/fotos`)} />}
          {doc === 'fotos' && <Fotos {...props} />}
          {doc === 'equip' && <Equipamentos {...props} />}
          {doc === 'termos' && <Termos {...props} />}
          {doc === 'decl' && <Declaracao {...props} />}
          {doc === 'relat' && <Relatorio {...props} />}
          {doc === 'entrega' && <Entrega {...props} />}
        </div>
      )}

      <Modal
        open={devolver}
        onClose={() => setDevolver(false)}
        title="Devolver visita para ajuste"
        footer={<><button className="btn ghost" onClick={() => setDevolver(false)}>Cancelar</button><button className="btn pri" onClick={confirmarDevolucao}>Devolver ao técnico</button></>}
      >
        <Field label="O que precisa ser ajustado?" req>
          <textarea id="dev-motivo" className="field min-h-[100px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: refazer a foto vertical da fachada; faltam 2 termos de imagem." />
        </Field>
      </Modal>

      <Modal open={hist} onClose={() => setHist(false)} title="Histórico da visita">
        <div className="grid gap-0">
          {[...v.hist].reverse().map((h, i) => (
            <div key={i} className="chk !items-start">
              <span className="tag tnum whitespace-nowrap">{fmtDateTime(h.em)}</span>
              <span><b>{h.acao}</b> · {db.users.find((u) => u.id === h.por)?.nome}{h.detalhe && <span className="muted block text-[12.5px]">{h.detalhe}</span>}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
