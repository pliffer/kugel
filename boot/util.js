const inquirer = require('inquirer')
const request  = require('request')
const walkdir  = require('walkdir')
const forge    = require('node-forge')
const crc32    = require('crc').crc32
const uuid     = require('uuid').v4
const path     = require('path')
const pug      = require('pug')
const fs       = require('fs-extra')

exports.checkSpace = (percentage = 10) => {

    // @todo Verificar espaço que os arquivos gerados pelo app criam

}

exports.tree = (folderPath) => {

    return new Promise((resolve, reject) => {

        let files = [];

        let walk = walkdir(folderPath);

        walk.on('file', (asset) => {

            if(~asset.indexOf('node_modules')) return;

            files.push(asset.replace(folderPath, ''));

        });

        walk.on('folder', (asset) => {

            if(~asset.indexOf('node_modules')) return;

            files.push(asset.replace(folderPath, ''));

        });

        walk.on('end', () => {

            resolve(files);

        });

    });

}

exports.crc32 = (file) => {

    return fs.exists(file).then(exists => {

        if(!exists) return false;

        return fs.readFile(file, 'utf-8');

    }).then(data => {

        return crc32(data.toString());

    });

}

exports.generateKeyPairs = () => {

    global.dir.pem = path.join(global.dir.root, '.pem')

    fs.ensureDirSync(global.dir.pem)

    var privatePath = path.join(global.dir.pem, 'private.2048.pem')
    var publicPath  = path.join(global.dir.pem, 'public.2048.pem')

    var exists = fs.existsSync(privatePath) && fs.existsSync(publicPath)

    if(!exists){

        console.log("@installing".magenta + " Chave pública ou privada não encontrada")

        var keypair = forge.pki.rsa.generateKeyPair({
            bits: 2048,
            e: 0x10001
        });

        global.keys = {
            private: forge.pki.privateKeyToPem(keypair.privateKey),
            public:  forge.pki.publicKeyToPem(keypair.publicKey)
        }

        try{

            fs.writeFileSync(privatePath, global.keys.private, 'utf-8')
            fs.writeFileSync(publicPath,  global.keys.public,  'utf-8')

            console.log("@installing".magenta + " Chave pública e privada geradas com sucesso")

        } catch(e){

            console.log("@err".magenta + " Ocorreu um erro na geração das chaves rsa")

        }

    } else{

        global.keys = {}

        global.keys.private = fs.readFileSync(privatePath)
        global.keys.public  = fs.readFileSync(publicPath)

    }

}

exports.env = {

    generate(){

        console.error("\nO arquivo .env não está configurado. Responda as perguntas abaixo:\n".red)

        let questionList = [

            {
                name: 'APP_NAME',
                message: 'Qual o nome do aplicativo?'
            },

            {
                name: 'SUPPORT_MAIL',
                message: 'Qual o e-mail da equipe de suporte?'
            },

            {
                name: 'SECRET',
                message: 'Se você tivesse que inventar uma senha longa, qual seria?',
                default: uuid()
            },

            {
                name: 'PORT',
                message: 'Qual porta o aplicativo irá rodar?',
                default: 8080
            },

            {
                name: 'HOST',
                message: 'Qual o domínio que irá rodar?',
                default: 'localhost'
            },

            {
                name: 'PROTOCOL',
                message: 'Qual o protocolo?',
                type: 'list',
                choices: ["http", new inquirer.Separator(), "https"]
            }

        ];

        if(require('../package.json').kugel.config.database){

            questionList.push({
                name: 'MYSQL_HOST',
                message: 'Qual o host do mysql?',
                default: 'localhost'
            });

            questionList.push({
                name: 'MYSQL_USER',
                message: 'Qual o usuario do mysql?',
                default: 'root'
            });

            questionList.push({
                name: 'MYSQL_PASS',
                message: 'Qual a senha do mysql?',
                type: 'password'
            });

            questionList.push({
                name: 'MYSQL_DB',
                message: 'Qual o banco do mysql?'
            });

        }

        inquirer.prompt(questionList).then(answers => {

            let envData = "";
            
            Object.keys(answers).forEach(answerKey => {
                
                let answer = answers[answerKey];

                envData += answerKey + '=' + answer + "\n";

            });

            inquirer.prompt([
                {
                    name: 'confirm',
                    message: 'A configuração mostrada acima está ok?',
                    type: 'confirm'
                }
            ]).then(answer => {
                
                if(!answer.confirm) exports.env.generate();
                else{

                    require('fs').writeFile('.env', envData, "utf-8", (err) => {

                        if(!err) process.exit();
                        else{
                            throw err;
                        }

                    });

                }

            });

        });

    }

}

exports.jwt = {

    fetch(token, url, form){

        return new Promise((resolve, reject) => {

            request.post({

                url: `${process.env.ECAT_API}${url}`,
                form: form,
                headers: {
                    'x-access-token': token
                }

            }, (err, body, res) => {

                if(err) reject(err);
                else resolve(res);

            });

        });

    }

}

exports.cl = {

    setup(cl){

        cl.add('certbot', () => {

            console.log("Para gerar um novo certificado,\nDigite no terminal: sudo certbot certonly --apache -d", process.env.HOST)

        });

        cl.add('apache vhost', () => {

            fs.readFile('doc/auxiliar-files/default-apache-virtual-host', 'utf-8', (err, data) => {

                let virtualHost = data;

                virtualHost = virtualHost.replace('###domain###',  process.env.HOST);
                virtualHost = virtualHost.replace('###support###', process.env.SUPPORT_MAIL);
                virtualHost = virtualHost.replace('###port###',    process.env.PORT);

                fs.writeFile('doc/generated-files/' + process.env.HOST + '.conf', virtualHost, 'utf-8', (err) => {

                    if(err) throw err;

                    console.log('# ----------------');
                    console.log("");
                    console.log(virtualHost);
                    console.log("");
                    console.log('# ----------------');

                    console.log("");

                    console.log('Copie o texto acima em /etc/apache2/sites-enabled');

                    let command = 'sudo cp doc/generated-files/' + process.env.HOST + '.conf /etc/apache2/sites-enabled/' + process.env.HOST + '.conf';

                    console.log('ou digite o comando: $ ' + command.green);
                    console.log('E após, reinicie o apache: $', 'sudo service apache2 reload'.green);
                    console.log("");
                    console.log(`Certifique-se que o certificado está instalado em`.red, `/etc/letsencrypt/live/${process.env.HOST}/fullchain.pem`);

                    console.log("");

                });

            });

        });



    }

}

exports.f =  {

    removeItem: function(arr, item){

        for( var i = 0; i < arr.length; i++){ 
           if ( arr[i] === item) {
             arr.splice(i, 1); 
           }
        }

    }

}

exports.kugel = {

    loadConfig(){

        // Require configuration file
        global.config = require('./config')

        let loadPromises = []

        // Global constants
        global.vars = {}

        global.dir = {}
        global.dir.root    = __dirname
        global.dir.logs    = path.join(global.dir.root, '.logs')
        global.dir.app     = path.join(global.dir.root, 'app')
        global.dir.doc     = path.join(global.dir.root, 'doc')
        global.dir.modules = path.join(global.dir.root, 'modules')
        global.dir.models  = path.join(global.dir.app,  'models')
        global.dir.storage = path.join(global.dir.app,  'storage')
        global.dir.routes  = path.join(global.dir.app,  'routes')
        global.dir.data    = path.join(global.dir.app,  'data')

        if(global.config.dirsToEnsure){

            for(dirName in global.config.dirsToEnsure){

                global.config.dirsToEnsure[dirName].forEach(async folder => {

                    await fs.ensureDir(path.join(global.dir[dirName], folder))

                })

            }

        }

        return Promise.all(loadPromises)

    },

    loadModules(){

        let loadPromises = []

        global.modules = {}

        let modules = []

        // Vamos incluir os módulos de desenvolvimento, apenas se estivermos
        // em desenvolvimento
        if(global.config.state == 'development'){

            global.config.devModules.forEach(moduleName => modules.push(moduleName))

        }

        // Adiciona todos os módulos
        global.config.modules.forEach(moduleName => modules.push(moduleName))

        modules.forEach(moduleName => {

            loadPromises.push(module.exports.kugel.loadModule(moduleName))

        })

        if(global.config.compileViews){

            loadPromises.push(module.exports.kugel.compileViews())

        }

        return Promise.all(loadPromises)

    },

    loadModule(moduleName){

        console.log(`Vamos incluir o módulo ${moduleName}`)

        return Promise.resolve();

    },

    compileViews(){

        if(!global.config.compileViews) return;

        let compileViewsPath = path.join(global.dir.app, global.config.compileViews);

        let files   = [];
        let folders = [];

        return new Promise((resolve, reject) => {

            fs.ensureDirSync(compileViewsPath);

            let walk = walkdir(compileViewsPath);

            walk.on('file', (asset) => {

                let viewFolder = asset.replace(compileViewsPath, '').replace(path.basename(asset), '');

                // @todo Melhorar essa questão do \\ ou /, pois depende do sistema operacional
                if(viewFolder !== '\\' && viewFolder !== '/' && !folders.includes(viewFolder)){

                    folders.push(viewFolder);

                }

                files.push(asset);

            });

            walk.on('end', () => {

                resolve(files);

            });

        }).then(() => {

            let folderPromise = [];

            folders.forEach(folder => {

                let compiledFolder = path.join(global.dir.app, global.config.compiledViewsDest, folder);

                folderPromise.push(fs.ensureDir(compiledFolder));

            });

            return Promise.all(folderPromise);

        }).then(() => {

            let filePromise = [];

            files.forEach(file => {

                // @todo Entender os perigos na segurança que isso pode causar
                global.config.viewsOptions.require = require;
                global.config.viewsOptions.pretty  = true;

                let viewContent = pug.renderFile(file, global.config.viewsOptions);

                let viewFilename = file.replace(compileViewsPath, '');

                viewFilename = viewFilename.replace(path.extname(viewFilename), '.html');

                let compiledViewDest = path.join(global.dir.app, global.config.compiledViewsDest, viewFilename);

                filePromise.push(fs.writeFile(compiledViewDest, viewContent, 'utf-8'));

            });

            return Promise.all(filePromise);

        });

    }

}

global.util = module.exports;

