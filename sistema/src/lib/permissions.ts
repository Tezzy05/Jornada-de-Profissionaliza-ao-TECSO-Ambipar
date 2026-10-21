import type { PerfilBase, PermKey, Usuario } from './types';

export const PERFIS: Record<PerfilBase, { nome: string; cargo: string; desc: string }> = {
  tecnico: { nome: 'Técnico operacional', cargo: 'Técnico de campo', desc: 'Preenche visitas, o próprio cronograma e as ações com as cooperativas dos projetos em que está vinculado.' },
  coord: { nome: 'Coordenação', cargo: 'Coordenação de campo', desc: 'Vê todos os técnicos, cria projetos, aprova visitas e atualiza as demandas dos agentes externos.' },
  gestao: { nome: 'Gestão (Diretoria)', cargo: 'Diretoria', desc: 'Acompanha tudo, aprova visitas e exporta históricos. Não preenche dados de campo.' },
  adm: { nome: 'ADM', cargo: 'Administração do sistema', desc: 'Acesso total, incluindo usuários, perfis e acessos.' },
  consulta: { nome: 'Consulta', cargo: 'Consulta', desc: 'Somente leitura. Dados pessoais mascarados e Eixo 8 oculto.' },
};

export const PERM_GRUPOS: { grupo: string; itens: { k: PermKey; t: string; d?: string }[] }[] = [
  {
    grupo: 'Operação de campo',
    itens: [
      { k: 'painel.ver', t: 'Ver o painel' },
      { k: 'crono.proprio', t: 'Preencher o próprio cronograma' },
      { k: 'crono.todos', t: 'Ver o cronograma de todos os técnicos' },
      { k: 'crono.editarTodos', t: 'Incluir itens no cronograma de outros técnicos' },
      { k: 'visitas.preencher', t: 'Preencher visitas DCO (fotos, equipamentos, termos)' },
      { k: 'visitas.verTodas', t: 'Ver visitas de todos os técnicos' },
      { k: 'visitas.aprovar', t: 'Aprovar ou devolver visitas' },
    ],
  },
  {
    grupo: 'Dados sensíveis',
    itens: [
      { k: 'dados.eixo8', t: 'Ver o Eixo 8 (Direitos Humanos)' },
      { k: 'dados.cpf', t: 'Ver CPF e RG completos', d: 'LGPD: sem esta permissão os documentos aparecem mascarados.' },
      { k: 'termos.modelo', t: 'Editar o modelo padrão dos Termos de imagem' },
    ],
  },
  {
    grupo: 'Programa de Aceleração',
    itens: [
      { k: 'aceleracao.ver', t: 'Ver a jornada das cooperativas' },
      { k: 'aceleracao.editar', t: 'Registrar mentorias, suporte e plano de ação' },
      { k: 'integracao.checklist', t: 'Marcar o checklist de integração (Impacta+)' },
      { k: 'capacitacoes.gerir', t: 'Agendar capacitações online e registrar presença' },
    ],
  },
  {
    grupo: 'Cidades Circular',
    itens: [
      { k: 'cidades.ver', t: 'Ver projetos vinculados' },
      { k: 'cidades.atualizarProprias', t: 'Atualizar as próprias demandas' },
      { k: 'cidades.gerir', t: 'Criar projetos, importar macro projeto e gerir demandas' },
      { k: 'projetos.todos', t: 'Ver todos os projetos (não só os vinculados)' },
    ],
  },
  {
    grupo: 'Cooperativas',
    itens: [
      { k: 'coop.historico', t: 'Consultar o histórico da cooperativa' },
      { k: 'coop.exportar', t: 'Exportar Excel e ZIP de fotos' },
      { k: 'grupos.cadastrar', t: 'Cadastrar grupos parceiros' },
    ],
  },
  {
    grupo: 'Sistema',
    itens: [
      { k: 'usuarios.gerir', t: 'Criar usuários e editar acessos' },
      { k: 'sistema.integracao', t: 'Ver integração e roadmap do sistema' },
    ],
  },
];

export const ALL_PERMS: PermKey[] = PERM_GRUPOS.flatMap((g) => g.itens.map((i) => i.k));
export const PERM_LABEL: Record<string, string> = Object.fromEntries(PERM_GRUPOS.flatMap((g) => g.itens.map((i) => [i.k, i.t])));

export const TEMPLATES: Record<PerfilBase, PermKey[]> = {
  tecnico: [
    'painel.ver', 'crono.proprio', 'visitas.preencher', 'dados.eixo8', 'dados.cpf',
    'aceleracao.ver', 'aceleracao.editar', 'integracao.checklist',
    'cidades.ver', 'cidades.atualizarProprias', 'coop.historico', 'coop.exportar',
  ],
  coord: [
    'painel.ver', 'crono.proprio', 'crono.todos', 'crono.editarTodos', 'visitas.verTodas', 'visitas.aprovar',
    'dados.eixo8', 'dados.cpf', 'termos.modelo',
    'aceleracao.ver', 'aceleracao.editar', 'integracao.checklist', 'capacitacoes.gerir',
    'cidades.ver', 'cidades.atualizarProprias', 'cidades.gerir', 'projetos.todos',
    'coop.historico', 'coop.exportar', 'grupos.cadastrar',
  ],
  gestao: [
    'painel.ver', 'crono.todos', 'visitas.verTodas', 'visitas.aprovar', 'dados.eixo8', 'dados.cpf', 'termos.modelo',
    'aceleracao.ver', 'cidades.ver', 'projetos.todos', 'coop.historico', 'coop.exportar', 'sistema.integracao',
  ],
  adm: [...ALL_PERMS],
  consulta: ['painel.ver', 'crono.todos', 'visitas.verTodas', 'aceleracao.ver', 'cidades.ver', 'projetos.todos', 'coop.historico'],
};

export function can(u: Usuario | null | undefined, k: PermKey) {
  return !!u && u.perms.includes(k);
}

export function diffTemplate(u: Pick<Usuario, 'perfil' | 'perms'>) {
  const t = new Set(TEMPLATES[u.perfil]);
  const s = new Set(u.perms);
  return {
    extras: u.perms.filter((p) => !t.has(p)),
    removidas: TEMPLATES[u.perfil].filter((p) => !s.has(p)),
  };
}
