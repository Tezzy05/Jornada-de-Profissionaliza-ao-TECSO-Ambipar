import type { Cena, ChkItem, Visita } from '@/lib/types';

// Definições do Diagnóstico de Capacidade Operacional (DCO), vindas do mockup original.

export interface Eixo {
  n: number;
  t: string;
  req?: string;
  cond?: boolean;
  risco?: boolean;
  foto?: boolean;
  dh?: boolean;
  itens: string[];
}

export const EIXOS: Eixo[] = [
  { n: 1, t: 'Indicadores socioambientais', req: 'Com o responsável administrativo/financeiro.', itens: ['Prestação de contas e ferramentas de gestão administrativa', 'Controles de indicadores do processo produtivo (triado/dia, rejeito/dia, produção da prensa)', 'Total de profissionais da reciclagem (mulheres e homens)', 'Volume médio total comercializado', 'Volume médio mensal de rejeitos', 'Volume e preço médio de plástico, vidro, metal e papel', 'Faturamento mensal', 'Principais fontes de entrada de dinheiro', 'Renda média mensal', 'Principais despesas mensais'] },
  { n: 2, t: 'Estrutura física e infraestrutura', req: 'Condição de infraestrutura e de limpeza: cobertura, ventilação, iluminação, piso, sinalização, elétrica, armazenamento.', cond: true, itens: ['Banheiro/vestiário feminino', 'Banheiro/vestiário masculino', 'Cozinha/refeitório', 'Escritório', 'Área interna (visão geral do galpão)', 'Recebimento de resíduos a triar', 'Área da triagem', 'Estoque de resíduos a prensar', 'Área da prensagem', 'Estoque de prensados (fardos)', 'Área de volumoso (vidro/sucata/papelão)', 'Área externa (visão geral)', 'Fachada'] },
  { n: 3, t: 'Saúde, segurança e meio ambiente', req: 'Registrar condição atual e potenciais riscos.', risco: true, itens: ['Proteção individual: uniforme, EPIs usados, dúvidas de uso', 'Riscos de acidente: atividades de alto risco, movimentação e armazenamento', 'Prevenção a incêndios: possui extintores, quantos, no prazo, sabem usar', 'Resíduos perigosos, rejeitos e destino final', 'Vetores (mosquitos, roedores, animais)', 'Água potável, poeira, odores e ruídos', 'Primeiros socorros no local', 'Avaliação geral do eixo'] },
  { n: 4, t: 'Operação', req: 'Fluxo, controles, comercialização e parcerias.', itens: ['Coleta seletiva: quem realiza, caminhão, solta ou embagada, coletores capacitados', 'Qualidade do material: abastecimento, rejeito, recuperação média', 'Fluxo produtivo: layout definido, retrabalho', 'Triagem: como é feita, quantos tipos, equipamentos', 'Prensagem: estoque a prensar, equipamentos', 'Organização e limpeza: calendário, práticas de 5S', 'Comercialização: desafios, estratégias, resíduos sem destino', 'Postos de trabalho: divisão de tarefas e lideranças', 'Parcerias estratégicas: benefícios e contrapartidas', 'Parcerias governamentais: convênio com prefeitura'] },
  { n: 5, t: 'Regularização documental', req: 'Os termos são coletados no documento "Termos de imagem".', itens: ['Termos de uso de imagem de todos os cooperados ativos', 'Lista de profissionais ativos', 'Documentos específicos solicitados pela governança (se houver)'] },
  { n: 6, t: 'Registro fotográfico', foto: true, itens: [] },
  { n: 7, t: 'Equipamentos', req: 'O inventário e as fotos ficam no documento "Equipamentos".', itens: ['Inventário preenchido (tipo, quantidade, especificação, capacidade, danos)', 'Conformidade com as Normas Regulamentadoras', 'Calendário de limpeza e de manutenção preventiva', 'Fundo de reserva para manutenção corretiva', 'Foto de cada equipamento cadastrado'] },
  { n: 8, t: 'Direitos humanos', dh: true, itens: ['Indícios de trabalho infantil, escravo ou forçado', 'Jornada de trabalho excessiva ou insalubre', 'Animais com indícios de maus-tratos', 'Assédio, discriminação ou desigualdade de gênero/raça', 'Inclusão e diversidade (mulheres, pessoas com deficiência)', 'Mecanismos de apoio social (canais de denúncia, encaminhamentos)'] },
];

// [nome, o que a foto deve conter, exige vídeo]
export const CENAS: [string, string, boolean][] = [
  ['Profissionais juntos', 'Todos os profissionais da reciclagem juntos, de uniforme se houver.', false],
  ['Profissionais trabalhando', 'Alguns profissionais em atividade, ambiente limpo e organizado, uniformes limpos e EPIs (bota, luva).', false],
  ['Fachada', 'Visão geral da entrada, com identificação do grupo se houver.', true],
  ['Área externa · movimentação de carga', 'Vídeo mostrando a entrada dos resíduos a triar e a saída dos processados, explicando o fluxo e a organização atual.', true],
  ['Área externa · estoques externos', 'Vídeo mostrando como a área externa é organizada.', true],
  ['Estoque a triar / chegada', 'Vídeo explicando a operação de recebimento.', true],
  ['Triagem', 'Vídeo explicando a operação e as particularidades.', true],
  ['Estoque a prensar / nova segregação', 'Vídeo explicando a operação e as particularidades.', true],
  ['Prensagem', 'Vídeo explicando a operação e as particularidades.', true],
  ['Estoque final (fardos e volumosos)', 'Vídeo explicando a operação e as particularidades.', true],
  ['Refeitório', 'Visão geral do espaço.', true],
  ['Banheiro/vestiário feminino', 'Visão geral do espaço.', true],
  ['Banheiro/vestiário masculino', 'Visão geral do espaço.', true],
  ['Administrativo', 'Visão geral do escritório.', true],
];

export const OPT: Record<string, string[]> = {
  sn: ['Sim', 'Não'],
  ton: ['Zero', 'Até 10', 'Entre 11 e 20', 'Entre 21 e 50', 'Entre 51 e 100', 'Acima de 100'],
  per: ['Diariamente', 'Semanalmente', 'Quinzenalmente', 'Mensalmente', 'Esporádico'],
  freq: ['Não se aplica', 'Menor que 1 vez na semana', 'Semanalmente', 'Quinzenalmente', 'Trimestralmente', 'Semestralmente', 'Anualmente', 'Maior que uma vez ao ano'],
  op: ['Organização de catadores', 'Operador Privado', 'Entreposto'],
  lic: ['Não', 'Em processo de obtenção', 'Sim'],
  comp: ['Fabricantes', 'Recicladores', 'Intermediários', 'Entreposto', 'Outros'],
};

export type DeclField =
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'text'; ph: string }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'sel'; opt: keyof typeof OPT }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'pair'; ph: [string, string] }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'cbs'; opts: string[] }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'area'; ph: string }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'date' }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'note'; note: string }
  | { k: string; l: string; r: 'R' | 'C' | 'O'; type: 'sig' };

export const DECL: [string, DeclField[]][] = [
  ['1. Identificação (vem do cadastro do grupo)', [
    { k: 'razao', l: 'Razão Social', r: 'R', type: 'text', ph: 'Razão social' },
    { k: 'cnpj', l: 'CNPJ', r: 'R', type: 'text', ph: '00.000.000/0000-00' },
    { k: 'op', l: 'Tipo de operador logístico', r: 'R', type: 'sel', opt: 'op' },
    { k: 'emRede', l: 'Faz parte de rede de cooperativas?', r: 'R', type: 'sel', opt: 'sn' },
    { k: 'rede', l: 'Nome da rede', r: 'C', type: 'text', ph: 'Rede' },
  ]],
  ['2. Estrutura operacional', [
    { k: 'trab', l: 'Trabalhadores (mulheres / homens)', r: 'R', type: 'pair', ph: ['Mulheres', 'Homens'] },
    { k: 'horas', l: 'Horas semanais por trabalhador', r: 'R', type: 'text', ph: 'h/semana' },
    { k: 'perCom', l: 'Periodicidade de comercialização', r: 'R', type: 'sel', opt: 'per' },
    { k: 'papel', l: 'Papel/papelão (t/mês)', r: 'R', type: 'sel', opt: 'ton' },
    { k: 'plastico', l: 'Plástico (t/mês)', r: 'R', type: 'sel', opt: 'ton' },
    { k: 'vidro', l: 'Vidro (t/mês)', r: 'R', type: 'sel', opt: 'ton' },
    { k: 'metal', l: 'Metal (t/mês)', r: 'R', type: 'sel', opt: 'ton' },
    { k: 'aerossol', l: 'Tria aerossol sem contar como metal?', r: 'R', type: 'sel', opt: 'sn' },
    { k: 'prensasBal', l: 'Prensas / balanças (do inventário)', r: 'R', type: 'pair', ph: ['Prensas', 'Balanças'] },
    { k: 'calib', l: 'Balança com calibração vigente?', r: 'R', type: 'sel', opt: 'sn' },
  ]],
  ['3. Saúde, segurança e ambiente de trabalho', [
    { k: 'treinoEpi', l: 'Treinamento de EPI?', r: 'R', type: 'sel', opt: 'sn' },
    { k: 'freqTreino', l: 'Frequência dos treinamentos', r: 'C', type: 'sel', opt: 'freq' },
    { k: 'freqEpi', l: 'Frequência de troca de EPIs', r: 'R', type: 'sel', opt: 'freq' },
    { k: 'unidade', l: 'A unidade de triagem possui', r: 'O', type: 'cbs', opts: ['Cobertura sem buracos', 'Extintor na validade', 'Saídas desobstruídas', 'Piso impermeável', 'Iluminação adequada', 'Exaustores'] },
    { k: 'licenca', l: 'Licença ambiental de operação', r: 'R', type: 'sel', opt: 'lic' },
  ]],
  ['4. Origem e destino de resíduos', [
    { k: 'convPref', l: 'Recebe da coleta convencional de prefeitura?', r: 'R', type: 'sel', opt: 'sn' },
    { k: 'selPref', l: 'Recebe da coleta seletiva de prefeitura?', r: 'R', type: 'sel', opt: 'sn' },
    { k: 'prefs', l: 'Prefeituras atendidas (t/mês)', r: 'C', type: 'pair', ph: ['Prefeitura', 't/mês'] },
    { k: 'privadas', l: 'Recebe de empresas privadas?', r: 'R', type: 'sel', opt: 'sn' },
    { k: 'caminhoes', l: 'Caminhões próprios (porta a porta)', r: 'R', type: 'text', ph: 'Qtd.' },
    { k: 'compradores', l: 'Principais compradores', r: 'R', type: 'sel', opt: 'comp' },
  ]],
  ['5. Programas e parcerias', [
    { k: 'gestoras', l: 'Entidades gestoras atendidas', r: 'O', type: 'text', ph: 'Ex.: Ambipar' },
    { k: 'fazParte', l: 'Faz parte de', r: 'O', type: 'cbs', opts: ['MNCR', 'ANCAT', 'CEMPRE', 'ASLORE', 'Outro'] },
    { k: 'apoio', l: 'Apoio de ONG / prefeitura / empresa', r: 'O', type: 'area', ph: 'Quem apoia, tipo de apoio, valores e benfeitorias' },
  ]],
  ['6. Conclusão', [
    { k: 'capNote', l: 'Capacidade e produção média', r: 'R', type: 'note', note: 'Preenchidas no quadro "Capacidade operacional do grupo", no topo.' },
    { k: 'dataAfericao', l: 'Data de aferição', r: 'R', type: 'date' },
    { k: 'sig', l: 'Assinatura do técnico', r: 'R', type: 'sig' },
  ]],
];

export const EQ_TIPOS = ['Prensa', 'Esteira', 'Balança', 'Empilhadeira', 'Carrinho/paleteira', 'Veículo', 'Equip. de escritório', 'Equip. de refeitório', 'Outro'];

export const emptyCena = (): Cena => ({ h: null, v: null, vid: null, na: false, just: '' });

export function emptyChk(): Record<string, ChkItem> {
  const o: Record<string, ChkItem> = {};
  EIXOS.forEach((e) => e.itens.forEach((_, i) => (o[`${e.n}-${i}`] = { ok: false, obs: '', fotos: [] })));
  return o;
}

// ---------------- progresso ----------------
export function chkTotals(v: Visita, seesDH: boolean): [number, number] {
  let t = 0;
  let d = 0;
  EIXOS.forEach((e) => {
    if (e.dh && !seesDH) return;
    e.itens.forEach((_, i) => {
      t++;
      if (v.chk[`${e.n}-${i}`]?.ok) d++;
    });
  });
  return [d, t];
}
export const eixoPct = (v: Visita, e: Eixo) =>
  e.itens.length ? Math.round((e.itens.filter((_, i) => v.chk[`${e.n}-${i}`]?.ok).length / e.itens.length) * 100) : null;

export function sceneReq(v: Visita, i: number): [number, number] {
  const c = CENAS[i];
  const p = v.ph[i];
  if (p.na) return p.just.trim() ? [1, 1] : [0, 1];
  const need = 2 + (c[2] ? 1 : 0);
  const got = (p.h ? 1 : 0) + (p.v ? 1 : 0) + (c[2] && p.vid ? 1 : 0);
  return [got, need];
}
export function phTotals(v: Visita): [number, number] {
  let g = 0;
  let n = 0;
  v.ph.forEach((_, i) => {
    const [a, b] = sceneReq(v, i);
    g += a;
    n += b;
  });
  return [g, n];
}
export const termosOk = (v: Visita) => v.termos.filter((t) => t.assinado).length;
export const declOk = (v: Visita) => !!(v.capAno && v.capDia && v.sigDecl);
export const planoOk = (v: Visita) => !!(v.plano.anexo && v.plano.enviadoEm);

export function visitaPct(v: Visita) {
  const [a, t] = chkTotals(v, true);
  const [g, n] = phTotals(v);
  const te = v.termos.length ? termosOk(v) / v.termos.length : 0;
  const eq = v.eq.length ? v.eq.filter((e) => e.foto).length / v.eq.length : 0;
  const extras = [declOk(v), v.rel.saved, planoOk(v)].filter(Boolean).length / 3;
  return Math.round(((a / t + g / n + te + eq) / 4) * 85 + extras * 15);
}

export function delivItems(v: Visita): [string, boolean][] {
  const [a, t] = chkTotals(v, true);
  const [g, n] = phTotals(v);
  const te = termosOk(v);
  return [
    ['Análise Situacional preenchida (8 eixos)', a === t],
    ['Declaração preenchida, com capacidade operacional e assinatura', declOk(v)],
    ['Relatório de Campo gerado e assinado', v.rel.saved],
    [`Termos de imagem de todos os ativos (${te}/${v.termos.length})`, v.termos.length > 0 && te === v.termos.length],
    ['Registro fotográfico completo', g === n],
    ['Inventário de equipamentos com fotos', v.eq.length > 0 && v.eq.every((e) => e.foto)],
    ['Entrega do plano de ação: anexo e confirmação de envio', planoOk(v)],
  ];
}

export const STATUS_VISITA: Record<Visita['status'], { t: string; cls: string }> = {
  rascunho: { t: 'Rascunho', cls: 'lime' },
  enviada: { t: 'Aguardando aprovação', cls: 'blue' },
  devolvida: { t: 'Devolvida para ajuste', cls: 'red' },
  aprovada: { t: 'Aprovada', cls: 'ok' },
};
