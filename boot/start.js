var path = require('path');

var startedAt = new Date()

console.log('@starting Iniciando 1/7 ' + startedAt.getHours() + 'h' + startedAt.getMinutes() + 'm' + startedAt.getSeconds() + 's (' + startedAt.getTime() + ')')

// Versão mínima da plataforma node que o sistema roda
var minNodeVersion = 7

var installOnly = process.argv.indexOf('--install-only') != -1;

var KUGEL_ROOT = path.resolve(__dirname, '../');
var ROOT = process.cwd();

var resolve;

var promise = new Promise((_resolve) => {

    resolve = _resolve;

});


// Inicia o sistema, vamos verificar a estrutura de pastas atuais
require('fs').readdir(ROOT, function(err, files){

    console.log('@starting Iniciando 2/7 (Analisando sistema local)')

    if(err) return console.error("KUGEL FATAL READ PERMISSION ERROR")

    var haveNodeModules = false
    var haveGit         = false
    var haveKugel       = false
    var haveOpenAPI     = false
    var havePackageJson = false

    var nodeVersion = Number(process.version.match(/^v(\d+\.\d+)/)[1])

    console.log('@starting Iniciando 3/7 (Dependencias e recomendações)')

    files.forEach(function(file){

        if(file === 'node_modules') haveNodeModules = true
        if(file === '.git')         haveGit         = true
        if(file === 'openapi.yaml') haveOpenAPI     = true
        if(file === 'package.json') havePackageJson = true

    })

    if(!haveGit){

        console.warn("\n@warning Fora de um projeto git")

    }

    if(nodeVersion < 7){

        console.log("\n@warning Versão node incompatível(v" + nodeVersion + "), atualize para 7 ou superior.")

    }

    if(!haveOpenAPI){

        console.log("\n@warning Não foi encontrado um arquivo de definição OpenAPI ($ blitz gen openapi)")

    }

    if(!haveNodeModules){

        console.log("\n@error Instale as dependências: npm install\n")
        process.exit()

    }

    if(!havePackageJson){

        console.log("\n@fatal Deve possuir o arquivo package.json\n")
        process.exit()

    }

    global.package = require(path.join(ROOT, './package.json'))

    if(typeof global.package.kugel == 'undefined'){

        console.log("@fatal O package.json deve possuir o atributo .kugel, exemplo: ")
        console.log(`
{
    "name": "app-corp",
    "version": "1.0.0",
    "description": "",
    "main": "appcorp.js",
    "author": "Pliffer",
    "license": "SEE IN LICENSE.md",
    "nodemonConfig": {
        "ignore": [
            "*assets*",
            "*modules*"
        ]
    },
    "kugel": {
        "modules": {
            "core": [
                "_kugel",
                "cl",
                "better-express"
            ],
            "startup": [
                "i18n"
            ],
            "start": [
                "socket.io",
                "shortcut"
            ]
        },
        "config": {
            "gzip": true,
            "morgan": true,
            "session": false,
            "socket": true,
            "cors": false,
            "assets": "assets",
            "views": "views",
            "template_engine": "pug",
            "body_parser": false,
            "jwt": false,
            "database": false,
            "modules": true,
            "state": "development",
            "compileViews": "views/public",
            "compiledViewsDest": "assets",
            "viewsOptions": {
                "pretty": true
            },
            "logo": "img/favicon.png",
            "theme_color": "#6de6ff",
            "background_color": "#efefef",
            "start_url": "/"
        }
    },
    "dependencies": {
    }
}
`)
        process.exit()

    }

    console.log('@starting Iniciando 4/7 (module)')

    // Load the env variables from .env file
    require('dotenv').config({path: ROOT + '/.env'})

    global.modules = {}

    var fs    = require('fs-extra')

    var kugel

    global.app = {

        // Status de cada estágio na inicialização do sistema
        loaded:  false,
        db:      false,
        started: false,

        // Funções que estão pendentes para rodar 
        loadList:  [],
        dbList:    [],
        startList: [],

        onload(f){

            if(global.app.loaded) return f()

            global.app.loadList.push(f)

        },

        ondb(f){

            if(global.app.db) return f()

            global.app.dbList.push(f)

        },

        onstart(f){

            if(global.app.started) return f()

            global.app.startList.push(f)

        },

        // Assim que o kugel for chamado
        load(){

            // Impede a lista de load ser carregada com mais itens
            global.app.loaded = true

            // Se houver itens na lista de load
            if(global.app.loadList.length){

                // Executa cada item da lista
                global.app.loadList.forEach(f => f())

                // Limpa a lista, só para o garbage colector agir
                global.app.loadList = []

            }

        },

        // Quando houver uma conexão com o banco de dados
        // @example Pode ser usado para verificar se existe um usuário administrador
        ondatabasestart(db){

            // Impede a adição na lista de db
            global.app.db = db

            // Se houver itens na lista de db
            if(global.app.dbList.length){

                // Executa cada item da lista
                global.app.dbList.forEach(f => f())

                // Limpa a lista, só para o garbage colector agir
                global.app.dbList = []

            }

        },

        // Assim que o express iniciar
        onstartserver(app){

            // Impede a adição de itens na lista de start
            global.app.start = true

            // Se houver itens na lista de start
            if(global.app.startList.length){

                // Executa cada item da lista
                global.app.startList.forEach(f => f())

                // Limpa a lista, só para o garbage colector agir
                global.app.startList = []

            }

            global.modules.module.getComponentStack('routing').forEach(routing => {

                routing(app);

            });

        }

    }

    console.log('Iniciando 5/7')

    // Global constants
    global.dir = {}

    global.vars       = {}
    global.helpers    = {}
    global.controller = {}

    global.dir.root    = ROOT
    global.dir.logs    = path.join(global.dir.root, '.logs')
    global.dir.app     = path.join(global.dir.root, 'app')
    global.dir.doc     = path.join(global.dir.root, 'doc')
    global.dir.modules = path.join(global.dir.root, 'modules')
    global.dir.boot    = path.join(KUGEL_ROOT, 'boot')

    require(path.join(global.dir.boot, 'util'))

    if(global.package.kugel.config.assets){

        global.dir.assets = path.join(global.dir.app, global.package.kugel.config.assets)

    }

    if(global.package.kugel.config.views){

        global.dir.views = path.join(global.dir.app, global.package.kugel.config.views)

    }

    global.dir.models      = path.join(global.dir.app,  'models')
    global.dir.storage     = path.join(global.dir.app,  'storage')

    global.dir.routes      = path.join(global.dir.app,  'routes')
    global.dir.controllers = path.join(global.dir.app,  'controllers')
    global.dir.data        = path.join(global.dir.app,  'data')

    if(typeof process.env.MODULES_PATH == 'undefined'){

        console.log("\n@error Defina o caminho de MODULES_PATH para ativar os módulos\n")
        process.env.MODULES_PATH = path.join(__dirname, 'blank')

        global.package.kugel.config.modules = false;

    }

    global.modules.module = require('./module.js')

    if(!global.package.kugel.modules)            global.package.kugel.modules            = []
    if(!global.package.kugel.modules.core)       global.package.kugel.modules.core       = []
    if(!global.package.kugel.modules.startup)    global.package.kugel.modules.startup    = []
    if(!global.package.kugel.modules.lightstart) global.package.kugel.modules.lightstart = []
    if(!global.package.kugel.modules.start)      global.package.kugel.modules.start      = []

    global.helpers.f      = require(path.join(global.dir.boot, 'f'))
    global.helpers.vars   = require(path.join(global.dir.boot, 'vars'))
    global.helpers.util   = require(path.join(global.dir.boot, 'util'))
    global.helpers.export = require(path.join(global.dir.boot, 'export'))

    return global.modules.module.verifyModules(global.package.kugel.modules).then(() => {

        return global.modules.module.loadModules(global.package.kugel.modules.core, 'core');

    }).then(() => {

        console.log('Iniciando 6/7 (Kugel)')

        kugel = require('./kugel')

        return global.modules.module.loadModules(global.package.kugel.modules.startup, 'startup')

    }).then(function(){

        return global.modules.module.loadModules(global.package.kugel.modules.lightstart, 'lightstart')

    }).then(function(){

        if(typeof kugel.lightstart !== 'undefined'){

            if(installOnly){

                kugel.lightstart = function(f){
                    f();
                }

                kugel.finalstart = function(f){
                    f();
                }

            }

            return kugel.lightstart(() => {

                console.log('Iniciando 7/7')

                return global.modules.module.loadModules(global.package.kugel.modules.start, 'start')

            })

        }

    }).then(global.modules.module.onload).then(() => {

        if(typeof kugel.finalstart !== 'undefined'){

            return kugel.finalstart(() => {

                var at = new Date()

                console.log("\n" + '@started'.white.bgGreen + ' at ' + at.getHours() + 'h' + at.getMinutes() + 'm' + at.getSeconds() + 's (' + at.getTime() + ")\n")

                resolve();

                if(installOnly) process.exit();

            });

        }

    });

})

module.exports = promise;