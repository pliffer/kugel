# Kugel: Documentação

O Kugel é um framework Node.js desenvolvido para fornecer um ambiente modular e fácil de usar para construção de aplicações web. Ele tem como objetivo facilitar a criação de projetos, acelerar o desenvolvimento e fornecer uma estrutura flexível e fácil de entender. Neste documento, você encontrará uma descrição detalhada das características do framework, bem como exemplos e informações sobre como utilizá-lo.

## Instalação e configuração

Para começar a usar o Kugel, você precisará instalar o pacote através do NPM:

```
npm install --save github:pliffer/kugel
```

### Configuração do projeto

Além de instalar o pacote Kugel, você também precisará configurar o arquivo `package.json` do seu projeto. Nele, deverá incluir o atributo `kugel`, que contém as configurações adicionais necessárias para o framework.

Exemplo de `package.json`:
```JSON
"kugel": {
    "modules": {
        "core": [
            "kugel-better-express",
            "kugel-server"
        ],
        "start": []
    },
    "config": {
        "gzip": false,
        "morgan": "dev",
        "cors": false,
        "upload": false,
        "template_engine": "pug",
        "body_parser": true,
        "openapi": false,
        "modules": true,
        "state": "development"
    }
}
```

#### Módulos

A propriedade `modules` guarda a ordem de carregamento dos módulos, tanto de maneira individual quanto em etapas distintas. Não importa os nomes das propriedades, elas sempre seguirão a ordem em que são definidas no arquivo. No exemplo acima, os módulos `kugel-better-express` e `kugel-server` estão sendo carregados na etapa `core`, que acontecerá antes da etapa `start`.

A ordem de carregamento dos módulos é importante para evitar problemas de dependências e outras inconveniências. Pode-se utilizar a divisão das etapas para dividir o processo de boot do projeto.

### Módulos do Kugel

Os módulos no Kugel são pacotes que adicionam funcionalidades específicas ao seu projeto, tais como rotas, views, models etc. Esses módulos podem ser desenvolvidos como pacotes Node.js independentes ou como partes do seu projeto e podem ser facilmente reutilizados e compartilhados entre diferentes aplicações. Aqui, explicaremos como criar e utilizar módulos no Kugel seguindo o exemplo de código compartilhado anteriormente.

#### Criando um módulo

Para criar um módulo, primeiro você precisa criar uma pasta com o nome do seu módulo na raiz do seu projeto. Dentro dessa pasta, você deve criar um arquivo `package.json` com as informações relevantes para o seu módulo, como nome, versão, descrição e dependências. Além disso, é necessário incluir a propriedade `kugel` no arquivo `package.json` para que o Kugel possa identificar e utilizar o módulo corretamente.

Em ambiente fechado, recomenda-se o uso de pacotes armazenados em repositório. Por exemplo, na utilização do github, podemos instalar (tendo as credenciais devidamente configuradas) usando o comando:

```
npm install --save github:pliffer/kugel-better-express
```

Isso é equivalente a usar git clone e depois npm install na pasta do projeto, tornando o processo de desenvolvimento mais simples. Alem disso, podemos usar npm update para atualizar todos os pacotes, incluindo os que estão no github.

Atenção para o versionamento do pacote. O npm não atualiza automaticamente o pacote quando o repositório é atualizado. Para isso, é necessário alterar a versão do pacote no package.json.

Aqui está um exemplo de `package.json` para um módulo chamado `meu-modulo`:

```JSON
{
    "name": "meu-modulo",
    "version": "1.0.0",
    "description": "Descrição do meu módulo",
    "main": "index.js",
    "kugel": {
    },
    "dependencies": {}
}
```

Neste exemplo, a propriedade `kugel` contem informações de configuração do módulo.

Além do `package.json`, é necessário criar o arquivo principal do módulo, que geralmente é nomeado `index.js`. Neste arquivo, você pode definir todas as funcionalidades e lógicas do módulo e exportar as partes necessárias para serem utilizadas pelo Kugel.

#### Utilizando um módulo

Para utilizar o módulo criado, você deve primeiro adicionar a referência do módulo na propriedade `modules` do `package.json` da sua aplicação. Por exemplo, se você criou um módulo chamado `meu-modulo`, você pode adicionar uma nova etapa de módulos chamada `custom` no `package.json` da sua aplicação da seguinte maneira:

```JSON
"kugel": {
    "modules": {
        "core": [
            "kugel-better-express",
            "kugel-server"
        ],
        "custom": [
            "meu-modulo"
        ],
        "start": []
    },
    "config": {
        // suas configurações (consulte a seção "Configurações" para mais detalhes)
    }
}
```

Agora que o módulo está registrado no arquivo `package.json` da sua aplicação, ele será carregado durante a inicialização do Kugel na etapa `custom`. Para utilizar as funcionalidades do módulo na sua aplicação, você deve importá-lo usando o método `require()`. Por exemplo, você pode importar o módulo `meu-modulo` da seguinte forma:

```JavaScript
const meuModulo = require('meu-modulo');
```

Com o módulo importado, você pode acessar suas funções e classes expostas e utilizá-las na sua aplicação conforme necessário.

#### Desenvolvendo e testando módulos localmente

Durante o desenvolvimento do módulo, você pode mantê-lo na pasta `/modules` do seu projeto e trabalhar diretamente nesse diretório. Isso simplifica o processo de depuração e teste do módulo.

Para utilizar um módulo que está sendo desenvolvido localmente, basta alterar a propriedade `modules` do `package.json` da sua aplicação para apontar para o caminho completo do módulo local:

```JSON
"kugel": {
    "modules": {
        "core": [
            "kugel-better-express",
            "kugel-server"
        ],
        "custom": [
            "/home/user/projeto/modules/meu-modulo"
        ],
        "start": []
    },
    "config": {
        // suas configurações
    }
}
```

Neste exemplo, a etapa `custom` foi atualizada para apontar para o módulo `meu-modulo` que está sendo desenvolvido na pasta `/modules` do projeto.

Ao concluir o desenvolvimento do módulo, você pode publicá-lo como um pacote npm e atualizar a propriedade `modules` do `package.json` da sua aplicação com o nome sem o caminho para utilizar o pacote publicado.

#### Configurações

A seção `config` do atributo `kugel` armazena as configurações do servidor, que são interpretadas pelos módulos adequadamente. No exemplo acima, estamos informando ao `kugel-server` para usar "dev" como parâmetro para o Morgan, um utilitário que exibe logs das requisições. Para desativar essa funcionalidade, basta remover a propriedade ou definir seu valor como `false`.

Para saber mais sobre o uso de cada propriedade de configuração, consulte a documentação de cada módulo.

## Utilização do Kugel

Um exemplo mínimo de uso do Kugel pode ser encontrado abaixo:

```JavaScript
const kugel = require('kugel');

kugel.init().then(() => {

    const betterExpress = require('kugel-better-express');

    betterExpress.router(router => {

        router.get('/', () => 'Hello World!');

    });

});
```

Neste exemplo, a função `kugel.init()` é chamada para iniciar o Kugel. Após a inicialização, são feitas requisições aos módulos (neste caso, o `kugel-better-express`) e são realizadas as configurações adequadas.

### Componentes

O `kugel.Component` é um recurso poderoso e flexível do Kugel que permite o gerenciamento e compartilhamento de diferentes partes da sua aplicação de uma maneira organizada e modular. Isso torna mais fácil para os desenvolvedores adicionar, estender e modificar componentes conforme necessário, sem afetar outras partes do projeto.

Aqui estão alguns exemplos de usos do `kugel.Component` e as razões pelas quais são interessantes:

### 1. Componente para gerenciar rotas

Você pode criar um componente para gerenciar suas rotas e agrupá-las de maneira organizada. Isso é útil porque permite que os desenvolvedores modifiquem facilmente a ordem, adicione ou removam rotas sem criar conflitos com o restante do código.

```javascript
const kugel = require('kugel');
const routesComponent = new kugel.Component('routes');

// Adicionando rotas ao componente
routesComponent.add({ path: '/', action: (req, res) => res.send('Home Page') });
routesComponent.add({ path: '/about', action: (req, res) => res.send('About Page') });

// Usando o componente para registrar as rotas no servidor Express
const express = require('express');
const app = express();

kugel.init().then(() => {
    routesComponent.stack.forEach((route) => {
        app.get(route.path, route.action);
    });
});
```

### 2. Componente para armazenar configurações

Um componente de configuração é útil para compartilhar e gerenciar facilmente diferentes configurações do seu aplicativo, como variáveis de ambiente, informações de banco de dados e outras preferências.

```javascript
const kugel = require('kugel');
const configComponent = new kugel.Component('config');

// Adicionando configurações ao componente
configComponent.add({ env: process.env.NODE_ENV || 'development' });
configComponent.add({ dbName: 'myDatabase' });

// Recuperar as configurações do componente
const config = {};
configComponent.stack.forEach((configItem) => {
    Object.assign(config, configItem);
});

console.log(config); // { env: 'development', dbName: 'myDatabase' }
```

Em qualquer parte do seu código, você pode recuperar as configurações do componente e usá-las como quiser.

```javascript
const kugel = require('kugel');
const Component = kugel.Component;

const configComponent = new Component('config');

// Recuperar as configurações do componente
const config = configComponent.stack.reduce((config, configItem) => {
	return Object.assign(config, configItem);
}, {});

console.log(config);

```

### 3. Componente para gerenciar middlewares

Você pode criar um componente para gerenciar os middlewares do servidor Express, permitindo o controle fácil da ordem em que os middlewares são usados e a capacidade de adicionar ou remover middlewares conforme necessário.

```javascript
const kugel = require('kugel');
const middlewareComponent = new kugel.Component('middlewares');

// Adicionando middlewares ao componente
middlewareComponent.add((req, res, next) => {
    console.log(`Request to: ${req.path}`);
    next();
});

middlewareComponent.add((req, res, next) => {
    // Adicione aqui sua lógica de autenticação ou autorização
    next();
});

// Usando o componente para registrar os middlewares no servidor Express
const express = require('express');
const app = express();

kugel.init().then(() => {
    middlewareComponent.stack.forEach((middleware) => {
        app.use(middleware);
    });
});
```

Em resumo, usar o `kugel.Component` permite um gerenciamento eficiente e organizado de várias partes da sua aplicação, facilitando a extensibilidade, manutenção e escalabilidade do projeto.

## Repositórios Exemplos

```
npm install --save github:pliffer/kugel-example-2
```