// Gera ../modelos/Modelo_Macro_Projeto_Cidades_Circular.xlsx com o mesmo código usado no sistema.
import ExcelJS from 'exceljs';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gerarModeloMacro } from '../src/lib/modeloMacro.js';

const dir = fileURLToPath(new URL('../../modelos/', import.meta.url));
await mkdir(dir, { recursive: true });
const buf = await gerarModeloMacro(ExcelJS);
await writeFile(dir + 'Modelo_Macro_Projeto_Cidades_Circular.xlsx', Buffer.from(buf));
console.log('Modelo gerado em', dir);
