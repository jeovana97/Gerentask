# Gerentask — Portal Corporativo de Gerenciamento de Tarefas

O **Gerentask** é uma Single Page Application (SPA) premium desenvolvida em **React** e **Vite**, projetada para otimizar a coordenação de demandas e equipes através de um fluxo Kanban altamente intuitivo e moderno. O aplicativo foca em uma experiência de usuário rica (Rich Aesthetics), com suporte a temas dinâmicos (claro/escuro), design no estilo glassmorphism e sincronização reativa em tempo real entre abas sem a necessidade de backend centralizado.

---

## 🚀 Principais Recursos

- **Quadro Kanban Interativo:** Acompanhamento de demandas divididas em colunas de status (*A Fazer*, *Em Andamento*, *Concluídas*) com transição rápida e badges de prioridade coloridas.
- **Criação de Tarefas Interdepartamentais:** Todos os usuários (funcionários e gerentes) podem criar tarefas livremente destinadas a qualquer departamento e atribuí-las a qualquer colaborador.
- **Fluxo de Aprovação de Demandas:** 
  - Tarefas criadas por funcionários (ou gerentes fora de seu setor) entram como **Pendentes**.
  - O gerente do respectivo departamento de destino recebe a solicitação em um painel exclusivo (**"Solicitações Pendentes do Setor"**) e pode **Aprovar e Publicar** no Kanban ou **Rejeitar**.
  - Os funcionários acompanham o status de suas solicitações (pendente/rejeitado) no painel de controle superior.
- **Aprovação de Novos Cadastros:**
  - Usuários que realizam um cadastro público de login entram com o status inicial pendente de validação.
  - O login fica bloqueado até que o gerente do departamento escolhido acesse a aba **"Membros da Equipe"** e aprove o cadastro na seção **"Solicitações de Acesso Pendentes"**.
- **Unicidade de E-mail Case-Insensitive:** O sistema impede estritamente cadastros de e-mails duplicados indiferente de letras maiúsculas ou minúsculas (ex: `Ana@` vs `ana@`), normalizando todos os dados de e-mail salvos para caixa baixa.
- **Dashboard Estratégico:** Análise visual de métricas com indicadores e gráficos interativos (Recharts) detalhando tarefas por status, volume por departamento e índices de produtividade.
- **Notificações em Tempo Real (Multi-Aba):** Sistema de alerta de novas demandas atribuídas ao usuário logado, emitindo alertas visuais (Toasts animados) e aviso sonoro sintetizado nativamente (via Web Audio API) quando o usuário recebe uma tarefa, mesmo que a alteração seja feita por outro perfil em uma aba diferente do navegador.
- **Área do Funcionário:** Visual filtrado exclusivo onde cada colaborador foca apenas em suas tarefas atribuídas que já foram devidamente aprovadas, com painel motivacional individual e gráfico de progresso.
- **Controle Administrativo:** Cadastro e gestão completa de membros da equipe e departamentos corporativos por usuários administradores (gerentes).
- **Design System Premium:** Efeito glassmorphic avançado com transições suaves e compatibilidade total com Temas Claro e Escuro.
- **Banco de Dados Local:** Persistência automática dos dados no `localStorage` do navegador do cliente.

---

## 🛠️ Tecnologias Utilizadas

- **Core:** [React 19](https://react.dev/) & [Vite](https://vite.dev/) (Build tool rápida)
- **Estilização:** Vanilla CSS customizado (com variáveis CSS e propriedades flexíveis)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Sinalização Sonora:** Web Audio API (Síntese osciladora nativa, funciona 100% offline)
- **Lógica e Sincronia:** JavaScript Moderno (ES6+) e LocalStorage Storage Events

---

## 📦 Instruções de Instalação e Execução

### Pré-requisitos
- Ter o [Node.js](https://nodejs.org/) instalado na máquina (versão 18 ou superior recomendada).

### Passo 1: Clonar/Acessar o Projeto
Navegue até a pasta do projeto no seu terminal:
```bash
cd "/caminho/do/projeto/Gerentask"
```

### Passo 2: Instalar as Dependências
Instale os pacotes necessários especificados no `package.json`:
```bash
npm install
```

### Passo 3: Executar o Aplicativo Localmente

#### Opção A (Recomendada - Padrão):
Inicie o servidor de desenvolvimento do Vite:
```bash
npm run dev
```

#### Opção B (Contorno para restrições do PowerShell no Windows):
Caso o PowerShell emita um erro de segurança/permissão de execução ao rodar o comando padrão `npm`, execute o Vite diretamente pelo Node:
```bash
node .\node_modules\vite\bin\vite.js
```

O terminal exibirá a URL local para acesso, que geralmente é:
👉 **[http://localhost:5173/](http://localhost:5173/)**

---

## 🔑 Contas de Teste Pré-Configuradas

Para navegar e validar as diferentes permissões do sistema, utilize os seguintes perfis iniciais que são criados automaticamente no banco de dados local:

### Perfil Gerente (Administrador)
- **E-mail:** `gerente@gerentask.com`
- **Senha:** `123`

### Perfis Funcionário (Colaboradores)
- **Opção 1:** 
  - **E-mail:** `ana@gerentask.com`
  - **Senha:** `123`
  - **Departamento:** Design & UX
- **Opção 2:** 
  - **E-mail:** `bruno@gerentask.com`
  - **Senha:** `123`
  - **Departamento:** Tecnologia
- **Opção 3:** 
  - **E-mail:** `julia@gerentask.com`
  - **Senha:** `123`
  - **Departamento:** Marketing
