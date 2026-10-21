// Tipos centrais do sistema. Mídias (fotos, vídeos, assinaturas, anexos) ficam no IndexedDB
// e aqui são referenciadas pelo id (MediaId). Ids que começam com "seed:" são fotos de exemplo geradas na hora.

export type MediaId = string;

export type PerfilBase = 'tecnico' | 'coord' | 'gestao' | 'adm' | 'consulta';

export type PermKey =
  | 'painel.ver'
  | 'crono.proprio'
  | 'crono.todos'
  | 'crono.editarTodos'
  | 'visitas.preencher'
  | 'visitas.verTodas'
  | 'visitas.aprovar'
  | 'dados.eixo8'
  | 'dados.cpf'
  | 'termos.modelo'
  | 'aceleracao.ver'
  | 'aceleracao.editar'
  | 'integracao.checklist'
  | 'capacitacoes.gerir'
  | 'aceleracao.responsaveis'
  | 'cidades.ver'
  | 'cidades.gerir'
  | 'cidades.atualizarProprias'
  | 'projetos.todos'
  | 'coop.historico'
  | 'coop.exportar'
  | 'grupos.cadastrar'
  | 'usuarios.gerir'
  | 'sistema.integracao';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string; // protótipo: senha simulada, sem segurança real
  perfil: PerfilBase;
  cargo: string;
  perms: PermKey[];
  ativo: boolean;
  criadoEm: string;
  ultimoAcesso?: string;
  cpf?: string;
}

export type TipoProjeto = 'aceleracao' | 'cidades';

export type TipoAgente = 'Cliente' | 'Cooperativa' | 'Prefeitura';
export interface Agente {
  id: string;
  tipo: TipoAgente;
  nome: string;
  organizacao?: string;
  contato: string; // telefone e/ou e-mail
}

export interface Anexo {
  id: string;
  nome: string;
  mediaId: MediaId;
  mime: string;
  em: string;
  por: string;
}

export interface Projeto {
  id: string;
  tipo: TipoProjeto;
  nome: string;
  sigla: string; // usada nos IDs das demandas (ex.: ANP-001)
  cliente?: string;
  municipio?: string;
  uf?: string;
  inicio?: string;
  fim?: string;
  descricao?: string;
  tecnicos: string[]; // técnicos principais vinculados (define a visibilidade)
  coops: string[];
  agentes: Agente[];
  documento?: Anexo; // macro projeto aprovado (arquivo original)
  status: 'Ativo' | 'Concluído' | 'Pausado';
  criadoEm: string;
  criadoPor: string;
}

export interface Endereco {
  tipo: 'Matriz' | 'Filial' | 'Administrativo';
  end: string;
}

export interface Coop {
  id: string;
  nome: string;
  sigla: string;
  razaoSocial?: string;
  cnpj?: string;
  cidade: string;
  uf: string;
  enderecos: Endereco[];
  lideranca: string;
  contato: string;
  rede: string;
  classificacao: 'Acelerada' | 'Sob demanda' | 'Em integração' | 'Parceira';
  tecnicoId: string; // técnico de referência
  ativos: number; // cooperados ativos
}

// ---------------- Cronograma ----------------
export type TipoAtividade =
  | 'Visita DCO'
  | 'Retorno ao grupo'
  | 'Mentoria online'
  | 'Suporte contínuo'
  | 'Capacitação online'
  | 'Ação Cidades Circular'
  | 'Deslocamento'
  | 'Atividade interna'
  | 'Outro';

export type StatusCrono = 'Planejado' | 'Confirmado' | 'Concluído' | 'Reagendado' | 'Cancelado';

export interface ItemCrono {
  id: string;
  tecnicoId: string;
  data: string; // yyyy-mm-dd
  ini: string; // hh:mm
  fim: string;
  tipo: TipoAtividade;
  coopId?: string;
  projetoId?: string;
  endereco?: Endereco['tipo'];
  status: StatusCrono;
  obs?: string;
  visitaId?: string;
}

// ---------------- Visita DCO ----------------
export interface ChkItem {
  ok: boolean;
  obs: string;
  fotos: MediaId[];
  infra?: string;
  limpeza?: string;
  cond?: string;
}
export interface Slot {
  id: MediaId;
  kind: 'img' | 'vid';
}
export interface Cena {
  h: Slot | null;
  v: Slot | null;
  vid: Slot | null;
  na: boolean;
  just: string;
}
export interface Equip {
  id: string;
  tipo: string;
  qtd: number;
  esp: string;
  cap: string;
  est: 'Operando' | 'Operando com danos' | 'Parado';
  nr: 'Sim' | 'Não' | 'Não avaliado';
  dano?: string;
  foto: Slot | null;
}
export interface Termo {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  estadoCivil?: string;
  endereco?: string;
  assinado: boolean;
  assinatura?: MediaId;
  anexo?: Anexo;
  em?: string;
}
export type StatusVisita = 'rascunho' | 'enviada' | 'devolvida' | 'aprovada';
export interface HistItem {
  em: string;
  por: string;
  acao: string;
  detalhe?: string;
}
export interface Visita {
  id: string;
  coopId: string;
  projetoId: string;
  tecnicoId: string;
  data: string;
  endereco: Endereco['tipo'];
  cronoId?: string;
  status: StatusVisita;
  criadaEm: string;
  atualizadaEm: string;
  enviadaEm?: string;
  aprovadaEm?: string;
  devolucao?: { motivo: string; por: string; em: string };
  chk: Record<string, ChkItem>;
  ph: Cena[];
  eq: Equip[];
  termos: Termo[];
  decl: Record<string, string | string[]>;
  capAno: string;
  capDia: string;
  sigDecl?: MediaId;
  rel: {
    info: string;
    respNome: string;
    respCpf: string;
    tecCpf: string;
    sigResp?: MediaId;
    sigTec?: MediaId;
    saved: boolean;
  };
  plano: {
    anexo?: Anexo;
    destinatario: string;
    enviadoEm?: string;
    enviadoPor?: string;
  };
  hist: HistItem[];
}

// ---------------- Programa de Aceleração ----------------
export interface CheckReg {
  ok: boolean;
  por?: string;
  em?: string;
}
export interface Integracao {
  coopId: string;
  itens: Record<string, CheckReg>;
}
export interface AcaoPlano {
  id: string;
  acao: string;
  responsavel: string;
  prazo: string;
  status: 'A fazer' | 'Em andamento' | 'Concluída';
}
export interface Mentoria {
  id: string;
  coopId: string;
  tecnicoId: string;
  data: string;
  modalidade: string;
  participantes: string;
  pontos: string;
  fotos: MediaId[];
  acoes: AcaoPlano[];
}
export interface Atendimento {
  id: string;
  coopId: string;
  tecnicoId: string;
  data: string;
  tema: string;
  canal: string;
  resumo: string;
  encaminhamento: string;
  fotos: MediaId[];
}
export interface Capacitacao {
  id: string;
  tema: string;
  data: string;
  ini: string;
  fim: string;
  link: string;
  facilitadorId: string;
  coops: string[];
  presencas: Record<string, number>; // participantes por cooperativa
  fotos: MediaId[];
  status: 'Agendada' | 'Realizada' | 'Cancelada';
  resumo?: string;
}

// ---------------- Cidades Circular ----------------
export type Prioridade = 'Baixa' | 'Média' | 'Alta' | 'Urgente';
export type StatusTarefa = 'A fazer' | 'Em andamento' | 'Bloqueada' | 'Concluída';
export interface Topico {
  id: string;
  projetoId: string;
  codigo: string;
  titulo: string;
  descricao?: string;
}
export interface Comentario {
  id: string;
  por: string;
  em: string;
  texto: string;
}
export interface Tarefa {
  id: string;
  projetoId: string;
  topicoId: string;
  parentId?: string;
  codigo: string;
  dataEntrada: string;
  solicitante: string;
  area: string;
  demanda: string;
  prioridade: Prioridade;
  status: StatusTarefa;
  responsavel: string; // "u:<id>" usuário interno, "a:<id>" agente externo
  prazo?: string;
  dataConclusao?: string;
  observacoes: string;
  anexos: Anexo[];
  comentarios: Comentario[];
  criadaEm: string;
}

// ---------------- Auditoria ----------------
export interface Auditoria {
  id: string;
  em: string;
  por: string;
  alvo?: string; // id do usuário/projeto afetado
  tipo: 'acesso' | 'usuario' | 'projeto' | 'visita' | 'sistema';
  texto: string;
}

export interface Config {
  termo: { nac: string; prof: string; cidade: string; uf: string };
  online: boolean;
}
