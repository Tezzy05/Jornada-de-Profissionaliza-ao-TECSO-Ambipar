import JSZip from 'jszip';
import type { DB } from '@/store/db';
import type { MediaId, Usuario } from '@/lib/types';
import { can } from '@/lib/permissions';
import { fmt, fmtDateTime } from '@/lib/dates';
import { extFromMime, getMediaBlob } from '@/lib/media';
import { exportarExcel, xd } from '@/lib/excel';
import { maskCPF, saveBlob, slug } from '@/lib/utils';
import { CENAS, EIXOS, STATUS_VISITA, visitaPct, termosOk } from '@/features/visitas/dco';
import { INTEGRACAO_ITENS, PRODUTOS } from '@/features/aceleracao/constants';
import { etapas, naAceleracao } from '@/features/aceleracao/logic';
import { respLabel } from '@/features/cidades/logic';
import { situacaoPrazo } from '@/features/cidades/constants';

export interface FotoRef {
  mediaId: MediaId;
  pasta: string;
  arquivo: string; // sem extensão
  descricao: string;
}
export interface Acao {
  data: string;
  hora: string;
  programa: string;
  etapa: string;
  acao: string;
  responsavel: string;
  status: string;
  detalhes: string;
  fotos: FotoRef[];
}

const hm = (isoStr?: string) => (isoStr ? new Date(isoStr).toTimeString().slice(0, 5) : '');
const dIso = (isoStr?: string) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const pad = (n: number) => String(n).padStart(2, '0');

/** Todas as ações registradas com a cooperativa, de todas as áreas do sistema. */
export function acoesDaCooperativa(db: DB, coopId: string, me: Usuario): Acao[] {
  const nome = (id?: string) => db.users.find((u) => u.id === id)?.nome ?? '—';
  const out: Acao[] = [];
  const PA = 'Programa de Aceleração';

  // P1 integração
  const ig = db.integracoes.find((i) => i.coopId === coopId);
  INTEGRACAO_ITENS.forEach((it) => {
    const r = ig?.itens[it.k];
    if (r?.ok) out.push({ data: dIso(r.em), hora: hm(r.em), programa: PA, etapa: 'Integração', acao: it.t, responsavel: nome(r.por), status: 'Concluído', detalhes: 'Checklist de integração', fotos: [] });
  });

  // P2 mentorias e ações do plano
  db.mentorias.filter((m) => m.coopId === coopId).forEach((m) => {
    const pasta = `Plano_de_Acao/${m.data}_Mentoria_online`;
    out.push({
      data: m.data, hora: '', programa: PA, etapa: 'Plano de Ação Online', acao: `Mentoria online (${m.modalidade})`, responsavel: nome(m.tecnicoId), status: 'Realizada',
      detalhes: `Participantes: ${m.participantes}. Pontos: ${m.pontos}`,
      fotos: m.fotos.map((f, i) => ({ mediaId: f, pasta, arquivo: `foto_${pad(i + 1)}`, descricao: `Mentoria online de ${fmt(m.data)}` })),
    });
    m.acoes.forEach((a) => out.push({ data: m.data, hora: '', programa: PA, etapa: 'Plano de Ação Online', acao: `Ação do plano: ${a.acao}`, responsavel: a.responsavel, status: a.status, detalhes: `Prazo ${fmt(a.prazo)}`, fotos: [] }));
  });

  // P3 visitas DCO
  db.visitas.filter((v) => v.coopId === coopId).forEach((v) => {
    const base = `DCO/${v.data}_Visita_${v.endereco}`;
    const fotos: FotoRef[] = [];
    v.ph.forEach((c, i) => {
      const nomeCena = `Cena_${pad(i + 1)}_${slug(CENAS[i][0])}`;
      if (c.h) fotos.push({ mediaId: c.h.id, pasta: `${base}/Registro_fotografico`, arquivo: `${nomeCena}_horizontal`, descricao: `${CENAS[i][0]} (horizontal)` });
      if (c.v) fotos.push({ mediaId: c.v.id, pasta: `${base}/Registro_fotografico`, arquivo: `${nomeCena}_vertical`, descricao: `${CENAS[i][0]} (vertical)` });
      if (c.vid) fotos.push({ mediaId: c.vid.id, pasta: `${base}/Registro_fotografico`, arquivo: `${nomeCena}_video`, descricao: `${CENAS[i][0]} (vídeo)` });
    });
    EIXOS.forEach((e) => {
      if (e.dh && !can(me, 'dados.eixo8')) return;
      e.itens.forEach((it, i) =>
        v.chk[`${e.n}-${i}`]?.fotos.forEach((f, j) => fotos.push({ mediaId: f, pasta: `${base}/Analise_Situacional`, arquivo: `Eixo_${e.n}_item_${pad(i + 1)}_${j + 1}`, descricao: `Eixo ${e.n} · ${it}` })),
      );
    });
    v.eq.forEach((q, i) => q.foto && fotos.push({ mediaId: q.foto.id, pasta: `${base}/Equipamentos`, arquivo: `${pad(i + 1)}_${slug(q.tipo)}`, descricao: `${q.tipo} × ${q.qtd} · ${q.esp}` }));
    v.termos.forEach((t) => t.anexo && t.anexo.mime.startsWith('image/') && fotos.push({ mediaId: t.anexo.mediaId, pasta: `${base}/Termos_em_papel`, arquivo: slug(t.nome), descricao: `Termo de imagem · ${t.nome}` }));
    out.push({
      data: v.data, hora: hm(v.criadaEm), programa: PA, etapa: 'DCO', acao: 'Visita de campo · Diagnóstico de Capacidade Operacional', responsavel: nome(v.tecnicoId),
      status: STATUS_VISITA[v.status].t, detalhes: `${visitaPct(v)}% preenchido · ${termosOk(v)}/${v.termos.length} termos · ${v.eq.length} equipamentos${v.capAno ? ` · capacidade ${v.capAno} t/ano` : ''}`, fotos,
    });
    if (v.plano.enviadoEm)
      out.push({ data: dIso(v.plano.enviadoEm), hora: hm(v.plano.enviadoEm), programa: PA, etapa: 'DCO', acao: 'Entrega do plano de ação', responsavel: nome(v.plano.enviadoPor), status: 'Envio confirmado', detalhes: `Para ${v.plano.destinatario} · ${v.plano.anexo?.nome ?? ''}`, fotos: [] });
    v.hist.filter((h) => /Enviada|Aprovada|Devolvida/.test(h.acao)).forEach((h) =>
      out.push({ data: dIso(h.em), hora: hm(h.em), programa: PA, etapa: 'DCO', acao: h.acao, responsavel: nome(h.por), status: h.acao, detalhes: h.detalhe ?? '', fotos: [] }),
    );
  });

  // P4 suporte
  db.atendimentos.filter((a) => a.coopId === coopId).forEach((a) =>
    out.push({
      data: a.data, hora: '', programa: PA, etapa: 'Suporte contínuo', acao: `Atendimento: ${a.tema}`, responsavel: nome(a.tecnicoId), status: 'Realizado',
      detalhes: `${a.canal} · ${a.resumo}${a.encaminhamento ? ` → ${a.encaminhamento}` : ''}`,
      fotos: a.fotos.map((f, i) => ({ mediaId: f, pasta: `Suporte_continuo/${a.data}_${slug(a.tema)}`, arquivo: `foto_${pad(i + 1)}`, descricao: `Suporte · ${a.tema}` })),
    }),
  );

  // P5 capacitações
  db.capacitacoes.filter((c) => c.coops.includes(coopId)).forEach((c) =>
    out.push({
      data: c.data, hora: c.ini, programa: PA, etapa: 'Capacitações online', acao: `Capacitação: ${c.tema}`, responsavel: nome(c.facilitadorId),
      status: c.status === 'Realizada' ? ((c.presencas[coopId] ?? 0) > 0 ? 'Participou' : 'Ausente') : c.status,
      detalhes: c.status === 'Realizada' ? `${c.presencas[coopId] ?? 0} participantes da cooperativa` : 'Convidada',
      fotos: c.status === 'Realizada' && (c.presencas[coopId] ?? 0) > 0 ? c.fotos.map((f, i) => ({ mediaId: f, pasta: `Capacitacoes/${c.data}_${slug(c.tema)}`, arquivo: `foto_${pad(i + 1)}`, descricao: `Capacitação · ${c.tema}` })) : [],
    }),
  );

  // Cronograma (agenda de campo com a cooperativa)
  db.crono.filter((c) => c.coopId === coopId).forEach((c) =>
    out.push({ data: c.data, hora: c.ini, programa: 'Cronograma de campo', etapa: c.tipo, acao: `${c.tipo} (${c.ini}–${c.fim})`, responsavel: nome(c.tecnicoId), status: c.status, detalhes: c.obs ?? '', fotos: [] }),
  );

  // Cidades Circular
  db.projetos.filter((p) => p.tipo === 'cidades' && p.coops.includes(coopId)).forEach((p) =>
    db.tarefas.filter((t) => t.projetoId === p.id).forEach((t) =>
      out.push({
        data: t.dataConclusao ?? t.dataEntrada, hora: '', programa: 'Cidades Circular', etapa: p.nome, acao: `${p.sigla}-${t.codigo} ${t.demanda}`, responsavel: respLabel(db, t.responsavel, p.id).nome,
        status: t.status, detalhes: `Prazo ${fmt(t.prazo)} · ${situacaoPrazo(t)}${t.observacoes ? ` · ${t.observacoes}` : ''}`,
        fotos: t.anexos.filter((a) => a.mime.startsWith('image/')).map((a, i) => ({ mediaId: a.mediaId, pasta: `Cidades_Circular/${slug(p.nome)}/${t.codigo}`, arquivo: `${pad(i + 1)}_${slug(a.nome.replace(/\.\w+$/, ''))}`, descricao: `${p.sigla}-${t.codigo} · ${a.nome}` })),
      }),
    ),
  );

  return out.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
}

export type FotoDaAcao = FotoRef & { data: string; acao: string };

export const fotosDasAcoes = (acoes: Acao[]): FotoDaAcao[] => acoes.flatMap((a) => a.fotos.map((f) => ({ ...f, data: a.data, acao: a.acao })));

/** ZIP com as fotos escolhidas (todas da jornada ou só as de uma ação), organizadas em pastas por etapa. */
export async function baixarZipFotos(db: DB, coopId: string, fotos: FotoDaAcao[], sufixo = 'fotos_jornada', onProgress?: (n: number, total: number) => void) {
  const coop = db.coops.find((c) => c.id === coopId)!;
  const zip = new JSZip();
  const raiz = zip.folder(`${slug(coop.nome)}_${sufixo}`)!;
  let n = 0;
  for (const f of fotos) {
    const b = await getMediaBlob(f.mediaId);
    n++;
    onProgress?.(n, fotos.length);
    if (!b) continue;
    const exemplo = f.mediaId.startsWith('seed:');
    raiz.file(`${f.pasta}/${f.arquivo}${exemplo ? '_exemplo' : ''}.${extFromMime(b.type, 'jpg')}`, b);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  saveBlob(blob, `${slug(coop.nome)}_${sufixo}.zip`);
  return fotos.length;
}

/** Excel com todas as informações da cooperativa. */
export async function exportarHistoricoExcel(db: DB, coopId: string, acoes: Acao[], me: Usuario) {
  const coop = db.coops.find((c) => c.id === coopId)!;
  const tec = db.users.find((u) => u.id === coop.tecnicoId);
  const projs = db.projetos.filter((p) => p.coops.includes(coopId));
  const visitas = db.visitas.filter((v) => v.coopId === coopId).sort((a, b) => a.data.localeCompare(b.data));
  const ets = naAceleracao(db, coopId) ? etapas(db, coopId) : [];
  const verCPF = can(me, 'dados.cpf');
  const verDH = can(me, 'dados.eixo8');
  const nome = (id?: string) => db.users.find((u) => u.id === id)?.nome ?? '';

  await exportarExcel(
    [
      {
        nome: 'Resumo',
        titulo: `Histórico da cooperativa · ${coop.nome}`,
        colunas: [{ h: 'Campo', w: 34 }, { h: 'Informação', w: 70 }],
        linhas: [
          ['Cooperativa', coop.nome], ['Cidade/UF', `${coop.cidade}/${coop.uf}`], ['Endereços', coop.enderecos.map((e) => `${e.tipo}: ${e.end}`).join(' | ')],
          ['Liderança', `${coop.lideranca} · ${coop.contato}`], ['Rede', coop.rede], ['Classificação', coop.classificacao], ['Cooperados ativos', coop.ativos],
          ['Técnico de referência', tec?.nome ?? ''], ['Projetos', projs.map((p) => p.nome).join(' | ')],
          ...ets.map((e, i) => [PRODUTOS[i].t, e.estado === 'lock' ? 'Bloqueado (integração incompleta)' : e.resumo] as [string, string]),
          ['Total de ações registradas', acoes.length], ['Total de fotos', acoes.reduce((s, a) => s + a.fotos.length, 0)],
          ['Gerado em', fmtDateTime(new Date().toISOString())], ['Gerado por', me.nome],
        ],
      },
      {
        nome: 'Ações da jornada',
        colunas: [{ h: 'Data', w: 12, date: true }, { h: 'Hora', w: 8 }, { h: 'Programa', w: 22 }, { h: 'Etapa', w: 26 }, { h: 'Ação', w: 48 }, { h: 'Responsável', w: 24 }, { h: 'Status', w: 18 }, { h: 'Detalhes', w: 60 }, { h: 'Fotos', w: 8 }],
        linhas: acoes.map((a) => [xd(a.data), a.hora, a.programa, a.etapa, a.acao, a.responsavel, a.status, a.detalhes, a.fotos.length]),
      },
      {
        nome: 'Visitas DCO',
        colunas: [{ h: 'Data', w: 12, date: true }, { h: 'Endereço', w: 14 }, { h: 'Técnico', w: 22 }, { h: 'Status', w: 22 }, { h: 'Preenchimento %', w: 15 }, { h: 'Capacidade (t/ano)', w: 16 }, { h: 'Produção média (colab./dia)', w: 18 }, { h: 'Termos assinados', w: 15 }, { h: 'Equipamentos', w: 13 }, { h: 'Plano de ação enviado em', w: 22 }, { h: 'Enviado para', w: 30 }, { h: 'Aprovada em', w: 18 }],
        linhas: visitas.map((v) => [xd(v.data), v.endereco, nome(v.tecnicoId), STATUS_VISITA[v.status].t, visitaPct(v), v.capAno, v.capDia, `${termosOk(v)}/${v.termos.length}`, v.eq.length, fmtDateTime(v.plano.enviadoEm), v.plano.destinatario, fmtDateTime(v.aprovadaEm)]),
      },
      {
        nome: 'Análise Situacional',
        colunas: [{ h: 'Visita', w: 12, date: true }, { h: 'Eixo', w: 30 }, { h: 'Item', w: 60 }, { h: 'Verificado', w: 11 }, { h: 'Infraestrutura', w: 14 }, { h: 'Limpeza', w: 12 }, { h: 'Condição', w: 30 }, { h: 'Observação', w: 50 }, { h: 'Fotos', w: 8 }],
        linhas: visitas.flatMap((v) =>
          EIXOS.filter((e) => !e.foto && (!e.dh || verDH)).flatMap((e) =>
            e.itens.map((it, i) => {
              const c = v.chk[`${e.n}-${i}`];
              return [xd(v.data), `Eixo ${e.n} · ${e.t}`, it, c?.ok ? 'Sim' : 'Não', c?.infra ?? '', c?.limpeza ?? '', c?.cond ?? '', c?.obs ?? '', c?.fotos.length ?? 0];
            }),
          ),
        ),
      },
      {
        nome: 'Equipamentos',
        colunas: [{ h: 'Visita', w: 12, date: true }, { h: 'Tipo', w: 18 }, { h: 'Qtd.', w: 6 }, { h: 'Especificação', w: 40 }, { h: 'Capacidade', w: 12 }, { h: 'Estado', w: 18 }, { h: 'Conforme NR', w: 12 }, { h: 'Danos', w: 30 }, { h: 'Foto', w: 8 }],
        linhas: visitas.flatMap((v) => v.eq.map((q) => [xd(v.data), q.tipo, q.qtd, q.esp, q.cap, q.est, q.nr, q.dano ?? '', q.foto ? 'Sim' : 'Não'])),
      },
      {
        nome: 'Termos de imagem',
        colunas: [{ h: 'Visita', w: 12, date: true }, { h: 'Cooperado(a)', w: 30 }, { h: 'CPF', w: 18 }, { h: 'Situação', w: 18 }, { h: 'Coletado em', w: 20 }],
        linhas: visitas.flatMap((v) => v.termos.map((t) => [xd(v.data), t.nome, t.cpf ? (verCPF ? t.cpf : maskCPF(t.cpf)) : '', t.assinado ? (t.anexo ? 'Papel anexado' : 'Assinado na tela') : 'Pendente', fmtDateTime(t.em)])),
      },
      {
        nome: 'Plano de ação',
        colunas: [{ h: 'Mentoria', w: 12, date: true }, { h: 'Ação', w: 50 }, { h: 'Responsável', w: 26 }, { h: 'Prazo', w: 12, date: true }, { h: 'Status', w: 14 }],
        linhas: db.mentorias.filter((m) => m.coopId === coopId).flatMap((m) => m.acoes.map((a) => [xd(m.data), a.acao, a.responsavel, xd(a.prazo), a.status])),
      },
      {
        nome: 'Capacitações',
        colunas: [{ h: 'Data', w: 12, date: true }, { h: 'Tema', w: 44 }, { h: 'Facilitação', w: 24 }, { h: 'Status', w: 12 }, { h: 'Participantes da cooperativa', w: 22 }],
        linhas: db.capacitacoes.filter((c) => c.coops.includes(coopId)).map((c) => [xd(c.data), c.tema, nome(c.facilitadorId), c.status, c.status === 'Realizada' ? c.presencas[coopId] ?? 0 : '']),
      },
    ],
    `Historico_${slug(coop.nome)}.xlsx`,
  );
}
