# Jornada de Profissionalização TECSO · Ambipar

Protótipo funcional da extensão que leva para o sistema atual da Ambipar a operação de campo da TECSO com as cooperativas: Programa de Aceleração (produtos 1 a 5, incluindo o Diagnóstico de Capacidade Operacional, o DCO) e Programa Cidades Circular.

## Como abrir

Dê dois cliques em **`Abrir Jornada TECSO.bat`**, ou abra `app/index.html` no Chrome ou no Edge. Não precisa de internet nem de instalar nada.

Na tela de login, use o **acesso rápido** ou entre com e-mail e senha. Todos os usuários usam a senha **`planetaA`**.

| Pessoa | Perfil | E-mail |
|---|---|---|
| Matheus Correia | ADM / Desenvolvimento | matheus.correia@tecso.demo |
| Juliana Navea | Gestão (Diretoria) | juliana.navea@tecso.demo |
| Leticia Fatima de Castro | Coordenação | leticia.castro@tecso.demo |
| Yuri Maluf | Técnico operacional | yuri.maluf@tecso.demo |
| Lilian Prado | Técnico operacional | lilian.prado@tecso.demo |
| Geovani de Oliveira | Técnico operacional | geovani.oliveira@tecso.demo |
| Tacianne Viana | Técnico operacional | tacianne.viana@tecso.demo |

**Antes de apresentar:** entre como Matheus e use *Restaurar demonstração* no menu do usuário. Isso recalcula todas as datas para a semana atual e apaga o que foi testado. Se os dados forem de uma semana anterior, o sistema avisa no topo da tela.

Os dados ficam salvos no navegador do computador onde o protótipo foi aberto. Fotos e anexos ficam no IndexedDB do navegador.

## Roteiro sugerido para a apresentação

1. **Login**: o planeta com os continentes reais e o anel de resíduos nas cores da coleta seletiva (papel, plástico, vidro e metal), com o lema "Não existe planeta B. Cuide do planeta A".
2. **Yuri (técnico)**:
   - o Painel mostra só as visitas e a agenda dele;
   - no Cronograma, ele vê só a própria linha;
   - em *Minhas visitas DCO*, ele continua o rascunho da ACAMBB ou exclui o rascunho duplicado (com opção de desfazer);
   - dentro da visita aparecem as informações do Plano de Ação (P2) e os 7 documentos.
3. **Lilian (técnica)**: no Cronograma, clica na visita de sexta à COOTRAEMPOCAP e usa **Iniciar visita DCO a partir deste item**.
4. **Geovani (técnico)**: o Grupo Recicla Norte está com a integração incompleta. A visita e a mentoria ficam bloqueadas até o checklist (Impacta+) ser concluído.
5. **Leticia (coordenação)**:
   - filtra por tipo de projeto no topo;
   - aprova ou devolve a visita da Vida Nova;
   - abre o projeto Cidades Circular · Anápolis (tópicos → subtarefas → itens);
   - cria um **Novo projeto**: primeiro os técnicos responsáveis, depois a importação do Excel;
   - abre o **Histórico da cooperativa** e baixa o Excel e o ZIP de fotos.
6. **Matheus (ADM)**: em *Usuários e acessos*, cria um usuário a partir de um perfil e promove um técnico a Coordenação, com a confirmação do que muda. *Ver como* entra no sistema como aquele usuário.
7. **Juliana (diretoria)**: Painel geral e *Integração e roadmap*.

## O que tem no protótipo

- **Login** com perfis, menus e permissões aplicados a cada usuário. O seletor de perfil do mockup saiu.
- **Cronograma de campo**:
  - abre na semana atual e tem navegação entre semanas;
  - visões de dia, semana e mês;
  - Andamento da Semana em %;
  - Próximo item calculado com a data e a hora de agora;
  - itens atrasados ou em andamento são identificados automaticamente;
  - o técnico vê só a própria agenda.
- **Visitas DCO**:
  - painel *Minhas visitas*: continuar, excluir rascunho (só rascunhos) e nova visita;
  - os 7 documentos do mockup;
  - entrega do plano de ação com anexo e confirmação de envio (data e hora registradas);
  - aprovação ou devolução com motivo pela coordenação;
  - histórico da visita.
- **Programa de Aceleração**:
  - jornada de cada cooperativa (P1 a P5);
  - checklist de integração (WhatsApp e Impacta+) que bloqueia as etapas seguintes;
  - mentorias com plano de ação e fotos;
  - suporte contínuo;
  - capacitações com presença e a meta de 1 por mês.
- **Cidades Circular**:
  - um projeto por cliente;
  - assistente de criação: dados → técnicos principais e responsáveis externos (nome e contato) → importação do macro projeto em Excel e documento aprovado → revisão;
  - estrutura em tópicos, subtarefas e itens (no máximo um nível abaixo da subtarefa), com os campos da planilha da Letícia;
  - Situação de Prazo calculada automaticamente;
  - comentários, anexos e exportação em Excel;
  - os prazos dos técnicos aparecem no cronograma deles.
- **Histórico da cooperativa**:
  - busca pelo nome;
  - todas as ações da jornada numa tabela;
  - exportação em **Excel com 9 abas**;
  - **ZIP com as fotos** organizadas por etapa, com índice.
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
