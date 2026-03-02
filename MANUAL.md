# Manual de Utilização e Instalação - Guia de Produção

## 1. Introdução

Esta aplicação é um guia de produção interativo projetado para orientar os operadores através de processos de montagem passo a passo. Ele visa reduzir erros, padronizar a produção e registrar o progresso de cada tarefa.

As principais funcionalidades incluem seleção de operador e produto, instruções detalhadas com suporte a imagens e comandos de voz, e um sistema de registro (logs) para análise de produtividade.

## 2. Requisitos do Sistema

Para instalar e executar esta aplicação, você precisará ter os seguintes softwares instalados em sua máquina:

- **Node.js**: Versão 20.x ou superior.
- **npm** (Node Package Manager): Geralmente vem instalado com o Node.js.

## 3. Instalação

Siga os passos abaixo para configurar o ambiente de desenvolvimento:

**a. Clone o Repositório (Opcional)**
Se você ainda não tem o projeto, clone o repositório. Se já tiver os arquivos, pule para o próximo passo.
```bash
git clone <url-do-repositorio>
cd production-guide
```

**b. Instale as Dependências**
Abra um terminal na pasta raiz do projeto e execute o seguinte comando para instalar todas as dependências necessárias listadas no arquivo `package.json`:

```bash
npm install
```

Este comando irá baixar e instalar pacotes como React, Next.js, e outras bibliotecas essenciais para o funcionamento do projeto.

## 4. Como Executar a Aplicação

Após a conclusão da instalação, inicie o servidor de desenvolvimento com o comando:

```bash
npm run dev
```

O terminal exibirá uma mensagem indicando que o servidor está rodando, geralmente no seguinte endereço:

```
- Local:   http://localhost:3000
```

## 5. Como Acessar e Utilizar

**a. Acesso**
Abra seu navegador de internet (Google Chrome, Firefox, etc.) e acesse a URL:
[http://localhost:3000](http://localhost:3000)

**b. Funcionalidades Principais**

1.  **Tela de Inserção do Operador:**
    - A primeira tela solicita o número do operador.
    - Digite seu número de identificação e pressione "Enter" ou clique no botão para prosseguir.

2.  **Seleção de Produto:**
    - A tela seguinte exibe uma lista de produtos disponíveis.
    - Clique no produto que você irá montar para iniciar o processo de produção.

3.  **Guia de Produção (Passo a Passo):**
    - A interface principal do guia de produção é exibida.
    - **Imagem de Referência:** Uma imagem do passo atual é mostrada para orientação visual.
    - **Descrição:** Instruções claras sobre o que fazer no passo atual.
    - **Navegação:** Use os botões "Anterior" e "Próximo" para navegar entre os passos manualmente.
    - **Comandos de Voz:** A aplicação possui reconhecimento de voz. Diga "siguiente" (seguinte) para avançar para o próximo passo automaticamente.
    - **Entrada Manual:** Se necessário, um campo de texto pode aparecer para inserir informações manualmente.

4.  **Visualização de Logs:**
    - No canto superior direito da tela de produção, há um botão para acessar os logs.
    - Ao clicar nele, um modal (janela) se abrirá, exibindo um histórico de todas as sessões de produção.
    - **Funcionalidades dos Logs:**
        - **Filtro e Busca:** Você pode buscar por operador, produto ou ID, e filtrar por status (completo ou incompleto).
        - **Scroll:** A lista de logs possui uma barra de rolagem para navegar por todo o histórico.
        - **Animação:** A lista é animada para uma melhor experiência de usuário.
        - **Download:** É possível baixar os logs em formato CSV.
        - **Limpar Logs:** Um botão permite apagar todos os registros.

5.  **Reiniciar o Processo:**
    - Um botão de reinício está disponível para abortar a produção atual e voltar à tela de inserção do operador. A produção marcada como "incompleta" será registrada nos logs.
