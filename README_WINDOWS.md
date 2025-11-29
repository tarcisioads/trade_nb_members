# Como Rodar o Projeto no Windows

## Pré-requisitos

Antes de começar, você precisará ter os seguintes softwares instalados:

1.  **Node.js**: É o ambiente de execução para o JavaScript no servidor. Você pode baixar a versão LTS (Long Term Support) no site oficial: [https://nodejs.org/](https://nodejs.org/)
2.  **pnpm**: É um gerenciador de pacotes rápido e eficiente em disco. Após instalar o Node.js, você pode instalar o pnpm abrindo o PowerShell ou o Prompt de Comando e executando o seguinte comando:
    ```bash
    npm install -g pnpm
    ```
3.  **Git**: É o sistema de controle de versão usado para clonar o repositório. Você pode baixá-lo em: [https://git-scm.com/](https://git-scm.com/)

## Instalação

1.  **Clone o repositório**: Abra o Git Bash, PowerShell ou Prompt de Comando, navegue até o diretório onde deseja salvar o projeto e clone o repositório:
    ```bash
    git clone https://github.com/tarcisioads/trade_nb_members.git
    cd trade_nb_members
    ```

2.  **Instale as dependências**: Use o pnpm para instalar todas as dependências do projeto:
    ```bash
    pnpm install
    ```

## Configuração

1.  **Variáveis de Ambiente**: O projeto utiliza um arquivo `.env` para configurar as variáveis de ambiente. Existe um arquivo de exemplo chamado `.env.example`. Crie uma cópia dele e renomeie para `.env`:
    ```bash
    copy .env.example .env
    ```
2.  **Edite o arquivo `.env`**: Abra o arquivo `.env` em um editor de texto e preencha as variáveis com os valores corretos para o seu ambiente. Veja a seção abaixo para mais detalhes sobre cada variável.

## Executando a Aplicação

Você pode executar o backend (bot), a API e o frontend.

*   **Para rodar tudo (bot, API e frontend)**:
    ```bash
    pnpm run dev:all
    ```

Isso irá gerar os arquivos otimizados do frontend no diretório `dist` e iniciar a API em modo de produção.

---

## Detalhes da Configuração do `.env`

O arquivo `.env` contém as variáveis de ambiente que configuram o comportamento da aplicação. Abaixo está a descrição de cada variável:

### Configuração da BingX API

*   `BINGX_API_KEY`: Sua chave de API da BingX. Necessária para autenticar e interagir com a sua conta.
*   `BINGX_API_SECRET`: Seu segredo de API da BingX. Usado para assinar as requisições à API.
*   `BINGX_BASE_URL`: A URL base para as requisições da API REST da BingX. O valor `https://open-api-vst.bingx.com` é para o ambiente de simulação (demostração). Para operar com dinheiro real, use a URL da API de produção fornecida pela BingX.
*   `BINGX_WS_URL`: A URL para a conexão WebSocket da BingX, usada para receber dados de mercado em tempo real.
*   `BINGX_MARGIN`: O valor da margem (em USDT) a ser usada em cada operação de trade.
*   `BINGX_LIMIT_ORDER_FEE`: A taxa percentual para ordens do tipo "Limit". Ex: `0.02` para 0.02%.
*   `BINGX_MARKET_ORDER_FEE`: A taxa percentual para ordens do tipo "Market". Ex: `0.05` para 0.05%.

### Gerenciamento de Risco e Alavancagem

*   `VOLUME_MARGIN_PERCENTAGE`: A porcentagem da margem a ser adicionada com base no volume do mercado.
*   `MAX_LEVERAGE`: A alavancagem máxima permitida para as operações.
*   `LEVERAGE_SAFETY_FACTOR_PERCENT`: Fator de segurança (em porcentagem) para o cálculo da alavancagem. Um valor menor resulta em uma alavancagem maior e mais arriscada.

### Configurações Gerais

*   `LOG_TO_CONSOLE`: Se definido como `true`, exibe os logs no console. Caso contrário (`false`), os logs são salvos apenas em arquivos no diretório `logs/`.
*   `MODIFY_TP1`: Se definido como `true`, o sistema ajustará o primeiro alvo (Take Profit 1) para garantir uma relação risco/retorno de 1:1.

### Configuração do Telegram

*   `TELEGRAM_BOT_TOKEN`: O token do seu bot do Telegram, obtido com o @BotFather.
*   `TELEGRAM_CHAT_ID`: O ID do chat para onde as notificações do bot serão enviadas.

#### Como obter o Token e o Chat ID do Telegram:

1.  **Criar um Bot e obter o Token**:
    *   Abra o Telegram e procure por `@BotFather`.
    *   Inicie uma conversa e envie o comando `/newbot`.
    *   Siga as instruções para dar um nome e um username para o seu bot (o username deve terminar com "bot", por exemplo, `meu_trade_bot`).
    *   O BotFather enviará uma mensagem com o token de acesso. Guarde-o para usar como `TELEGRAM_BOT_TOKEN`.

2.  **Obter o Chat ID**:
    *   Procure por `@userinfobot` no Telegram.
    *   Inicie uma conversa com ele.
    *   O bot responderá com as informações do seu perfil, incluindo o seu `Chat ID`.

---

## Scripts de Execução

Os seguintes scripts estão definidos no arquivo `package.json` e podem ser executados com `pnpm run <nome_do_script>`:

*   `test`: Executa os testes automatizados do projeto com o Jest.
*   `dev`: Inicia o bot de trading principal em modo de desenvolvimento, usando `ts-node` para executar o código TypeScript diretamente.
*   `build`: Compila o código TypeScript do projeto para JavaScript, gerando os arquivos na pasta `dist`.
*   `api`: Inicia o servidor da API em modo de desenvolvimento.
*   `frontend:dev`: Inicia o servidor de desenvolvimento do frontend (Vite) para a interface web.
*   `frontend:build`: Compila e otimiza o frontend para produção.
*   `dev:web`: Executa a API e o frontend simultaneamente em modo de desenvolvimento. Ideal para trabalhar na interface web.
*   `dev:all`: Executa o bot, a API e o frontend ao mesmo tempo. Útil para um ambiente de desenvolvimento completo.
*   `build:all`: Cria a build de produção do frontend e inicia a API em modo de produção.
