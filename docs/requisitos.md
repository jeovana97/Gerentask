# Documento de Requisitos do Produto (PRD)
## Gerentask — Portal Corporativo de Gerenciamento de Tarefas

---

## 1. Visão Geral do Produto
O **Gerentask** é uma aplicação web do tipo SPA (Single Page Application) desenvolvida para gerenciar demandas, fluxos de trabalho e a produtividade de equipes corporativas. 

O sistema utiliza a metodologia **Kanban** como núcleo visual e organizacional, dividindo as tarefas em colunas de status (A Fazer, Em Andamento, Concluídas). O aplicativo é construído com foco em **alta fidelidade visual (premium design)**, oferecendo transição suave entre temas claro e escuro, glassmorphism e atualizações de dados síncronas com um servidor backend Node.js local.

---

## 2. Público-Alvo e Perfis de Acesso

O sistema possui dois perfis de usuários com níveis de permissão estritamente controlados:

### 2.1. Administrador (Gerente)
- **Perfil:** Gestor do departamento ou da empresa.
- **Permissões:** 
  - Visualizar o dashboard estratégico completo com a produtividade e volume de demandas de todos os setores.
  - Criar, editar, mover e excluir quaisquer tarefas.
  - Atribuir tarefas para si ou para múltiplos funcionários simultaneamente.
  - Cadastrar, editar e excluir membros da equipe.
  - Cadastrar, editar e excluir departamentos.
  - Comentar e dar feedbacks em todas as tarefas.
  - Aprovar ou rejeitar solicitações de tarefas destinadas ao seu departamento.
  - Aprovar ou recusar o cadastro de novos usuários que solicitaram ingresso no seu departamento.

### 2.2. Funcionário (Membro de Equipe)
- **Perfil:** Profissional responsável por executar as demandas.
- **Permissões:**
  - Acessar sua área de trabalho e painel de progresso motivacional.
  - Visualizar exclusivamente o quadro Kanban com as tarefas atribuídas a ele que estejam aprovadas.
  - Mover o status de suas próprias tarefas através do fluxo Kanban (A Fazer ➔ Em Andamento ➔ Concluída).
  - Criar tarefas destinadas a qualquer setor e responsável (criadas inicialmente como "Pendentes de Aprovação").
  - Acompanhar o andamento de suas solicitações pendentes e rejeitadas em uma área dedicada no topo do quadro.
  - Incluir comentários e reportar andamento em suas tarefas.
  - Receber alertas visuais e sonoros instantâneos em caso de nova atribuição de tarefas.

---

## 3. Requisitos Funcionais

### RF-01: Autenticação de Usuário e Cadastro
- O sistema deve permitir o cadastro de novos usuários com Nome, E-mail, Senha, Cargo (Gerente ou Funcionário) e Departamento.
- **Unicidade de E-mail Case-Insensitive:** O sistema deve validar estritamente que apenas um e-mail único seja cadastrado. Letras maiúsculas e minúsculas devem ser tratadas de forma idêntica (ex: `Ana@gerentask.com` e `ana@gerentask.com` são considerados o mesmo e-mail). Todos os e-mails devem ser gravados em letras minúsculas (`toLowerCase`) no banco de dados local.
- O cadastro e o primeiro login de contas não verificadas devem exigir um código numérico de validação de 6 dígitos.
- **Simulação de E-mail:** O código de validação deve ser enviado de forma simulada através de um alerta modal em tela e pelo console do navegador para permitir o fluxo completo de testes em ambiente local.
- Sessão persistente por usuário através do `localStorage`.

### RF-02: Painel de Controle (Dashboard)
- **Visão do Gerente:**
  - Gráfico de pizza mostrando a distribuição geral de tarefas por status (A Fazer, Em Andamento, Concluídas).
  - Gráfico de barras empilhadas exibindo o volume de tarefas ativas e concluídas divididas por departamento.
  - Cards com métricas de Total de Tarefas, Tarefas Ativas e Taxa de Produtividade (%) da empresa.
  - Lista de atividades e tarefas modificadas recentemente em toda a empresa.
- **Visão do Funcionário:**
  - Cards com métricas individuais de tarefas atribuídas a ele.
  - Painel motivacional de progresso com porcentagem de demandas concluídas por ele.
  - Gráfico de pizza adaptado para suas tarefas individuais.
  - Lista contendo as 5 tarefas mais recentes atribuídas a ele.

### RF-03: Quadro Kanban de Tarefas
- Organização das tarefas em três colunas: "A Fazer" (Todo), "Em Andamento" (Doing) e "Concluídas" (Done).
- **Apenas tarefas aprovadas** pelo gestor do respectivo departamento devem ser listadas nas colunas do Kanban normal de trabalho.
- Cada card de tarefa deve exibir o Título, descrição curta, tag do setor (departamento), responsável (avatares dos funcionários atribuídos), número de comentários e prazo de vencimento formatado (`DD/MM/AAAA`).
- Cada card deve possuir botões rápidos de transição de fluxo (Voltar/Iniciar/Concluir) para facilitar a usabilidade.
- Indicação visual de prioridades nos cards por badges coloridas:
  - **Alta:** Vermelho (Badge Danger)
  - **Média:** Laranja (Badge Warning)
  - **Baixa:** Verde (Badge Success)
- Modal com visão detalhada da tarefa contendo descrição na íntegra, prazos, responsável e seção de comentários históricos.

### RF-04: Gestão de Demandas (Criação de Tarefas)
- **Criação Geral:** Qualquer usuário autenticado (gerente ou funcionário) deve conseguir criar uma tarefa para qualquer departamento e atribuí-la a um ou mais funcionários daquele setor (atribuição múltipla).
- O formulário de criação deve preencher: Título, Descrição, Prioridade (Alta, Média, Baixa), Data de Vencimento, Departamento de Destino e Funcionários Responsáveis.
- **Ações Administrativas:** Somente os gerentes podem editar ou excluir tarefas que já foram aprovadas e estão ativas no Kanban.

### RF-05: Seção de Comentários e Histórico
- Na tela de detalhes da tarefa, qualquer usuário (atribuído ou gerente) deve conseguir adicionar observações e relatórios de andamento.
- Cada comentário deve armazenar e renderizar o nome do autor, o conteúdo em texto e a data de postagem.

### RF-06: Cadastro e Gestão Organizacional (Exclusivo do Gerente)
- **Departamentos:** Tela para listagem, criação, edição e exclusão de setores. Ao excluir um setor, o sistema deve desvincular as tarefas e membros associados àquele setor.
- **Membros da Equipe:** Tela para listagem, cadastro de novos membros com definição de cargo/setor e exclusão de membros.

### RF-07: Central de Notificações em Tempo Real
- O sistema deve monitorar mudanças na base de dados de tarefas.
- Se o usuário receber uma tarefa atribuída, houver comentário ou alteração de status, o sistema deve disparar um alerta.
- **Botão de Histórico (Sino):** No cabeçalho da página, um ícone de sino deve exibir um "badge" vermelho contendo a contagem de novas notificações não lidas.
- **Painel Suspenso:** Ao clicar no sino, abre-se um dropdown listando cronologicamente todas as notificações (lidas e não lidas) para acompanhamento histórico. 
- **Leitura:** O usuário pode marcar cada notificação individualmente como lida ou usar o botão rápido "Marcar todas como lidas".
- **Sincronização Multi-Aba:** Se a alteração for feita por outro perfil em outra aba, a aba do funcionário deve disparar a notificação instantaneamente no banco de dados.

### RF-08: Fluxo de Aprovação de Tarefas
- **Aprovação Automática:** Se um gerente criar uma tarefa destinada ao seu próprio departamento, ela nasce como `'approved'` (aprovada) e vai direto para a coluna "A Fazer".
- **Aprovação Obrigatória:** Se um funcionário ou gerente de outro setor criar a tarefa, ela nasce como `'pending'` (pendente) e aguarda validação.
- **Painel de Pendências (Gerente):** No topo da tela de tarefas dos gerentes do setor correspondente, exibe-se a área "Solicitações de Tarefas Pendentes de Aprovação". O gerente pode **clicar no card da solicitação para visualizar detalhes na íntegra** e então **Aprovar** ou **Rejeitar**.
- **Acompanhamento (Funcionário):** No topo da tela de tarefas de funcionários, exibe-se a área "Minhas Solicitações de Tarefas", listando suas demandas enviadas que estão pendentes de avaliação ou foram rejeitadas.

### RF-09: Fluxo de Aprovação de Contas de Usuários (Novo)
- **Cadastro Pendente:** Novos usuários que efetuarem cadastro através da tela de registro público do portal são cadastrados com o status `approved: false`.
- **Bloqueio de Login:** Após a verificação do e-mail por código numérico, o login automático é bloqueado e a interface do usuário sinaliza que a conta está aguardando liberação do gestor. Tentativas de login subsequentes com a conta pendente são barradas exibindo mensagem correspondente.
- **Painel de Cadastro de Membros (Gerente):** No topo da tela "Membros da Equipe", se houver usuários cadastrados pendentes pertencentes ao mesmo departamento do gerente ativo, exibe-se a seção **"Solicitações de Acesso Pendentes"**.
- **Validação de Acesso:** O gerente do departamento pode clicar em **Aprovar Acesso** (atualiza para `approved: true` liberando o login) ou **Recusar** (deleta o cadastro pendente do banco).

### RF-10: Exclusão Definitiva e Histórico de Auditoria
- **Lixeira Permanente:** Exclusões de Usuários, Departamentos ou Tarefas são ações destrutivas (Hard Delete parcial ou deleção marcada) no sistema ativo, sumindo dos painéis gerais.
- **Log de Auditoria:** O sistema grava todas essas exclusões em um registro permanente que não pode ser apagado pelos usuários. 
- **Painel de Histórico (Exclusivo Gerente):** Tela onde o gestor visualiza todas as exclusões, exibindo a **Data e Hora**, **Tipo de Item Excluído**, **Nome/Título original** e, fundamentalmente, **Quem executou a exclusão** (Autor da exclusão).

---

## 4. Requisitos Não-Funcionais

### RNF-01: Arquitetura Client-Server Local com Persistência em JSON
- O aplicativo roda 100% no ambiente local (localhost), mas utiliza um servidor Node.js/Express atuando como API back-end.
- Todos os dados (usuários, tarefas, departamentos, históricos) são persistidos fisicamente no arquivo `server/database.json`. Isso evita problemas de bloqueios de banco de dados complexos em alguns sistemas Windows, garantindo estabilidade e leitura síncrona.

### RNF-02: Sincronização de Estado
- As chamadas são feitas para a API local em `localhost:3000`. O front-end React utiliza o `DataContext` para propagar mudanças visuais assim que a API responde com sucesso.

### RNF-03: Design System e Estética Premium
- O aplicativo deve apresentar um design de alto padrão (Premium Glassmorphism), caracterizado por fundos semi-transparentes de vidro com efeito `backdrop-filter: blur`, cantos arredondados, bordas sutis e sombras profundas.
- O aplicativo deve oferecer suporte nativo a dois temas integrados (Escuro e Claro).
- Micro-animações e transições sutis (por exemplo, fade-in na troca de páginas e slide-in na exibição de modais e Toasts).

### RNF-04: Áudio Nativo Autônomo
- A reprodução sonora do sistema de notificações deve ser gerada dinamicamente via síntese de frequências por meio da **Web Audio API** do HTML5. O aplicativo não deve depender do download ou requisição de arquivos de áudio externos (`.mp3`/`.wav`), garantindo o funcionamento do som de alerta em qualquer rede ou estado offline.

### RNF-05: Responsividade e Layout Flexível
- A interface do aplicativo deve ser totalmente responsiva, adaptando-se com elegância a telas de desktops, notebooks, tablets e smartphones (layouts em grade fluida que se convertem em colunas únicas em telas de largura inferior a 768px).
