# Jornada de Profissionalização TECSO · Ambipar

Protótipo funcional da extensão que leva para o sistema atual da Ambipar a operação de campo da TECSO com as cooperativas: Programa de Aceleração (integração, plano de ação, Diagnóstico de Capacidade Operacional (DCO), suporte contínuo e capacitações) e Programa Cidades Circular.

## Como abrir

**Pelo navegador (GitHub Pages):** https://tezzy05.github.io/Jornada-de-Profissionaliza-ao-TECSO-Ambipar/

**No computador:** dê dois cliques em **`Abrir Jornada TECSO.bat`**, ou abra `app/index.html` no Chrome ou no Edge. Não precisa de internet nem de instalar nada.

Na tela de login, entre com e-mail e senha, ou abra o campo discreto **Acesso de demonstração** abaixo do botão Entrar. Todos os usuários usam a senha **`planetaA`**. Para colocar o sistema no ar, basta retirar esse campo em `sistema/src/features/auth/LoginPage.tsx`.

| Pessoa | Perfil | E-mail |
|---|---|---|
| Matheus Correia | ADM / Desenvolvimento | matheus.correia@tecso.demo |
| Juliana Navea | Diretoria | juliana.navea@tecso.demo |
| Leticia Fatima de Castro | Coordenação | leticia.castro@tecso.demo |
| Yuri Maluf | Técnico operacional | yuri.maluf@tecso.demo |
| Lilian Prado | Técnico operacional | lilian.prado@tecso.demo |
| Geovani de Oliveira | Técnico operacional | geovani.oliveira@tecso.demo |
| Tacianne Viana | Técnico operacional | tacianne.viana@tecso.demo |

**Antes de apresentar:** entre como Matheus e use *Restaurar demonstração* no menu do usuário. Isso recalcula todas as datas para a semana atual e apaga o que foi testado. Se os dados forem de uma semana anterior, o sistema avisa no topo da tela.

Os dados ficam salvos no navegador do computador onde o protótipo foi aberto. Fotos e anexos ficam no IndexedDB do navegador.

## Roteiro sugerido para a apresentação

1. **Login**: o formulário fica no centro, em um cartão de vidro claro, com o planeta girando ao fundo (continentes reais e o anel de resíduos nas cores da coleta seletiva: papel, plástico, vidro e metal), o título "Jornada de Profissionalização TECSO" e o lema "Cuide do planeta A".
2. **Yuri (técnico)**:
   - o Painel mostra só as visitas e a agenda dele;
   - no Cronograma, ele vê só a própria linha e aprova o pedido da Tacianne para entrar na agenda dele;
   - o filtro de projetos no topo mostra só os projetos em que ele está vinculado;
   - em *Minhas visitas DCO*, ele continua o rascunho da ACAMBB ou exclui o rascunho duplicado (com opção de desfazer);
   - dentro da visita aparecem as informações do Plano de Ação (P2) e os 7 documentos.
3. **Lilian (técnica)**: no Cronograma, clica na visita de sexta à COOTRAEMPOCAP e usa **Iniciar visita DCO a partir deste item**.
4. **Geovani (técnico)**: o Grupo Recicla Norte está com a integração incompleta. A visita e a mentoria ficam bloqueadas até o checklist (Impacta+) ser concluído.
5. **Leticia (coordenação)**:
   - filtra por tipo de projeto no topo;
   - no Cronograma, vê a própria linha e a dos técnicos, aprova o pedido do Yuri e acompanha a aba *Entre técnicos*;
   - cria um evento com a Juliana como participante (vai como pedido de aprovação) e os técnicos (entram direto);
   - aprova ou devolve a visita da Vida Nova;
   - abre o projeto Cidades Circular · Anápolis (tópicos → subtarefas → itens);
   - cria um **Novo projeto**: primeiro os técnicos responsáveis, depois a importação do Excel;
   - abre o **Histórico da cooperativa** e baixa o Excel e o ZIP de fotos.
6. **Matheus (ADM)**: em *Usuários e acessos*, cria um usuário a partir de um perfil e promove um técnico a Coordenação, com a confirmação do que muda. *Ver como* entra no sistema como aquele usuário.
7. **Juliana (diretoria)**: no Cronograma, vê todas as linhas e aprova o *Fechamento semanal* da Leticia; Painel geral e *Integração e roadmap*.
8. **Geovani (técnico)**: clica em **Eventos Solicitados** e vê que a Leticia recusou o pedido dele, com o motivo.

## O que tem no protótipo

- **Login** com perfis, menus e permissões aplicados a cada usuário. O seletor de perfil do mockup saiu.
- **Cronograma de campo**:
  - abre na semana atual e tem navegação entre semanas;
  - visões de dia, semana e mês;
  - Andamento da Semana em %;
  - Próximo item calculado com a data e a hora de agora;
  - itens atrasados ou em andamento são identificados automaticamente;
  - uma linha por pessoa, incluindo a Coordenação e a Diretoria;
  - quem vê o quê: o técnico vê só a própria linha; a Coordenação vê a própria e a dos técnicos; a Diretoria vê a própria, a da Coordenação e a dos técnicos; o ADM vê tudo;
  - no **Novo item**, o campo *No cronograma de* e os **Participantes** seguem a hierarquia: para quem está abaixo, o evento entra direto; para o mesmo nível ou um nível acima, vira pedido de aprovação; dois níveis acima não aparece (o técnico não pede para a Diretoria);
  - o pedido só pode ser aprovado pela pessoa incluída ou por alguém acima dela; a Coordenação tem a aba *Entre técnicos* com os pedidos pendentes entre eles;
  - se a pessoa recusa, o evento some da agenda dela e aparece na lista de participantes do evento com o motivo;
  - indicadores clicáveis (Concluídos, Reagendados, Atrasados e **Eventos Solicitados**) funcionam como filtro, com o botão *Limpar todos os filtros*;
  - a promoção feita pelo ADM muda o nível da pessoa e, com ele, essas regras.
- **Visitas DCO**:
  - painel *Minhas visitas*: continuar, excluir rascunho (só rascunhos) e nova visita;
  - os 7 documentos do mockup;
  - entrega do plano de ação com anexo e confirmação de envio (data e hora registradas);
  - aprovação ou devolução com motivo pela coordenação;
  - histórico da visita.
- **Programa de Aceleração**:
  - jornada de cada cooperativa, etapa por etapa, com o que foi feito e o que está pendente;
  - checklist de integração (WhatsApp e Impacta+) que bloqueia as etapas seguintes;
  - mentorias com plano de ação e fotos;
  - suporte contínuo;
  - capacitações com presença e a meta de 1 por mês;
  - troca do técnico responsável em itens já criados (cooperativa, mentoria, atendimento, visita, cronograma e capacitação).
- **Cidades Circular**:
  - um projeto por cliente;
  - assistente de criação: dados → técnicos principais e responsáveis externos (nome e contato) → importação do macro projeto em Excel e documento aprovado → revisão;
  - estrutura em tópicos, subtarefas e itens (no máximo um nível abaixo da subtarefa), com os campos da planilha da Letícia;
  - Situação de Prazo calculada automaticamente;
  - comentários, anexos e exportação em Excel;
  - os prazos dos técnicos aparecem no cronograma deles;
  - troca de responsável em cada demanda e transferência de todas as demandas de uma pessoa para outra (por exemplo, quando um técnico sai).
- **Histórico da cooperativa**:
  - busca pelo nome;
  - todas as ações da jornada numa tabela;
  - exportação em **Excel com 8 abas**;
  - **ZIP com todas as fotos** organizadas por etapa;
  - na janela de fotos de uma ação: ZIP só daquela ação ou só das fotos selecionadas.
- **Usuários e acessos** (ADM):
  - perfis pré-definidos que já marcam os acessos;
  - ajuste de cada acesso;
  - vínculo com projetos;
  - histórico de alterações.

## Modelo de importação do macro projeto

`modelos/Modelo_Macro_Projeto_Cidades_Circular.xlsx` pode ser compartilhado com a coordenação. O mesmo modelo também pode ser baixado dentro do sistema, em Cidades Circular.

A coluna **Código** define o nível:
- `1` é um tópico;
- `1.1` é uma subtarefa;
- `1.1.1` é um item da subtarefa.

O arquivo tem uma aba de instruções e listas suspensas.

## Estrutura do repositório

```
Abrir Jornada TECSO.bat            abre o protótipo (app/index.html)
Rodar em modo desenvolvimento.bat  para alterar o código (precisa do Node.js 18+)
Gerar nova versao do app.bat       recompila app/index.html e o modelo Excel
app/                               protótipo pronto, em um único arquivo HTML
modelos/                           modelo Excel do macro projeto
referencias/                       mockup original e documento com os pedidos
sistema/                           código-fonte (React + TypeScript + Vite + Tailwind)
```

Tecnologias:
- React 18;
- Motion (animações);
- Three.js (planeta do login);
- ExcelJS (importação e exportação);
- JSZip (pacote de fotos);
- Radix UI (diálogos e menus);
- Zustand (estado salvo no navegador).

Referências de design:
- Refero Styles, sistema "Wise" (verde-musgo com acento lima), que combina com as cores do logo Ambipar;
- o mockup original do DCO.

## Limites do protótipo

- O login é simulado: as senhas não protegem nada.
- Não há servidor. Cada computador tem os seus próprios dados.
- O relatório consolidado ao MMA é o objetivo final, para quando esta extensão estiver integrada ao sistema atual (veja *Integração e roadmap* no próprio sistema).
