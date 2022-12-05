Kugel é um framework ultra leve.

Instale usando `npm install git+https://github.com/pliffer/kugel.git`

Abaixo um simples boilerplate:

```
process.env.TZ = 'America/Sao_Paulo'

let kugel = require('kugel');

kugel.start().then(instance => {

	instance.app.onrouter(router => {

		router.get('/ola', () => {

			return Promise.resolve('mundo!');

		});

	});

});
```