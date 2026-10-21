// Monta o modelo Excel do Macro Projeto (Cidades Circular).
// Usado pelo sistema (botão "Baixar modelo") e pelo script que gera modelos/Modelo_Macro_Projeto_Cidades_Circular.xlsx.
// Arquivo em JavaScript puro para rodar tanto no navegador quanto no Node.

export const COLUNAS = [
  { h: 'Código', w: 10, nota: '1 = Tópico · 1.1 = Subtarefa · 1.1.1 = Item da subtarefa (último nível)' },
  { h: 'Demanda / Título do tópico', w: 52, nota: 'Na linha do tópico, escreva só o título (ex.: Diagnóstico).' },
  { h: 'Data de Entrada', w: 15, nota: 'dd/mm/aaaa' },
  { h: 'Solicitante', w: 24 },
  { h: 'Área', w: 16 },
  { h: 'Prioridade', w: 12 },
  { h: 'Status', w: 15 },
  { h: 'Responsável', w: 26, nota: 'Nome de alguém do time (como cadastrado no sistema) ou do agente externo.' },
  { h: 'Tipo do responsável', w: 20, nota: 'Interno, Cliente, Cooperativa ou Prefeitura.' },
  { h: 'Contato do responsável', w: 30, nota: 'Obrigatório para agentes externos (telefone e/ou e-mail).' },
  { h: 'Prazo', w: 13, nota: 'dd/mm/aaaa' },
  { h: 'Data de Conclusão', w: 16, nota: 'Opcional. Preencha só se já estiver concluída.' },
  { h: 'Observações', w: 40 },
];

export const LISTAS = {
  area: ['TECSO', 'Coordenação', 'Operação', 'Comercial', 'Comunicação', 'Jurídico', 'Cliente', 'Prefeitura', 'Cooperativa'],
  prioridade: ['Baixa', 'Média', 'Alta', 'Urgente'],
  status: ['A fazer', 'Em andamento', 'Bloqueada', 'Concluída'],
  tipo: ['Interno', 'Cliente', 'Cooperativa', 'Prefeitura'],
};

const EXEMPLO = [
  ['1', 'Diagnóstico e mobilização inicial'],
  ['1.1', 'Reunião de abertura com o cliente', '06/10/2026', 'Cliente (Sustentabilidade)', 'Coordenação', 'Alta', 'A fazer', 'Leticia Fatima de Castro', 'Interno', '', '10/10/2026', '', 'Apresentar cronograma e responsáveis'],
  ['1.2', 'Levantamento de dados da coleta seletiva municipal', '06/10/2026', 'Coordenação TECSO', 'Prefeitura', 'Alta', 'A fazer', 'Carlos Mendes', 'Prefeitura', '(62) 3333-0000 · meioambiente@prefeitura.gov.br', '24/10/2026', '', ''],
  ['1.2.1', 'Solicitar dados de tonelagem do último ano', '06/10/2026', 'Coordenação TECSO', 'TECSO', 'Média', 'A fazer', 'Tacianne Viana', 'Interno', '', '15/10/2026', '', ''],
  ['1.2.2', 'Consolidar a planilha de rotas de coleta', '06/10/2026', 'Coordenação TECSO', 'TECSO', 'Média', 'A fazer', 'Tacianne Viana', 'Interno', '', '24/10/2026', '', ''],
  ['2', 'Estruturação da cooperativa'],
  ['2.1', 'Regularização documental (CNPJ, alvará, licença)', '06/10/2026', 'Cliente (Sustentabilidade)', 'Cooperativa', 'Urgente', 'A fazer', 'Presidente da cooperativa', 'Cooperativa', '(62) 98888-0000', '31/10/2026', '', ''],
  ['2.2', 'Compra de EPIs para os cooperados', '06/10/2026', 'Coordenação TECSO', 'Cliente', 'Alta', 'A fazer', 'Responsável de compras do cliente', 'Cliente', 'compras@cliente.com.br', '07/11/2026', '', ''],
  ['3', 'Capacitação e comunicação'],
  ['3.1', 'Capacitação em triagem e segurança do trabalho', '06/10/2026', 'Coordenação TECSO', 'TECSO', 'Média', 'A fazer', 'Geovani de Oliveira', 'Interno', '', '14/11/2026', '', ''],
  ['3.2', 'Relatório mensal ao cliente', '06/10/2026', 'Cliente (Sustentabilidade)', 'Coordenação', 'Média', 'A fazer', 'Leticia Fatima de Castro', 'Interno', '', '30/11/2026', '', ''],
];

const INK = 'FF06260F';
const LIME = 'FFCCFF00';

/** @param {any} ExcelJS @returns {Promise<ArrayBuffer>} */
export async function gerarModeloMacro(ExcelJS) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jornada de Profissionalização TECSO';
  wb.created = new Date();

  // ---------- Instruções ----------
  const ins = wb.addWorksheet('Instruções', { properties: { tabColor: { argb: LIME } } });
  ins.columns = [{ width: 4 }, { width: 110 }];
  const linhas = [
    ['', 'Modelo de importação do Macro Projeto · Programa Cidades Circular'],
    ['', ''],
    ['', 'Como preencher'],
    ['1', 'Use a aba "Macro Projeto". Cada linha é um tópico, uma subtarefa ou um item da subtarefa.'],
    ['2', 'A coluna Código define o nível: "1" é um tópico (como "Cozinha" no projeto de uma casa), "1.1" é uma subtarefa dentro dele e "1.1.1" é um item da subtarefa. Não existe um quarto nível.'],
    ['3', 'Na linha do tópico preencha só o Código e o título. Os demais campos são das subtarefas e dos itens.'],
    ['4', 'Responsável: para alguém do time, escreva o nome como está no sistema e o Tipo "Interno". Para cliente, cooperativa ou prefeitura, escreva o nome da pessoa, o Tipo e o Contato. O sistema cria o agente externo no projeto.'],
    ['5', 'Datas no formato dd/mm/aaaa. A Situação de Prazo é calculada pelo sistema; não precisa preencher.'],
    ['6', 'Área, Prioridade, Status e Tipo do responsável têm lista suspensa. Valores fora da lista viram o padrão (Média / A fazer) e o sistema avisa na revisão.'],
    ['7', 'Apague as linhas de exemplo antes de preencher o seu projeto, ou edite-as.'],
    ['', ''],
    ['', 'Campos (planilha da coordenação): ID, Data de Entrada, Solicitante, Área, Demanda, Prioridade, Status, Responsável, Prazo, Data de Conclusão, Situação de Prazo, Observações.'],
  ];
  linhas.forEach((l) => ins.addRow(l));
  ins.getRow(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: INK } };
  ins.getRow(3).font = { bold: true, size: 12 };
  ins.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  ins.getColumn(1).alignment = { vertical: 'top', horizontal: 'center' };
  for (let r = 4; r <= 10; r++) ins.getCell(r, 1).font = { bold: true, color: { argb: 'FF4C6B00' } };

  // ---------- Listas ----------
  const ls = wb.addWorksheet('Listas', { state: 'visible' });
  ls.columns = [
    { header: 'Área', key: 'a', width: 16 },
    { header: 'Prioridade', key: 'p', width: 12 },
    { header: 'Status', key: 's', width: 15 },
    { header: 'Tipo do responsável', key: 't', width: 20 },
  ];
  const max = Math.max(...Object.values(LISTAS).map((x) => x.length));
  for (let i = 0; i < max; i++) ls.addRow([LISTAS.area[i], LISTAS.prioridade[i], LISTAS.status[i], LISTAS.tipo[i]]);
  ls.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ls.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };

  // ---------- Macro Projeto ----------
  const ws = wb.addWorksheet('Macro Projeto', { views: [{ state: 'frozen', ySplit: 1 }], properties: { tabColor: { argb: INK } } });
  ws.columns = COLUNAS.map((c) => ({ header: c.h, width: c.w }));
  const head = ws.getRow(1);
  head.height = 30;
  head.eachCell((cell, i) => {
    cell.font = { bold: true, color: { argb: LIME } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    const nota = COLUNAS[i - 1].nota;
    if (nota) cell.note = nota;
  });
  EXEMPLO.forEach((r) => {
    const row = ws.addRow(r);
    if (r.length === 2) {
      row.font = { bold: true };
      row.eachCell({ includeEmpty: true }, (c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2FFC4' } }));
    }
  });
  const N = 400;
  for (let r = 2; r <= N; r++) {
    ws.getCell(r, 1).numFmt = '@';
    const v = (col, lista) => (ws.getCell(r, col).dataValidation = { type: 'list', allowBlank: true, formulae: [lista], showErrorMessage: false });
    v(5, `Listas!$A$2:$A$${LISTAS.area.length + 1}`);
    v(6, `Listas!$B$2:$B$${LISTAS.prioridade.length + 1}`);
    v(7, `Listas!$C$2:$C$${LISTAS.status.length + 1}`);
    v(9, `Listas!$D$2:$D$${LISTAS.tipo.length + 1}`);
  }
  ws.autoFilter = { from: 'A1', to: 'M1' };
  // a aba de preenchimento abre primeiro
  wb.views = [{ activeTab: 2 }];
  return wb.xlsx.writeBuffer();
}
