# Guia de Produção - Documentação Técnica

Este documento detalha a arquitetura e a estrutura do projeto "Guia de Produção", uma aplicação interativa desenvolvida com Next.js e TypeScript. O objetivo é fornecer um entendimento claro de cada componente, pasta e funcionalidade para facilitar a manutenção e futuras expansões.

## 1. Visão Geral da Aplicação

A aplicação é um guia passo a passo para operadores de linha de produção. Suas principais características são:
- **Fluxo de Trabalho Sequencial:** O operador se identifica, seleciona um produto e segue as instruções de montagem.
- **Interface Mãos Livres:** Utiliza reconhecimento de voz contínuo para avançar entre os passos e Text-to-Speech (TTS) para ler as instruções em voz alta.
- **Gerenciamento de Produção:** Os dados de cada passo são extraídos de arquivos CSV associados a um produto.
- **Registro e Análise:** Todas as sessões de produção são registradas (logs), permitindo a consulta, filtragem e exportação de dados.
- **Resiliência:** A aplicação salva o progresso do operador, permitindo que ele continue de onde parou em caso de interrupções.

## 2. Estrutura de Pastas e Arquivos

A seguir, uma descrição detalhada de cada pasta e arquivo relevante no projeto.

---

### 📁 `/` (Raiz do Projeto)

Contém os arquivos de configuração globais do projeto.

- **`next.config.ts`**: Arquivo de configuração principal do Next.js.
- **`package.json`**: Define os scripts (`dev`, `build`, `start`), as dependências do projeto (React, Next.js) e as dependências de desenvolvimento (TypeScript, TailwindCSS, ESLint).
- **`tsconfig.json`**: Arquivo de configuração do TypeScript. Define as regras do compilador, como o alias `@/*` para o diretório `src`.
- **`postcss.config.mjs`** e **`tailwind.config.ts`**: Arquivos de configuração para o Tailwind CSS, o framework de estilização utilizado.
- **`eslint.config.mjs`**: Configuração do ESLint para garantir a qualidade e a padronização do código.
- **`MANUAL.md`**: Manual de usuário com instruções de instalação e uso da aplicação.

---

### 📁 `public/`

Armazena todos os ativos estáticos que são servidos publicamente.

- **`images/`**: Contém as imagens de referência para cada passo dos produtos. A estrutura é `public/products/<ID_DO_PRODUTO>/<NOME_DA_FOTO>.png`.
- **`data/`**: Armazena os arquivos CSV que definem os passos de cada produto. A estrutura é `public/data/<ID_DO_PRODUTO>.csv`.
- Outros arquivos como `logo-kh.png`, `next.svg`, etc., são ícones e logos usados na interface.

---

### 📁 `data/`

Diretório para armazenamento de dados gerados pela aplicação.

- **`logs/production-logs.json`**: Arquivo JSON onde são armazenados os logs de produção. Cada interação (início, fim, interrupção) é registrada aqui.

---

### 📁 `src/`

O coração da aplicação, contendo todo o código-fonte.

#### 📁 `src/app/`

Define as rotas e as páginas principais da aplicação, seguindo o padrão do App Router do Next.js.

- **`page.tsx`**: Componente principal que funciona como o orquestrador da aplicação. Ele gerencia o estado global (qual tela exibir: login do operador, seleção de produto ou guia de produção) e controla o fluxo de dados entre os componentes.
- **`layout.tsx`**: O layout raiz da aplicação. Define a estrutura HTML base, importa fontes e aplica estilos globais.
- **`globals.css`**: Arquivo de estilos globais e customizações do Tailwind CSS. Define a paleta de cores, fontes e animações padrão.

#### 📁 `src/components/`

Contém todos os componentes React reutilizáveis que formam a interface do usuário.

- **`OperatorInputAnimated.tsx`**: A tela inicial, onde o operador insere seu número de identificação.
- **`ProductSelectorAnimated.tsx`**: A tela de seleção de produtos, que busca os produtos disponíveis e os exibe como botões interativos.
- **`ProductionStepImproved.tsx`**: O componente mais complexo e central da aplicação. Ele exibe as instruções de um passo de produção, a imagem de referência, e gerencia a interação por voz (TTS e reconhecimento contínuo).
- **`Header.tsx`**: O cabeçalho exibido no topo da aplicação, mostrando informações contextuais como o progresso, dados do operador e botões de ação.
- **`LogsModal.tsx`**: Um pop-up (modal) que exibe a tabela de logs de produção, com funcionalidades de busca, filtro e download.
- **`DotGridBackground.tsx`**, **`KHLogo.tsx`**, **`StarBorderButton.tsx`**: Componentes de UI menores e reutilizáveis para criar um design consistente e visualmente agradável.
- **`ProductUploadModal.tsx`**: (Desativado) Um modal para criar novos produtos via upload de arquivos, indicando uma funcionalidade futura.

#### 📁 `src/hooks/`

Custom Hooks do React que encapsulam lógicas complexas e interações com APIs do navegador.

- **`useSpeechRecognition.ts`**: Hook para reconhecimento de voz "manual". Ativado por um clique, captura um único comando de voz.
- **`useContinuousSpeechRecognition.ts`**: Hook para reconhecimento de voz "mãos livres". Ouve continuamente o ambiente, compara com a resposta esperada e aciona a ação correspondente. É a principal tecnologia por trás da navegação por voz.
- **`useTextToSpeech.ts`**: Hook que utiliza a API de Síntese de Voz do navegador para ler textos em voz alta, como as instruções de cada passo.

#### 📁 `src/types/`

Define as interfaces TypeScript para as estruturas de dados usadas em toda a aplicação.

- **`ProductionLog.ts`**: Descreve a estrutura de um objeto de log de produção.
- **`Step.ts`**: Descreve a estrutura de um passo de produção, conforme lido do arquivo CSV.

#### 📁 `src/utils/`

Funções utilitárias que fornecem lógica de negócios e manipulação de dados.

- **`csvParser.ts`**: Funções para buscar e processar os arquivos CSV dos produtos. Ele se comunica com as APIs internas (`/api/products`) para obter os dados.
- **`checkpoint.ts`**: Implementa a funcionalidade de "salvar e continuar". Usa o `localStorage` do navegador para guardar o estado atual da produção, permitindo que o usuário retome o trabalho após recarregar a página.
- **`productionLogger.ts`**: Gerencia a criação, salvamento e recuperação dos logs de produção no arquivo `data/logs/production-logs.json` através de uma API interna.

---

## 3. Fluxo de Dados e Lógica

1.  **Início**: O `page.tsx` renderiza o `OperatorInputAnimated`.
2.  **Login**: Após o operador se identificar, o estado em `page.tsx` muda, e o `ProductSelectorAnimated` é renderizado.
3.  **Seleção de Produto**: O `ProductSelectorAnimated` busca a lista de produtos da API (`/api/products`). Quando um produto é selecionado, `page.tsx` chama `loadProductData` (de `csvParser.ts`) para carregar os passos do CSV correspondente.
4.  **Produção**: O estado muda para "production", e o `ProductionStepImproved` é renderizado com os dados do primeiro passo.
5.  **Interação por Voz**:
    - `useTextToSpeech` lê a instrução do campo `voz` do passo atual.
    - `useContinuousSpeechRecognition` começa a ouvir. Quando a `resposta` esperada é detectada, ele chama a função `onStepCompleted`.
6.  **Avanço**: `page.tsx` atualiza o índice do passo atual, o que faz com que `ProductionStepImproved` renderize o próximo passo. O progresso é salvo no `checkpoint`.
7.  **Logs**: A cada início, interrupção ou finalização, `page.tsx` envia uma requisição para a API (`/api/logs`) para registrar o evento no arquivo `production-logs.json`.
8.  **Finalização**: Ao completar o último passo, o processo é finalizado, o checkpoint é limpo, e o usuário retorna para a tela de seleção de produtos.

Esta estrutura modular e bem definida permite que cada parte da aplicação seja desenvolvida e mantida de forma independente, garantindo um código mais limpo e escalável.