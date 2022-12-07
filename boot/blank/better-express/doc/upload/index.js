process.env.TZ = 'America/Sao_Paulo'

let kugel = require('kugel');
let path  = require('path');

kugel.start().then(instance => {

	instance.app.onrouter(router => {

		router.upload.post('/file', (req, res) => {

			let filename = path.join(global.dir.storage, req.files.arquivo.md5 + '_' + req.files.arquivo.name);

			return req.files.arquivo.mv(filename).then(() => {

				return "Arquivo enviado com sucesso";

			});

		});

	});

});