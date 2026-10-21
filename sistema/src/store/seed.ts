import { addDays, at, mondayOf, today } from '@/lib/dates';
import { assetId, seedId } from '@/lib/media';
import { TEMPLATES } from '@/lib/permissions';
import type {
  Agente, Anexo, Atendimento, Capacitacao, Coop, Integracao, ItemCrono, Mentoria, Projeto, StatusCrono, Tarefa, Termo, Topico, Usuario, Visita,
} from '@/lib/types';
import { CENAS, EIXOS, emptyCena, emptyChk } from '@/features/visitas/dco';
import { INTEGRACAO_ITENS } from '@/features/aceleracao/constants';
import type { DB } from './db';

// Dados de demonstração. Todas as datas são relativas à semana atual, para o protótipo nunca "envelhecer".

const mkUser = (id: string, nome: string, email: string, perfil: Usuario['perfil'], cargo: string, criadoEm: string): Usuario => ({
  id, nome, email, senha: 'planetaA', perfil, cargo, perms: [...TEMPLATES[perfil]], ativo: true, criadoEm,
});

export function buildSeed(): DB {
  const T = today();
  const W = mondayOf(T);
  const d = (n: number) => addDays(W, n);
  const ts = (n: number, hm = '10:00') => at(d(n), hm).toISOString();
  const past = (dia: string, fim: string) => at(dia, fim).getTime() < Date.now();

  // ---------------- usuários (time real) ----------------
  const users: Usuario[] = [
    mkUser('u_matheus', 'Matheus Correia', 'matheus.correia@tecso.demo', 'adm', 'ADM / Desenvolvimento', ts(-120)),
    mkUser('u_juliana', 'Juliana Navea', 'juliana.navea@tecso.demo', 'gestao', 'Diretoria', ts(-120)),
    mkUser('u_leticia', 'Leticia Fatima de Castro', 'leticia.castro@tecso.demo', 'coord', 'Coordenação de campo', ts(-110)),
    mkUser('u_yuri', 'Yuri Maluf', 'yuri.maluf@tecso.demo', 'tecnico', 'Técnico de campo', ts(-100)),
    mkUser('u_lilian', 'Lilian Prado', 'lilian.prado@tecso.demo', 'tecnico', 'Técnica de campo', ts(-100)),
    mkUser('u_geovani', 'Geovani de Oliveira', 'geovani.oliveira@tecso.demo', 'tecnico', 'Técnico de campo', ts(-90)),
    mkUser('u_tacianne', 'Tacianne Viana', 'tacianne.viana@tecso.demo', 'tecnico', 'Técnica de campo', ts(-60)),
  ];
  users.forEach((u, i) => (u.cpf = ['123.456.789-01', '234.567.890-12', '345.678.901-23', '456.789.012-34', '567.890.123-45', '678.901.234-56', '789.012.345-67'][i]));

  // ---------------- cooperativas ----------------
  const coops: Coop[] = [
    { id: 'c_acambb', nome: 'ACAMBB', sigla: 'AC', razaoSocial: 'ACAMBB', cidade: 'Brasília', uf: 'DF', enderecos: [{ tipo: 'Matriz', end: 'SCIA Q. 9 Cj. 01 Lote 02' }], lideranca: 'Vantuil', contato: '(61) 99999-0101', rede: 'Rede Candanga', classificacao: 'Acelerada', tecnicoId: 'u_yuri', ativos: 16 },
    { id: 'c_cootra', nome: 'COOTRAEMPOCAP', sigla: 'CT', cidade: 'Brasília', uf: 'DF', enderecos: [{ tipo: 'Matriz', end: 'SAAN Q. 2 Lote 650' }, { tipo: 'Filial', end: 'SCIA Q. 10' }], lideranca: 'Kailane', contato: '(61) 99999-0202', rede: 'Sem rede', classificacao: 'Sob demanda', tecnicoId: 'u_lilian', ativos: 22 },
    { id: 'c_vida', nome: 'Coop. Vida Nova', sigla: 'VN', cidade: 'Ceilândia', uf: 'DF', enderecos: [{ tipo: 'Matriz', end: 'QNN 28 Área Especial' }], lideranca: 'Marlene', contato: '(61) 99999-0303', rede: 'Rede Candanga', classificacao: 'Acelerada', tecnicoId: 'u_lilian', ativos: 18 },
    { id: 'c_maos', nome: 'Assoc. Mãos Unidas', sigla: 'MU', cidade: 'Samambaia', uf: 'DF', enderecos: [{ tipo: 'Matriz', end: 'QR 615 Conj. 3' }, { tipo: 'Administrativo', end: 'QR 611 Lote 12' }], lideranca: 'Josué', contato: '(61) 99999-0404', rede: 'Sem rede', classificacao: 'Acelerada', tecnicoId: 'u_geovani', ativos: 12 },
    { id: 'c_recicla', nome: 'Grupo Recicla Norte', sigla: 'RN', cidade: 'Sobradinho', uf: 'DF', enderecos: [{ tipo: 'Matriz', end: 'Quadra 18 Área Especial 4' }], lideranca: 'Rosângela', contato: '(61) 99999-0505', rede: 'Sem rede', classificacao: 'Em integração', tecnicoId: 'u_geovani', ativos: 9 },
    { id: 'c_anapolis', nome: 'Coop. Recicla Anápolis', sigla: 'RA', cidade: 'Anápolis', uf: 'GO', enderecos: [{ tipo: 'Matriz', end: 'Av. Brasil Norte, 2100' }], lideranca: 'Lúcia', contato: '(62) 98888-1003', rede: 'Sem rede', classificacao: 'Parceira', tecnicoId: 'u_tacianne', ativos: 25 },
    { id: 'c_luziania', nome: 'Assoc. Luziânia Recicla', sigla: 'LR', cidade: 'Luziânia', uf: 'GO', enderecos: [{ tipo: 'Matriz', end: 'Rua 7, Setor Industrial' }], lideranca: 'Edvaldo', contato: '(61) 98777-2004', rede: 'Sem rede', classificacao: 'Parceira', tecnicoId: 'u_lilian', ativos: 14 },
  ];

  // ---------------- projetos ----------------
  const agAnp: Agente[] = [
    { id: 'ag_anp_cli', tipo: 'Cliente', nome: 'Renata Souza', organizacao: 'Cliente Alfa · Sustentabilidade', contato: '(62) 99999-1001 · renata.souza@clientealfa.demo' },
    { id: 'ag_anp_pref', tipo: 'Prefeitura', nome: 'Carlos Mendes', organizacao: 'Prefeitura de Anápolis · Sec. de Meio Ambiente', contato: '(62) 3333-1002' },
    { id: 'ag_anp_coop', tipo: 'Cooperativa', nome: 'Lúcia (presidente)', organizacao: 'Coop. Recicla Anápolis', contato: '(62) 98888-1003' },
  ];
  const agLzn: Agente[] = [
    { id: 'ag_lzn_cli', tipo: 'Cliente', nome: 'Paulo Henrique', organizacao: 'Cliente Beta · ESG', contato: '(11) 97777-3001 · paulo.h@clientebeta.demo' },
    { id: 'ag_lzn_pref', tipo: 'Prefeitura', nome: 'Ana Cláudia', organizacao: 'Prefeitura de Luziânia · Sec. de Meio Ambiente', contato: '(61) 3622-3002' },
    { id: 'ag_lzn_coop', tipo: 'Cooperativa', nome: 'Edvaldo (presidente)', organizacao: 'Assoc. Luziânia Recicla', contato: '(61) 98777-2004' },
  ];
  const docAnp: Anexo = { id: 'ax_anp', nome: 'Macro_Projeto_Anapolis_aprovado.pdf', mediaId: seedId('pdf', 'Macro Projeto Cidades Circular - Anapolis'), mime: 'application/pdf', em: ts(-28), por: 'u_leticia' };
  const projetos: Projeto[] = [
    { id: 'p_acel', tipo: 'aceleracao', nome: 'Programa de Aceleração · Rodada 2026', sigla: 'PA', descricao: 'Jornada de profissionalização das cooperativas parceiras: integração, plano de ação, DCO, suporte contínuo e capacitações online.', tecnicos: ['u_yuri', 'u_lilian', 'u_geovani'], coops: ['c_acambb', 'c_cootra', 'c_vida', 'c_maos', 'c_recicla'], agentes: [], status: 'Ativo', inicio: d(-84), fim: addDays(T, 120), criadoEm: ts(-90), criadoPor: 'u_leticia' },
    { id: 'p_anp', tipo: 'cidades', nome: 'Cidades Circular · Anápolis/GO', sigla: 'ANP', cliente: 'Cliente Alfa (exemplo)', municipio: 'Anápolis', uf: 'GO', descricao: 'Estruturação da coleta seletiva com a cooperativa local, apoio à prefeitura e relatórios mensais ao cliente.', tecnicos: ['u_tacianne', 'u_geovani'], coops: ['c_anapolis'], agentes: agAnp, documento: docAnp, status: 'Ativo', inicio: d(-28), fim: addDays(T, 180), criadoEm: ts(-28), criadoPor: 'u_leticia' },
    { id: 'p_lzn', tipo: 'cidades', nome: 'Cidades Circular · Luziânia/GO', sigla: 'LZN', cliente: 'Cliente Beta (exemplo)', municipio: 'Luziânia', uf: 'GO', descricao: 'Diagnóstico municipal e implantação do novo galpão de triagem.', tecnicos: ['u_lilian'], coops: ['c_luziania'], agentes: agLzn, status: 'Ativo', inicio: d(-14), fim: addDays(T, 150), criadoEm: ts(-14), criadoPor: 'u_leticia' },
  ];

  // ---------------- integração (P1) ----------------
  const integ = (coopId: string, quantos: number, base: number, por: string): Integracao => ({
    coopId,
    itens: Object.fromEntries(INTEGRACAO_ITENS.map((it, i) => [it.k, i < quantos ? { ok: true, por, em: ts(base + i) } : { ok: false }])),
  });
  const integracoes: Integracao[] = [
    integ('c_acambb', 5, -42, 'u_yuri'),
    integ('c_cootra', 5, -40, 'u_lilian'),
    integ('c_vida', 5, -49, 'u_lilian'),
    integ('c_maos', 5, -52, 'u_geovani'),
    integ('c_recicla', 2, -3, 'u_geovani'),
  ];

  // ---------------- mentorias (P2) ----------------
  const mentorias: Mentoria[] = [
    { id: 'me_acambb', coopId: 'c_acambb', tecnicoId: 'u_yuri', data: d(-19), modalidade: 'Microsoft Teams', participantes: 'Vantuil (presidente), Sandra (financeiro), Jorge (galpão)',
      pontos: 'Sem controle diário de produção; estoque de fardos misturado; extintores vencidos; interesse em vender direto para recicladora.',
      fotos: [seedId('h', 'Mentoria online ACAMBB - print da reunião', 1), seedId('h', 'Mentoria online ACAMBB - quadro de produção', 2)],
      acoes: [
        { id: 'pa1', acao: 'Implantar planilha de controle diário de produção', responsavel: 'Sandra (ACAMBB)', prazo: d(3), status: 'Em andamento' },
        { id: 'pa2', acao: 'Separar o estoque de fardos por tipo de material', responsavel: 'Jorge (ACAMBB)', prazo: d(-2), status: 'Concluída' },
        { id: 'pa3', acao: 'Recarregar os extintores e registrar a validade', responsavel: 'Vantuil (ACAMBB)', prazo: d(10), status: 'A fazer' },
      ] },
    { id: 'me_cootra', coopId: 'c_cootra', tecnicoId: 'u_lilian', data: d(-12), modalidade: 'Google Meet', participantes: 'Kailane (presidente), Rogério (logística)',
      pontos: 'Filial com baixa produtividade; rotas de coleta sobrepostas; necessidade de padronizar EPIs.',
      fotos: [seedId('h', 'Mentoria online COOTRAEMPOCAP - print', 3)],
      acoes: [
        { id: 'pa4', acao: 'Revisar as rotas de coleta da filial', responsavel: 'Rogério (COOTRAEMPOCAP)', prazo: d(6), status: 'Em andamento' },
        { id: 'pa5', acao: 'Levantar o tamanho de EPIs de todos os cooperados', responsavel: 'Kailane (COOTRAEMPOCAP)', prazo: d(1), status: 'A fazer' },
      ] },
    { id: 'me_vida', coopId: 'c_vida', tecnicoId: 'u_lilian', data: d(-33), modalidade: 'Microsoft Teams', participantes: 'Marlene (presidente), equipe administrativa',
      pontos: 'Boa organização interna; precisa formalizar a prestação de contas mensal.', fotos: [assetId('mentoria-vida-nova')],
      acoes: [{ id: 'pa6', acao: 'Criar modelo de prestação de contas mensal', responsavel: 'Marlene (Vida Nova)', prazo: d(-10), status: 'Concluída' }] },
    { id: 'me_maos', coopId: 'c_maos', tecnicoId: 'u_geovani', data: d(-40), modalidade: 'Chamada de vídeo no WhatsApp', participantes: 'Josué (presidente)',
      pontos: 'Prensa parada há 2 meses; dificuldade com comprador de papelão.', fotos: [seedId('h', 'Mentoria online Mãos Unidas', 5)],
      acoes: [{ id: 'pa7', acao: 'Orçar manutenção da prensa', responsavel: 'Josué (Mãos Unidas)', prazo: d(-20), status: 'Concluída' }] },
  ];

  // ---------------- suporte contínuo (P4) ----------------
  const atendimentos: Atendimento[] = [
    { id: 'at1', coopId: 'c_maos', tecnicoId: 'u_geovani', data: d(-6), tema: 'Comercialização', canal: 'WhatsApp', resumo: 'Apoio na negociação de preço do papelão com novo comprador.', encaminhamento: 'Enviar três cotações até sexta.', fotos: [seedId('h', 'Suporte Mãos Unidas - fardos de papelão', 6)] },
    { id: 'at2', coopId: 'c_maos', tecnicoId: 'u_geovani', data: d(-13), tema: 'Segurança do trabalho / EPIs', canal: 'Presencial', resumo: 'Orientação sobre uso de luvas e botas na triagem.', encaminhamento: 'Registrar entrega de EPIs em ficha.', fotos: [seedId('v', 'Suporte Mãos Unidas - EPIs na triagem', 7)] },
    { id: 'at3', coopId: 'c_vida', tecnicoId: 'u_lilian', data: d(-3), tema: 'Gestão financeira', canal: 'Videochamada', resumo: 'Revisão da planilha de prestação de contas de setembro.', encaminhamento: 'Ajustar categorias de despesas.', fotos: [] },
    { id: 'at4', coopId: 'c_acambb', tecnicoId: 'u_yuri', data: d(-6), tema: 'Operação e layout', canal: 'Presencial', resumo: 'Sugestão de novo posicionamento das bags na triagem.', encaminhamento: 'Testar o novo layout por 2 semanas.', fotos: [seedId('h', 'Suporte ACAMBB - layout da triagem', 8)] },
  ];

  // ---------------- capacitações (P5) ----------------
  const capacitacoes: Capacitacao[] = [
    { id: 'cap1', tema: 'Segurança no trabalho e uso correto de EPIs', data: d(-33), ini: '14:00', fim: '16:00', link: 'https://teams.microsoft.com/', facilitadorId: 'u_leticia', coops: ['c_acambb', 'c_cootra', 'c_vida', 'c_maos'], presencas: { c_acambb: 6, c_cootra: 4, c_vida: 7, c_maos: 3 }, fotos: [seedId('h', 'Capacitação online - Segurança e EPIs', 9)], status: 'Realizada', resumo: 'Boa participação; dúvidas sobre troca de luvas.' },
    { id: 'cap2', tema: 'Gestão financeira para cooperativas', data: d(-5), ini: '14:00', fim: '16:00', link: 'https://teams.microsoft.com/', facilitadorId: 'u_lilian', coops: ['c_acambb', 'c_cootra', 'c_vida', 'c_maos'], presencas: { c_acambb: 3, c_cootra: 0, c_vida: 5, c_maos: 2 }, fotos: [seedId('h', 'Capacitação online - Gestão financeira', 10)], status: 'Realizada', resumo: 'COOTRAEMPOCAP não participou (sem internet no galpão).' },
    { id: 'cap3', tema: 'Comercialização e negociação com compradores', data: d(9), ini: '14:00', fim: '16:00', link: 'https://teams.microsoft.com/', facilitadorId: 'u_leticia', coops: ['c_acambb', 'c_cootra', 'c_vida', 'c_maos'], presencas: {}, fotos: [], status: 'Agendada' },
  ];

  // ---------------- visitas DCO ----------------
  const termosBase = (nomes: string[], assinados: number, base: number): Termo[] =>
    nomes.map((nome, i) => ({
      id: 't' + i,
      nome,
      cpf: i < assinados ? `${String(100 + i * 11).padStart(3, '0')}.${String(200 + i * 7).slice(0, 3)}.${String(300 + i * 13).slice(0, 3)}-${String(10 + i).slice(-2)}` : '',
      assinado: i < assinados,
      assinatura: i < assinados ? seedId('s', nome, i) : undefined,
      em: i < assinados ? ts(base) : undefined,
    }));
  const NOMES_ACAMBB = ['Maria A. Souza', 'José R. Lima', 'Ana P. Ferreira', 'Carlos E. Santos', 'Luana M. Rocha', 'Pedro H. Alves', 'Rita C. Nunes', 'Joana S. Dias', 'Marcos V. Teixeira', 'Sônia L. Prado', 'Edson F. Moura', 'Cláudia R. Pires', 'Antônio B. Melo', 'Fernanda O. Reis', 'Raimundo J. Costa', 'Tatiane G. Luz'];

  const baseDecl = (razao: string, rede: string, mulheres: string, homens: string, data: string) => ({
    razao, cnpj: '', op: 'Organização de catadores', emRede: rede === 'Sem rede' ? 'Não' : 'Sim', rede: rede === 'Sem rede' ? '' : rede,
    trab: [mulheres, homens], horas: '44', perCom: 'Semanalmente', papel: 'Entre 21 e 50', plastico: 'Entre 11 e 20', vidro: 'Até 10', metal: 'Até 10',
    aerossol: '', prensasBal: ['2', '1'], calib: '', treinoEpi: '', freqTreino: '', freqEpi: '', unidade: [], licenca: '', convPref: 'Não', selPref: '',
    prefs: ['', ''], privadas: '', caminhoes: '0', compradores: 'Intermediários', gestoras: '', fazParte: [], apoio: '', dataAfericao: data,
  });

  function fullVisit(id: string, coop: Coop, tecnicoId: string, dia: string, status: Visita['status'], nTermos: number): Visita {
    const chk = emptyChk();
    Object.keys(chk).forEach((k) => (chk[k].ok = true));
    chk['2-0'].infra = 'Adequada';
    chk['2-0'].limpeza = 'Regular';
    chk['3-2'].obs = 'Dois extintores, um vencido.';
    const ph = CENAS.map(([nome, , vid], i) => ({
      h: { id: seedId('h', `${coop.nome} - ${nome}`, i), kind: 'img' as const },
      v: { id: seedId('v', `${coop.nome} - ${nome}`, i + 1), kind: 'img' as const },
      vid: vid ? { id: seedId('vid', `${coop.nome} - ${nome}`, i + 2), kind: 'vid' as const } : null,
      na: false,
      just: '',
    }));
    const nomes = Array.from({ length: nTermos }, (_, i) => NOMES_ACAMBB[(i * 3 + coop.nome.length) % NOMES_ACAMBB.length].replace(/^(\S+)/, (m) => m) + (i >= NOMES_ACAMBB.length ? ' II' : ''));
    const decl = baseDecl(coop.razaoSocial || coop.nome, coop.rede, '8', '6', dia);
    Object.assign(decl, { aerossol: 'Sim', calib: 'Sim', treinoEpi: 'Sim', freqTreino: 'Semestralmente', freqEpi: 'Trimestralmente', licenca: 'Em processo de obtenção', selPref: 'Sim', privadas: 'Sim', cnpj: '12.345.678/0001-90' });
    return {
      id, coopId: coop.id, projetoId: 'p_acel', tecnicoId, data: dia, endereco: 'Matriz', status,
      criadaEm: at(dia, '08:10').toISOString(), atualizadaEm: at(addDays(dia, 1), '17:20').toISOString(),
      enviadaEm: at(addDays(dia, 1), '17:20').toISOString(),
      aprovadaEm: status === 'aprovada' ? at(addDays(dia, 3), '10:05').toISOString() : undefined,
      chk, ph,
      eq: [
        { id: 'e1', tipo: 'Prensa', qtd: 1, esp: 'Prensa vertical hidráulica 12 t', cap: '12 t', est: 'Operando', nr: 'Sim', foto: { id: seedId('h', `${coop.nome} - Prensa`, 3), kind: 'img' } },
        { id: 'e2', tipo: 'Balança', qtd: 1, esp: 'Balança plataforma 1.000 kg', cap: '1.000 kg', est: 'Operando', nr: 'Sim', foto: { id: seedId('h', `${coop.nome} - Balança`, 5), kind: 'img' } },
      ],
      termos: termosBase(nomes, nTermos, -10),
      decl, capAno: '480', capDia: '210', sigDecl: seedId('s', 'tecnico', 2),
      rel: { info: 'Visita realizada com toda a diretoria presente.', respNome: coop.lideranca, respCpf: '111.222.333-44', tecCpf: '555.666.777-88', sigResp: seedId('s', coop.lideranca, 1), sigTec: seedId('s', 'tecnico', 3), saved: true },
      plano: { anexo: { id: 'ax_' + id, nome: `Plano_de_Acao_${coop.sigla}.pdf`, mediaId: seedId('pdf', `Plano de Acao - ${coop.nome}`), mime: 'application/pdf', em: at(dia, '11:40').toISOString(), por: tecnicoId }, destinatario: `${coop.lideranca} · ${coop.contato}`, enviadoEm: at(dia, '11:42').toISOString(), enviadoPor: tecnicoId },
      hist: [
        { em: at(dia, '08:10').toISOString(), por: tecnicoId, acao: 'Visita iniciada' },
        { em: at(dia, '11:42').toISOString(), por: tecnicoId, acao: 'Plano de ação entregue', detalhe: 'Envio confirmado' },
        { em: at(addDays(dia, 1), '17:20').toISOString(), por: tecnicoId, acao: 'Enviada para a coordenação' },
        ...(status === 'aprovada' ? [{ em: at(addDays(dia, 3), '10:05').toISOString(), por: 'u_leticia', acao: 'Aprovada pela coordenação' }] : []),
      ],
    };
  }

  const acambb = coops[0];
  const dAc = d(-4);
  const chkAc = emptyChk();
  EIXOS.forEach((e) => e.itens.forEach((_, i) => (chkAc[`${e.n}-${i}`].ok = e.n <= 2 || (e.n === 3 && i < 5))));
  chkAc['1-0'].obs = 'Usa caderno manual; sem planilha.';
  chkAc['2-4'].infra = 'Regular';
  chkAc['2-4'].limpeza = 'Adequada';
  const phAc = CENAS.map(([nome, , vid], i) => ({
    h: i < 9 ? { id: seedId('h', `ACAMBB - ${nome}`, i), kind: 'img' as const } : null,
    v: i < 8 && i !== 4 ? { id: seedId('v', `ACAMBB - ${nome}`, i + 1), kind: 'img' as const } : null,
    vid: vid && i < 7 && i !== 4 ? { id: seedId('vid', `ACAMBB - ${nome}`, i + 2), kind: 'vid' as const } : null,
    na: false,
    just: '',
  }));
  const vAcambb: Visita = {
    id: 'v_acambb', coopId: 'c_acambb', projetoId: 'p_acel', tecnicoId: 'u_yuri', data: dAc, endereco: 'Matriz', cronoId: 'cr_y1', status: 'rascunho',
    criadaEm: at(dAc, '08:05').toISOString(), atualizadaEm: at(dAc, '12:10').toISOString(),
    chk: chkAc, ph: phAc,
    eq: [
      { id: 'e1', tipo: 'Prensa', qtd: 2, esp: 'Prensa vertical hidráulica 15 t', cap: '15 t', est: 'Operando', nr: 'Não', foto: { id: seedId('h', 'ACAMBB - Prensa vertical', 2), kind: 'img' } },
      { id: 'e2', tipo: 'Balança', qtd: 1, esp: 'Balança plataforma 1.500 kg', cap: '1.500 kg', est: 'Operando', nr: 'Sim', foto: null },
      { id: 'e3', tipo: 'Carrinho/paleteira', qtd: 3, esp: 'Paleteira manual 2 t', cap: '2 t', est: 'Operando com danos', nr: 'Não avaliado', dano: 'Roda traseira quebrada em 1 unidade', foto: null },
    ],
    termos: termosBase(NOMES_ACAMBB, 11, -4),
    decl: baseDecl('ACAMBB', 'Rede Candanga', '9', '7', dAc), capAno: '', capDia: '',
    rel: { info: '', respNome: '', respCpf: '', tecCpf: '', saved: false },
    plano: { destinatario: `${acambb.lideranca} · ${acambb.contato}` },
    hist: [{ em: at(dAc, '08:05').toISOString(), por: 'u_yuri', acao: 'Visita iniciada' }],
  };
  const vAcambb2: Visita = {
    ...JSON.parse(JSON.stringify(vAcambb)),
    id: 'v_acambb_dup', cronoId: undefined, data: d(0), chk: emptyChk(), ph: CENAS.map(() => emptyCena()), eq: [], termos: termosBase(NOMES_ACAMBB, 0, 0),
    decl: baseDecl('ACAMBB', 'Rede Candanga', '', '', d(0)), criadaEm: at(d(0), '09:12').toISOString(), atualizadaEm: at(d(0), '09:14').toISOString(),
    hist: [{ em: at(d(0), '09:12').toISOString(), por: 'u_yuri', acao: 'Visita iniciada', detalhe: 'Aberta em duplicidade' }],
  };
  vAcambb2.chk['1-0'].ok = true;

  const visitas: Visita[] = [
    vAcambb,
    vAcambb2,
    fullVisit('v_vida', coops[2], 'u_lilian', d(-7), 'enviada', 18),
    fullVisit('v_maos', coops[3], 'u_geovani', d(-15), 'aprovada', 12),
  ];

  // ---------------- cronograma ----------------
  let n = 0;
  const cr = (tecnicoId: string, dia: string, ini: string, fim: string, tipo: ItemCrono['tipo'], extra: Partial<ItemCrono> = {}): ItemCrono => {
    const done = past(dia, fim);
    const status: StatusCrono = extra.status ?? (done ? 'Concluído' : dia === T || dia === addDays(T, 1) ? 'Confirmado' : 'Planejado');
    return { id: extra.id ?? 'cr' + n++, tecnicoId, data: dia, ini, fim, tipo, ...extra, status };
  };
  const crono: ItemCrono[] = [
    // Yuri
    cr('u_yuri', d(-6), '09:00', '11:00', 'Suporte contínuo', { coopId: 'c_acambb', projetoId: 'p_acel' }),
    cr('u_yuri', d(-5), '14:00', '16:00', 'Capacitação online', { projetoId: 'p_acel', obs: 'Apoio na capacitação de gestão financeira' }),
    cr('u_yuri', d(-4), '08:00', '12:00', 'Visita DCO', { id: 'cr_y1', coopId: 'c_acambb', projetoId: 'p_acel', endereco: 'Matriz', visitaId: 'v_acambb' }),
    cr('u_yuri', d(0), '09:00', '12:00', 'Atividade interna', { obs: 'Revisão dos registros da ACAMBB' }),
    cr('u_yuri', d(1), '14:00', '16:00', 'Suporte contínuo', { coopId: 'c_acambb', projetoId: 'p_acel', obs: 'Acompanhar planilha de produção' }),
    cr('u_yuri', d(2), '08:00', '12:00', 'Retorno ao grupo', { coopId: 'c_acambb', projetoId: 'p_acel', endereco: 'Matriz', obs: 'Coletar 5 termos pendentes e fotos que faltam' }),
    cr('u_yuri', d(3), '13:30', '17:00', 'Atividade interna', { obs: 'Consolidar o Relatório de Campo da ACAMBB' }),
    cr('u_yuri', d(4), '09:00', '11:00', 'Deslocamento', { obs: 'Ida ao galpão da Rede Candanga' }),
    cr('u_yuri', d(8), '09:00', '12:00', 'Suporte contínuo', { coopId: 'c_acambb', projetoId: 'p_acel' }),
    cr('u_yuri', d(9), '14:00', '16:00', 'Capacitação online', { projetoId: 'p_acel', obs: 'Comercialização e negociação' }),
    // Lilian
    cr('u_lilian', d(-7), '08:00', '12:00', 'Visita DCO', { coopId: 'c_vida', projetoId: 'p_acel', endereco: 'Matriz', visitaId: 'v_vida' }),
    cr('u_lilian', d(-5), '09:00', '12:00', 'Visita DCO', { coopId: 'c_cootra', projetoId: 'p_acel', endereco: 'Matriz', status: 'Reagendado', obs: 'Grupo sem operação no dia; remarcado para sexta desta semana' }),
    cr('u_lilian', d(-5), '14:00', '16:00', 'Capacitação online', { projetoId: 'p_acel', obs: 'Facilitadora: Gestão financeira' }),
    cr('u_lilian', d(0), '14:00', '16:00', 'Ação Cidades Circular', { projetoId: 'p_lzn', coopId: 'c_luziania', obs: 'Reunião com a Secretaria de Meio Ambiente de Luziânia' }),
    cr('u_lilian', d(1), '09:00', '11:00', 'Mentoria online', { coopId: 'c_cootra', projetoId: 'p_acel', obs: 'Retomar o plano de ação antes da visita' }),
    cr('u_lilian', d(2), '14:00', '16:00', 'Suporte contínuo', { coopId: 'c_vida', projetoId: 'p_acel' }),
    cr('u_lilian', d(4), '09:00', '12:30', 'Visita DCO', { id: 'cr_cootra', coopId: 'c_cootra', projetoId: 'p_acel', endereco: 'Matriz', obs: 'Visita remarcada' }),
    cr('u_lilian', d(7), '09:00', '12:00', 'Ação Cidades Circular', { projetoId: 'p_lzn', coopId: 'c_luziania', obs: 'Diagnóstico da Assoc. Luziânia Recicla' }),
    // Geovani
    cr('u_geovani', d(-6), '08:30', '10:00', 'Deslocamento', {}),
    cr('u_geovani', d(-6), '10:00', '13:00', 'Suporte contínuo', { coopId: 'c_maos', projetoId: 'p_acel' }),
    cr('u_geovani', d(-3), '09:00', '12:00', 'Ação Cidades Circular', { projetoId: 'p_anp', coopId: 'c_anapolis', obs: 'Levantamento de rotas com a prefeitura' }),
    cr('u_geovani', d(0), '14:00', '16:00', 'Atividade interna', { status: 'Confirmado', obs: 'Concluir integração do Grupo Recicla Norte (WhatsApp e Impacta+)' }),
    cr('u_geovani', d(2), '09:00', '12:00', 'Ação Cidades Circular', { projetoId: 'p_anp', coopId: 'c_anapolis', obs: 'Medição do galpão para o novo layout' }),
    cr('u_geovani', d(3), '09:00', '12:00', 'Visita DCO', { id: 'cr_recicla', coopId: 'c_recicla', projetoId: 'p_acel', endereco: 'Matriz', obs: 'Depende da integração completa' }),
    cr('u_geovani', d(4), '14:00', '16:00', 'Suporte contínuo', { coopId: 'c_maos', projetoId: 'p_acel' }),
    cr('u_geovani', d(8), '09:00', '12:00', 'Suporte contínuo', { coopId: 'c_maos', projetoId: 'p_acel' }),
    // Tacianne
    cr('u_tacianne', d(-6), '10:00', '12:00', 'Ação Cidades Circular', { projetoId: 'p_anp', obs: 'Reunião de abertura com o Cliente Alfa' }),
    cr('u_tacianne', d(-4), '08:00', '17:00', 'Ação Cidades Circular', { projetoId: 'p_anp', coopId: 'c_anapolis', obs: 'Diagnóstico inicial da cooperativa' }),
    cr('u_tacianne', d(0), '08:30', '12:00', 'Ação Cidades Circular', { projetoId: 'p_anp', obs: 'Consolidar planilha de rotas' }),
    cr('u_tacianne', d(1), '13:00', '17:00', 'Ação Cidades Circular', { projetoId: 'p_anp', coopId: 'c_anapolis', obs: 'Lista de documentos para regularização' }),
    cr('u_tacianne', d(2), '08:00', '12:00', 'Deslocamento', { obs: 'Brasília → Anápolis' }),
    cr('u_tacianne', d(3), '08:00', '12:00', 'Ação Cidades Circular', { projetoId: 'p_anp', coopId: 'c_anapolis', obs: 'Visita técnica à Coop. Recicla Anápolis' }),
    cr('u_tacianne', d(4), '14:00', '17:00', 'Atividade interna', { obs: 'Relatório semanal Anápolis' }),
    cr('u_tacianne', d(9), '08:00', '12:00', 'Ação Cidades Circular', { projetoId: 'p_anp', coopId: 'c_anapolis' }),
  ];

  // ---------------- Cidades Circular: tópicos e demandas ----------------
  const topicos: Topico[] = [];
  const tarefas: Tarefa[] = [];
  const top = (projetoId: string, codigo: string, titulo: string) => {
    const t = { id: `tp_${projetoId}_${codigo}`, projetoId, codigo, titulo };
    topicos.push(t);
    return t.id;
  };
  const tar = (projetoId: string, topicoId: string, codigo: string, demanda: string, o: Partial<Tarefa>) => {
    const id = `tk_${projetoId}_${codigo}`;
    const parts = codigo.split('.');
    const parentId = parts.length === 3 ? `tk_${projetoId}_${parts[0]}.${parts[1]}` : undefined;
    tarefas.push({
      id, projetoId, topicoId, parentId, codigo, demanda,
      dataEntrada: o.dataEntrada ?? d(-27), solicitante: o.solicitante ?? 'Leticia F. de Castro', area: o.area ?? 'TECSO',
      prioridade: o.prioridade ?? 'Média', status: o.status ?? 'A fazer', responsavel: o.responsavel ?? 'u_leticia',
      prazo: o.prazo, dataConclusao: o.dataConclusao, observacoes: o.observacoes ?? '', anexos: o.anexos ?? [], comentarios: o.comentarios ?? [], criadaEm: ts(-27),
    });
  };
  // Anápolis
  const a1 = top('p_anp', '1', 'Diagnóstico e mobilização inicial');
  tar('p_anp', a1, '1.1', 'Reunião de abertura com o cliente', { solicitante: 'Cliente Alfa (Renata Souza)', area: 'Coordenação', prioridade: 'Alta', status: 'Concluída', responsavel: 'u:u_leticia', prazo: d(-6), dataConclusao: d(-6), observacoes: 'Ata enviada ao cliente.' });
  tar('p_anp', a1, '1.2', 'Levantamento de dados da coleta seletiva municipal', { solicitante: 'Leticia F. de Castro', area: 'Prefeitura', prioridade: 'Alta', status: 'Em andamento', responsavel: 'a:ag_anp_pref', prazo: d(2), comentarios: [{ id: 'cm1', por: 'u_leticia', em: ts(-1, '15:30'), texto: 'Carlos confirmou envio dos dados de tonelagem até quarta.' }] });
  tar('p_anp', a1, '1.2.1', 'Solicitar à prefeitura os dados de tonelagem de 2025', { area: 'TECSO', status: 'Concluída', responsavel: 'u:u_tacianne', prazo: d(-5), dataConclusao: d(-6) });
  tar('p_anp', a1, '1.2.2', 'Consolidar a planilha de rotas de coleta', { area: 'TECSO', status: 'Em andamento', responsavel: 'u:u_tacianne', prazo: d(3) });
  tar('p_anp', a1, '1.3', 'Visita técnica à Coop. Recicla Anápolis', { area: 'TECSO', prioridade: 'Alta', status: 'A fazer', responsavel: 'u:u_tacianne', prazo: d(3) });
  const a2 = top('p_anp', '2', 'Estruturação da cooperativa');
  tar('p_anp', a2, '2.1', 'Projeto de adequação do layout do galpão', { area: 'Operação', status: 'A fazer', responsavel: 'u:u_geovani', prazo: d(14) });
  tar('p_anp', a2, '2.2', 'Regularização documental (CNPJ, alvará, licença)', { solicitante: 'Cliente Alfa (Renata Souza)', area: 'Cooperativa', prioridade: 'Urgente', status: 'Bloqueada', responsavel: 'a:ag_anp_coop', prazo: d(-2), observacoes: 'Aguardando certidão negativa de débitos.' });
  tar('p_anp', a2, '2.2.1', 'Enviar à cooperativa a lista de documentos pendentes', { area: 'TECSO', status: 'Concluída', responsavel: 'u:u_tacianne', prazo: d(-8), dataConclusao: d(-9) });
  tar('p_anp', a2, '2.3', 'Compra de EPIs para os cooperados', { solicitante: 'Leticia F. de Castro', area: 'Cliente', prioridade: 'Alta', status: 'Em andamento', responsavel: 'a:ag_anp_cli', prazo: d(8) });
  const a3 = top('p_anp', '3', 'Capacitação e mobilização');
  tar('p_anp', a3, '3.1', 'Capacitação em triagem e segurança do trabalho', { area: 'TECSO', status: 'A fazer', responsavel: 'u:u_tacianne', prazo: d(21) });
  tar('p_anp', a3, '3.2', 'Campanha de educação ambiental nos bairros', { area: 'Prefeitura', prioridade: 'Baixa', status: 'A fazer', responsavel: 'a:ag_anp_pref', prazo: d(35) });
  const a4 = top('p_anp', '4', 'Comunicação e relatórios');
  tar('p_anp', a4, '4.1', 'Relatório mensal ao cliente', { solicitante: 'Cliente Alfa (Renata Souza)', area: 'Coordenação', status: 'Em andamento', responsavel: 'u:u_leticia', prazo: d(10) });
  tar('p_anp', a4, '4.2', 'Registro fotográfico das ações em campo', { area: 'TECSO', status: 'Em andamento', responsavel: 'u:u_geovani', prazo: d(7), anexos: [{ id: 'ax_ft1', nome: 'Galpao_Anapolis_fachada.jpg', mediaId: seedId('h', 'Anápolis - fachada do galpão', 11), mime: 'image/jpeg', em: ts(-3), por: 'u_geovani' }, { id: 'ax_ft2', nome: 'Galpao_Anapolis_triagem.jpg', mediaId: seedId('h', 'Anápolis - área de triagem', 12), mime: 'image/jpeg', em: ts(-3), por: 'u_geovani' }] });
  // Luziânia
  const l1 = top('p_lzn', '1', 'Diagnóstico municipal');
  tar('p_lzn', l1, '1.1', 'Reunião com a Secretaria de Meio Ambiente', { dataEntrada: d(-13), area: 'Coordenação', status: 'Concluída', responsavel: 'u:u_lilian', prazo: d(0), dataConclusao: d(0) });
  tar('p_lzn', l1, '1.2', 'Diagnóstico da Assoc. Luziânia Recicla', { dataEntrada: d(-13), area: 'TECSO', prioridade: 'Alta', status: 'Em andamento', responsavel: 'u:u_lilian', prazo: d(7) });
  tar('p_lzn', l1, '1.2.1', 'Agendar a visita com o presidente da associação', { dataEntrada: d(-13), area: 'TECSO', status: 'Concluída', responsavel: 'u:u_lilian', prazo: d(-1), dataConclusao: d(-2) });
  const l2 = top('p_lzn', '2', 'Infraestrutura do novo galpão');
  tar('p_lzn', l2, '2.1', 'Definição do terreno do novo galpão', { dataEntrada: d(-13), area: 'Prefeitura', status: 'A fazer', responsavel: 'a:ag_lzn_pref', prazo: d(28) });
  tar('p_lzn', l2, '2.2', 'Orçamento de prensa e balança', { dataEntrada: d(-13), solicitante: 'Cliente Beta (Paulo Henrique)', area: 'Cliente', status: 'A fazer', responsavel: 'a:ag_lzn_cli', prazo: d(12) });
  tarefas.forEach((t) => {
    if (!t.responsavel.includes(':')) t.responsavel = 'u:' + t.responsavel;
  });

  return {
    version: 1,
    seededAt: new Date().toISOString(),
    users, projetos, coops, crono, visitas, integracoes, mentorias, atendimentos, capacitacoes, topicos, tarefas,
    audit: [
      { id: 'au1', em: ts(-120), por: 'u_matheus', tipo: 'usuario', alvo: 'u_juliana', texto: 'Usuário criado com o perfil Gestão (Diretoria)' },
      { id: 'au2', em: ts(-110), por: 'u_matheus', tipo: 'usuario', alvo: 'u_leticia', texto: 'Usuário criado com o perfil Coordenação' },
      { id: 'au3', em: ts(-100), por: 'u_matheus', tipo: 'usuario', alvo: 'u_yuri', texto: 'Usuário criado com o perfil Técnico operacional' },
      { id: 'au4', em: ts(-100), por: 'u_matheus', tipo: 'usuario', alvo: 'u_lilian', texto: 'Usuário criado com o perfil Técnico operacional' },
      { id: 'au5', em: ts(-90), por: 'u_matheus', tipo: 'usuario', alvo: 'u_geovani', texto: 'Usuário criado com o perfil Técnico operacional' },
      { id: 'au6', em: ts(-60), por: 'u_matheus', tipo: 'usuario', alvo: 'u_tacianne', texto: 'Usuário criado com o perfil Técnico operacional' },
      { id: 'au7', em: ts(-28), por: 'u_leticia', tipo: 'projeto', alvo: 'p_anp', texto: 'Projeto criado e macro projeto importado (4 tópicos, 13 demandas)' },
    ],
    config: { termo: { nac: 'Brasileira', prof: 'Catador(a) de materiais recicláveis', cidade: 'Brasília', uf: 'DF' }, online: true },
  };
}
