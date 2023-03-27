# Kugel

Kugel é um framework em node.js, para a criação de aplicações modulares web. Ele é flexível para ser totalmente configurado pelos seus módulos, sendo os mesmos responsáveis por definir as rotas, os modelos de dados, as views e os controllers.

## Quickstart

Para iniciar a partir de um projeto pré configurado, clone o exemplo:

```
git clone git@github.com:pliffer/kugel-example.git
```

E após isso, instale as dependências, como em qualquer projeto node:

```
cd kugel-example
npm install
node .
```

## Instalação

Para instalar o Kugel, basta executar o seguinte comando:
```
npm install --save github:pliffer/kugel
```

Isso já basta para utilizar o Kugel, porém  para  ele funcione corretamente, é necessário instalar alguns módulos. Abaixo, um exemplo de servidor, com pug como template engine, kugel-server responsável configurar o o express e com o módulo kugel-better-express, que possui uma abstração do express, para ser mais simples e organizado.
```
npm install --save github:pliffer/kugel-better-express github:pliffer/kugel-server pug
```
Além disso, no seu package.json, deverá incluir o atributo kugel, com configurações adicionais:

```
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

### Modules

A propriedade `modules` guarda a ordem de carregamento, tanto individual quanto em fases. Não importa os nomes das propriedades, elas sempre irão carregar como estão organizadas, portanto, no exemplo acima, estamos dizendo que os módulos dentro de `core` serão carregados antes de `start`.

Assim como na ordem de carregamento, os modulos seguem o mesmo padrão, isto é, no exemplo acima, `kugel-better-express` carrega antes de `kugel-server`. Isso é importante para evitar bugs de dependência e outras inconveniências.

### Config
A propriedade config guarda as configurações do servidor, que serão interpretadas pelos módulos que as usa. No caso acima, estamos dizendo que o `kugel-server` usará "dev" para o parâmetro morgan, que é um utilitario para exibição dos logs quando há uma requisição.  Para desativar o morgan, basta não incluir essa propriedade, ou torna-la `false`.

Para saber sobre o uso de cada propriedade de config, confira a documentação individual de cada módulo.

## *Boilerplate* mínimo
Abaixo, um exemplo de uso dessa configuração mínima declarada acima:

```
const kugel = require('kugel');

kugel.init().then(() => {

	const betterExpress = require('kugel-better-express');

	betterExpress.router(router => {

		router.get('/', () => 'Hello World!');

	});

});
```

Veja a documentação de `kugel-better-express` para mais detalhes.

O código acima aguarda para que kugel inicie, e após isso, está disponível o uso de módulos kugel (que possuem uma chamada especial, mas também podem ser usados isoladamente, fora do kugel.

## Scripts `npm run`

Usamos os scripts para facilitar a criação dos módulos, mas não é obrigatório durante o desenvolvimento que criemos um módulo assim. Apenas é necessário seguir o padrão de desenvolvimento.
### $ `npm run create modulo`

Esse comando cria uma pasta dentro da pasta /modules do projeto atual, com o padrão de módulo kugel, isto é, com uma propriedade dentro, contendo kugel e sua versão.

### $ `npm run enable modulo`

Adiciona o módulo dentro do package.json em .kugel.modules.default, permitindo assim seu início automático.

### $ `npm run disable modulo`

Remove  o módulo dentro do package.json de qualquer passo de inicialização em .kugel.modules.

### $ `npm run deploy modulo`

Transfere a pasta `/modules/modulo` para `/node_modules/modulo`, tornando assim seu uso mais prático, através do `require('modulo')`;

Durante o desenvolvimento, recomenda-se o uso de `let modulo = require(process.env['modulo'])`, já que o kugel detecta se ele está em `/modules` ou `/node_modules` e adiciona a variável de ambiente, com o nome do módulo e também como: `process.env['module-modulo']` no caso do nome de algum módulo sobrescrever alguma propriedade anterior.

### $ `npm run undeploy modulo`

Transfere a pasta de um módulo nativo, em `/node_modules/modulo` para a pasta local de módulos, em `/modules/modulo`