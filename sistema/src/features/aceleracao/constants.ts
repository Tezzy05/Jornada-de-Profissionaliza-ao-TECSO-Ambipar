// Produtos do Programa de Aceleração (documento "Incluir no mockup funcional").
export const PRODUTOS = [
  { n: 1, k: 'p1', t: 'Integração da cooperativa', d: 'Checagem e inclusão nos grupos: WhatsApp da cooperativa e grupo geral Impacta+.' },
  { n: 2, k: 'p2', t: 'Plano de Ação Online', d: 'Mentoria online individual com a cooperativa. As informações e fotos ficam disponíveis para o técnico no dia da visita.' },
  { n: 3, k: 'p3', t: 'Diagnóstico de Capacidade Operacional (DCO)', d: 'Visita de campo com os 7 documentos e a entrega do plano de ação.' },
  { n: 4, k: 'p4', t: 'Suporte contínuo', d: 'Orientações sobre diversos temas depois da parceria estabelecida.' },
  { n: 5, k: 'p5', t: 'Capacitações online', d: 'Treinamento ao menos 1 vez por mês para várias cooperativas juntas.' },
] as const;

// Checklist de integração: precisa estar completo antes de seguir com a cooperativa.
export const INTEGRACAO_ITENS = [
  { k: 'cadastro', t: 'Cadastro da cooperativa conferido (CNPJ, endereços, liderança e contato)' },
  { k: 'wppCriado', t: 'Grupo de WhatsApp da cooperativa criado' },
  { k: 'wppMembros', t: 'Liderança e cooperados de referência incluídos no grupo da cooperativa' },
  { k: 'impacta', t: 'Cooperativa incluída no grupo geral Impacta+' },
  { k: 'boasVindas', t: 'Mensagem de boas-vindas e apresentação do programa enviada' },
] as const;

export const MODALIDADES = ['Microsoft Teams', 'Google Meet', 'Chamada de vídeo no WhatsApp', 'Telefone'];
export const CANAIS = ['WhatsApp', 'Telefone', 'E-mail', 'Videochamada', 'Presencial'];
export const TEMAS_SUPORTE = ['Gestão financeira', 'Comercialização', 'Segurança do trabalho / EPIs', 'Documentação e regularização', 'Operação e layout', 'Governança e liderança', 'Outro'];
