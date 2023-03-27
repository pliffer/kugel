process.env.TZ = 'America/Sao_Paulo'

require('./boot/start')

let betterExpress = require('kugel-better-express');

betterExpress.router(router => {

    router.get('/', ({query}) => {

        return 'Hello World!';

    });

});
