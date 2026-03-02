# Arquitetura de Dados e Fluxo Lógico

Este documento detalha como a aplicação utiliza a estrutura de pastas e arquivos para construir dinamicamente a experiência do guia de produção. 

### A Lógica Central: Tudo é Guiado pelos Arquivos

A aplicação é inteiramente **data-driven** (guiada por dados). Ela não possui lógica de produção "hardcoded" (fixa no código). Em vez disso, ela lê os arquivos e pastas que você fornece para construir a experiência do usuário dinamicamente.

Um **"Produto"** para a aplicação é simplesmente um conjunto de arquivos que seguem uma convenção de nomes:

1.  Um arquivo CSV em `public/data/` (ex: `public/data/10093.csv`).
2.  Uma pasta correspondente em `public/products/` (ex: `public/products/10093/`) que contém as imagens.

---

### 1. Como a Foto é Recebida e Exibida?

A exibição da imagem de referência em cada passo segue um fluxo claro, desde o arquivo CSV até a tela do usuário.

**Fonte da Verdade:** A coluna `fotos` no arquivo CSV do produto.

**O Fluxo:**

1.  **Definição no CSV**: No arquivo `public/data/10093.csv`, cada linha (que representa um passo) tem uma coluna `fotos`. O valor nesta coluna é o nome do arquivo de imagem para aquele passo (ex: `P1.png`).

2.  **Carregamento dos Dados**: Quando o operador seleciona o produto "10093", a aplicação faz uma chamada à sua API interna, que lê o arquivo `10093.csv` e o transforma em um objeto de dados estruturado.

3.  **Passando a Informação**: Este objeto, contendo todos os passos, é enviado para o componente principal da produção, o `ProductionStepImproved.tsx`. Para o passo 1, o componente recebe um objeto `step` que contém a propriedade `fotos: 'P1.png'`.

4.  **Construção do Caminho da Imagem**: Dentro do componente, o código usa essa informação para montar dinamicamente o caminho (URL) da imagem. A lógica é a seguinte:
    ```javascript
    const caminhoDaImagem = `/products/${productId}/${step.fotos}`;
    ```
    Para o nosso exemplo, isso resulta na string: `/products/10093/P1.png`.

5.  **Exibição na Tela**: Este caminho é então usado no componente `<Image>` do Next.js. O navegador solicita essa URL, e o Next.js, por padrão, serve os arquivos da pasta `public`. Assim, ele localiza e exibe a imagem que está em `public/products/10093/P1.png`.

**Em resumo: O CSV diz o *nome* da foto, e o código usa esse nome para encontrar o arquivo na pasta correspondente do produto.**

---

### 2. O que a IA "Fala"?

O processo para a fala da IA é quase idêntico ao da foto, mas usa uma coluna diferente do CSV.

**Fonte da Verdade:** A coluna `voz` no arquivo CSV do produto.

**O Fluxo:**

1.  **Definição no CSV**: Cada passo no CSV tem uma coluna `voz` que contém o texto exato que a IA deve falar. Ex: `"Clipado y cable por pasamuros"`.

2.  **Carregamento dos Dados**: Assim como a foto, o texto da coluna `voz` é carregado e enviado para o componente `ProductionStepImproved.tsx` como parte do objeto `step`.

3.  **Acionando a Fala**: Dentro do componente, um `useEffect` monitora as mudanças no passo atual. Quando um novo passo é carregado, ele aciona o hook `useTextToSpeech`.

4.  **Execução da Fala**: O código chama a função `speak()` do hook, passando o texto do passo atual:
    ```javascript
    speak(step.voz);
    ```

5.  **Conversão para Áudio**: O hook `useTextToSpeech` utiliza a API de Síntese de Voz (`SpeechSynthesis`) do navegador para converter a string de texto `"Clipado y cable por pasamuros"` em áudio, que é então reproduzido nos alto-falantes.

**Em resumo: O CSV dita exatamente *o que* a IA deve dizer em cada etapa.**

---

### 3. Como a Aplicação Usa os Dados das Pastas (Visão Geral)?

Esta é a visão geral que conecta tudo.

1.  **Descoberta de Produtos**: A aplicação não sabe quais produtos existem de antemão. A tela de seleção de produtos (`ProductSelectorAnimated`) faz uma chamada a uma API que simplesmente escaneia a pasta `public/data/` em busca de todos os arquivos `.csv`. Os nomes desses arquivos (ex: `00610`, `03411`) são retornados e exibidos como a lista de produtos disponíveis.

2.  **Carregamento do Guia**: Quando o operador clica em um produto, a aplicação usa o ID daquele produto para buscar o guia completo. Ela chama a API, que:
    a. Lê o conteúdo do arquivo CSV correspondente (`public/data/[ID_DO_PRODUTO].csv`).
    b. Analisa o texto do CSV, transformando cada linha em um objeto `Step` estruturado (com `paso`, `tipo`, `mensaje`, `voz`, `respuesta`, `fotos`).
    c. Envia essa lista de objetos `Step` para o frontend.

3.  **Execução do Guia**: O frontend (`page.tsx`) armazena essa lista de passos em seu estado. Ele funciona como um "ponteiro", começando no `passo 0`.
    a. Ele pega o primeiro objeto `Step` da lista e o entrega ao componente `ProductionStepImproved`.
    b. O `ProductionStepImproved` usa os dados desse objeto para:
        - Exibir a mensagem (`step.mensaje`).
        - Exibir a foto (`step.fotos`).
        - Falar a instrução (`step.voz`).
        - Ouvir a resposta esperada (`step.respuesta`).
    c. Quando a resposta correta é ouvida, ele notifica o `page.tsx`, que simplesmente avança o "ponteiro" para o próximo passo (`passo 1`) e repete o processo.

**Conclusão Final:** A aplicação é um motor genérico. Toda a inteligência, fluxo e conteúdo de um guia de produção não estão no código, mas sim na estrutura de pastas e no conteúdo dos arquivos CSV. Para criar um guia de produção completamente novo, você não precisa escrever uma linha de código; basta adicionar um novo CSV e uma nova pasta de imagens.