# Contexto da Inteligência Artificial no Guia de Produção

Este documento é destinado a desenvolvedores e colaboradores que estão tendo o primeiro contato com o projeto. Ele explica o papel, o funcionamento e a implementação do que chamamos de "IA" nesta aplicação.

## 1. Qual é o Papel da "IA"?

A "Inteligência Artificial" neste projeto não é um modelo de machine learning complexo ou uma rede neural, mas sim uma **Interface de Usuário por Voz (Voice User Interface - VUI)**.

O seu principal objetivo é permitir que o operador da linha de produção execute suas tarefas de montagem com as **mãos livres**, sem a necessidade de interagir com um teclado ou mouse.

Isso é alcançado através de duas funcionalidades principais:

1.  **Text-to-Speech (A IA "Falando")**: A aplicação lê em voz alta as instruções de cada passo para o operador.
2.  **Speech-to-Text (A IA "Ouvindo")**: A aplicação ouve continuamente o operador e, ao detectar uma palavra-chave específica (a "resposta esperada"), avança automaticamente para o próximo passo.

Em resumo, a IA atua como um assistente virtual que guia e reage à voz do operador.

## 2. Como Funciona o Fluxo de Voz?

O ciclo de interação por voz em cada etapa de produção (`ProductionStep`) funciona da seguinte maneira:

1.  **Início do Passo**: O componente `ProductionStepImproved` é renderizado com os dados do passo atual.
2.  **A IA Fala**: O hook `useTextToSpeech` é acionado e lê o texto da coluna `voz` do arquivo CSV correspondente. Por exemplo: "Clipado y cable por pasamuros".
3.  **A IA Ouve**: Imediatamente após (ou durante), o hook `useContinuousSpeechRecognition` é ativado e começa a ouvir o ambiente em busca da palavra-chave definida na coluna `respuesta` do CSV. Por exemplo: "PIN BUENO".
4.  **Detecção e Ação**: Quando o hook detecta a resposta correta, ele aciona uma função de callback (`onMatch`).
5.  **Avanço de Etapa**: Essa função, por sua vez, informa ao componente principal (`page.tsx`) que o passo foi concluído, e a aplicação avança para a próxima etapa.

Este ciclo se repete para cada passo do tipo "VOZ", criando uma experiência de usuário fluida e sem interrupções manuais.

## 3. Principais Arquivos Envolvidos

Para entender e dar manutenção na funcionalidade de voz, foque nos seguintes arquivos:

-   **`src/hooks/useTextToSpeech.ts`**: Hook responsável por fazer a aplicação "falar". Ele utiliza a API de Síntese de Voz (`SpeechSynthesis`) do navegador.

-   **`src/hooks/useContinuousSpeechRecognition.ts`**: O coração da funcionalidade de "ouvir". Utiliza a API de Reconhecimento de Voz (`SpeechRecognition`) do navegador para capturar o áudio continuamente, processá-lo e verificar se corresponde à resposta esperada.

-   **`src/components/ProductionStepImproved.tsx`**: O componente de UI que integra os dois hooks acima. Ele orquestra a interação, exibindo as informações na tela e gerenciando o estado da comunicação por voz.

-   **`public/data/[id_do_produto].csv`**: O "cérebro" de cada guia de produção. As colunas **`voz`** e **`respuesta`** neste arquivo ditam o que a IA fala e o que ela espera ouvir para avançar.

## 4. Como Modificar ou Depurar

-   **Para alterar o que a IA diz**: Modifique o texto na coluna `voz` no arquivo CSV do produto desejado.

-   **Para alterar a resposta que a IA espera**: Modifique o texto na coluna `respuesta` no arquivo CSV. O sistema de reconhecimento é flexível e aceita correspondências parciais (ex: ouvir "pin bueno" quando se espera "PIN BUENO").

-   **Para depurar (debug)**: Abra o console do desenvolvedor no navegador (`F12`). Os hooks de voz foram programados para registrar suas ações em tempo real (ex: `"Listening started"`, `"Heard: [texto]"`, `"Match found!"`). Isso é extremamente útil para diagnosticar por que um comando de voz pode não estar sendo reconhecido.
