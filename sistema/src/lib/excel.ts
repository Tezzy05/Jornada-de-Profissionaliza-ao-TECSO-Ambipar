import ExcelJS from 'exceljs';
import { gerarModeloMacro, LISTAS } from './modeloMacro';
import { normalizeDate } from './dates';
import { saveBlob, uid } from './utils';
import type { Agente, Prioridade, StatusTarefa, TipoAgente, Usuario } from './types';

const INK = 'FF06260F';
const LIME = 'FFCCFF00';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function baixarModeloMacro() {
  const buf = await gerarModeloMacro(ExcelJS);
  saveBlob(new Blob([buf], { type: XLSX_MIME }), 'Modelo_Macro_Projeto_Cidades_Circular.xlsx');
}

// ---------------- leitura do macro projeto ----------------
export interface LinhaImportada {
  codigo: string;
  nivel: 1 | 2 | 3;
  titulo: string;
  dataEntrada?: string;
  solicitante: string;
  area: string;
  prioridade: Prioridade;
  status: StatusTarefa;
  responsavelNome: string;
  responsavel: string; // u:<id> | a:<id> | ''
  prazo?: string;
  dataConclusao?: string;
  observacoes: string;
}
export interface ResultadoImportacao {
  linhas: LinhaImportada[];
  agentes: Agente[];
  erros: string[];
  avisos: string[];
}

const txt = (v: ExcelJS.CellValue): string => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v) return String(v.text);
    if ('result' in v) return String(v.result ?? '');
  }
  return String(v).trim();
};
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export async function lerMacroProjeto(file: File, users: Usuario[], agentesExistentes: Agente[] = []): Promise<ResultadoImportacao> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const erros: string[] = [];
  const avisos: string[] = [];
  let ws = wb.getWorksheet('Macro Projeto');
  let headerRow = 1;
  if (!ws) {
    // procura em qualquer aba uma linha de cabeçalho com "Código"
    wb.eachSheet((s) => {
      if (ws) return;
      for (let r = 1; r <= 10; r++) {
        if (sem(txt(s.getCell(r, 1).value)) === 'codigo') {
          ws = s;
          headerRow = r;
          return;
        }
      }
    });
  }
  if (!ws) return { linhas: [], agentes: [], erros: ['Não encontramos a aba "Macro Projeto" nem uma coluna "Código". Use o modelo disponível no sistema.'], avisos };
  const sheet = ws as ExcelJS.Worksheet;

  // mapeia as colunas pelo nome do cabeçalho
  const col: Record<string, number> = {};
  sheet.getRow(headerRow).eachCell((c, i) => (col[sem(txt(c.value))] = i));
  const get = (row: ExcelJS.Row, ...nomes: string[]) => {
    for (const n of nomes) {
      const i = col[sem(n)];
      if (i) return row.getCell(i).value;
    }
    return null;
  };

  const agentes: Agente[] = agentesExistentes.map((a) => ({ ...a }));
  const linhas: LinhaImportada[] = [];
  const codigos = new Set<string>();

  const achaUsuario = (nome: string) => {
    const n = sem(nome);
    return users.find((u) => sem(u.nome) === n) ?? users.find((u) => {
      const p = sem(u.nome).split(' ');
      const q = n.split(' ');
      return p[0] === q[0] && (q.length === 1 || p[p.length - 1] === q[q.length - 1]);
    });
  };
  const inferirTipo = (nome: string): TipoAgente => {
    const n = sem(nome);
    if (n.includes('prefeit') || n.includes('secretaria')) return 'Prefeitura';
    if (n.includes('coop') || n.includes('associa')) return 'Cooperativa';
    return 'Cliente';
  };

  sheet.eachRow((row, r) => {
    if (r <= headerRow) return;
    let codigo = txt(get(row, 'Código', 'ID'));
    const titulo = txt(get(row, 'Demanda / Título do tópico', 'Demanda', 'Título'));
    if (!codigo && !titulo) return;
    codigo = codigo.replace(/\.$/, '').replace(/,/g, '.');
    if (!/^\d+(\.\d+){0,2}$/.test(codigo)) {
      if (/^\d+(\.\d+){3,}$/.test(codigo)) erros.push(`Linha ${r}: o código ${codigo} passa de 3 níveis. O limite é tópico, subtarefa e item da subtarefa.`);
      else erros.push(`Linha ${r}: código "${codigo || '(vazio)'}" inválido. Use 1, 1.1 ou 1.1.1.`);
      return;
    }
    if (codigos.has(codigo)) {
      erros.push(`Linha ${r}: o código ${codigo} aparece mais de uma vez.`);
      return;
    }
    const nivel = codigo.split('.').length as 1 | 2 | 3;
    const pai = codigo.split('.').slice(0, -1).join('.');
    if (nivel > 1 && !codigos.has(pai)) erros.push(`Linha ${r}: o código ${codigo} não tem o nível acima (${pai}) antes dele.`);
    if (!titulo) erros.push(`Linha ${r}: falta a demanda/título do código ${codigo}.`);
    codigos.add(codigo);

    let prioridade = txt(get(row, 'Prioridade')) as Prioridade;
    if (nivel > 1 && prioridade && !LISTAS.prioridade.includes(prioridade)) {
      avisos.push(`Linha ${r}: prioridade "${prioridade}" fora da lista; usamos Média.`);
      prioridade = 'Média';
    }
    let status = txt(get(row, 'Status')) as StatusTarefa;
    if (nivel > 1 && status && !LISTAS.status.includes(status)) {
      avisos.push(`Linha ${r}: status "${status}" fora da lista; usamos A fazer.`);
      status = 'A fazer';
    }

    const respNome = txt(get(row, 'Responsável'));
    let tipo = txt(get(row, 'Tipo do responsável'));
    const contato = txt(get(row, 'Contato do responsável'));
    let responsavel = '';
    if (nivel > 1 && respNome) {
      const u = tipo === '' || sem(tipo) === 'interno' ? achaUsuario(respNome) : undefined;
      if (u) responsavel = 'u:' + u.id;
      else {
        if (sem(tipo) === 'interno') avisos.push(`Linha ${r}: "${respNome}" não está cadastrado no sistema; entrou como agente externo do tipo Cliente.`);
        if (!tipo || sem(tipo) === 'interno') {
          tipo = inferirTipo(respNome);
          if (sem(txt(get(row, 'Tipo do responsável'))) !== 'interno') avisos.push(`Linha ${r}: tipo do responsável "${respNome}" não informado; consideramos ${tipo}.`);
        }
        let ag = agentes.find((a) => sem(a.nome) === sem(respNome));
        if (!ag) {
          ag = { id: 'ag_' + uid(), tipo: tipo as TipoAgente, nome: respNome, contato };
          agentes.push(ag);
          if (!contato) avisos.push(`Linha ${r}: o agente externo "${respNome}" está sem contato. Complete depois em Responsáveis externos.`);
        } else if (contato && !ag.contato) ag.contato = contato;
        responsavel = 'a:' + ag.id;
      }
    } else if (nivel > 1) avisos.push(`Linha ${r}: ${codigo} está sem responsável.`);

    linhas.push({
      codigo,
      nivel,
      titulo,
      dataEntrada: normalizeDate(get(row, 'Data de Entrada')),
      solicitante: txt(get(row, 'Solicitante')),
      area: txt(get(row, 'Área')) || 'TECSO',
      prioridade: prioridade || 'Média',
      status: status || 'A fazer',
      responsavelNome: respNome,
      responsavel,
      prazo: normalizeDate(get(row, 'Prazo')),
      dataConclusao: normalizeDate(get(row, 'Data de Conclusão')),
      observacoes: txt(get(row, 'Observações')),
    });
  });
  if (!linhas.some((l) => l.nivel === 1) && linhas.length) erros.push('Nenhum tópico (código de um número só, como "1") foi encontrado.');
  if (!linhas.length && !erros.length) erros.push('A planilha está vazia.');
  return { linhas, agentes: agentes.filter((a) => !agentesExistentes.some((x) => x.id === a.id)), erros, avisos };
}

// ---------------- exportação genérica ----------------
export interface Aba {
  nome: string;
  titulo?: string;
  colunas: { h: string; w?: number; date?: boolean }[];
  linhas: (string | number | Date | null | undefined)[][];
}

/** Gera um .xlsx com cabeçalho nas cores da marca, filtros e colunas ajustadas. */
export async function exportarExcel(abas: Aba[], arquivo: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Jornada de Profissionalização TECSO';
  wb.created = new Date();
  abas.forEach((a) => {
    const ws = wb.addWorksheet(a.nome.slice(0, 31));
    let start = 1;
    if (a.titulo) {
      ws.getCell(1, 1).value = a.titulo;
      ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: INK } };
      start = 3;
    }
    a.colunas.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.w ?? Math.min(48, Math.max(12, c.h.length + 4));
      const cell = ws.getCell(start, i + 1);
      cell.value = c.h;
      cell.font = { bold: true, color: { argb: LIME } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    ws.getRow(start).height = 26;
    a.linhas.forEach((l) => {
      const row = ws.addRow(l.map((v) => (v === undefined ? null : v)));
      row.alignment = { vertical: 'top', wrapText: true };
    });
    a.colunas.forEach((c, i) => {
      if (c.date) ws.getColumn(i + 1).numFmt = 'dd/mm/yyyy';
    });
    ws.views = [{ state: 'frozen', ySplit: start }];
    if (a.linhas.length) ws.autoFilter = { from: { row: start, column: 1 }, to: { row: start, column: a.colunas.length } };
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: XLSX_MIME });
  saveBlob(blob, arquivo);
  return blob;
}

/** Converte yyyy-mm-dd em Date (para o Excel reconhecer como data). */
export const xd = (s?: string) => {
  if (!s) return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
