require('colors');

const inquirer = require('inquirer');
const opn      = require('opn');

const Logs = global.logs;
const Util = global.util;

let Cl = {

    init(p){

        p.stdin.setEncoding('utf8')
        p.stdin.on('data', Cl.execute)

    },

    execute(data){

        return new Promise((resolve, reject) => {

            data = data.replace(/\n/g, '').trim();

            if(!data) return;

            // Linha em branco
            console.log("");

            if(Cl.commands && Cl.commands[data] && (typeof Cl.commands[data].f === 'function')){

                resolve(Cl.commands[data].f(Cl.config));

            } else if(Cl.commands && Cl.commands[data] && (typeof Cl.commands[data] === 'function')){

                resolve(Cl.commands[data](Cl.config));

            } else{

                let flagFound = false;

                Object.keys(Cl.jocker).forEach(jocker => {

                    let subData = data.substr(0, jocker.indexOf('?'));

                    if(jocker.substr(0, jocker.indexOf('?')) == subData){

                        resolve(Cl.jocker[jocker].f(data.substr(jocker.indexOf('?'))));

                        flagFound = true;

                    }

                });

                if(!flagFound){

                    const clFilename = __filename.replace(__dirname, '');

                    console.log(`Comando não encontrado, para criar, edite o arquivo ${clFilename}`.red);

                }

            }

        });

    },

    addModule(name, mod){

        Object.keys(mod).forEach(item => {

            module.exports.add(name + '.' + item, () => {

                let ret = mod[item]();

                if(!ret) return console.log(name.magenta + '.' + item.red + ' não possui retorno');

                if(ret.then){

                    ret.then(result => {

                        console.log(result);

                    });

                } else{

                    console.log(ret);

                }

            });

        });

    },

    add(command, f, description){

        if(~command.indexOf('?')){

            Cl.jocker[command] = {
                f: f,
                description: description
            };

        } else{

            Cl.commands[command] = {
                f: f,
                description: description
            };

        }
    },

    list(){

        Object.keys(Cl.commands).sort().forEach((cmd, k) => {

            let description = '';

            if(Cl.commands[cmd].description) description = '('.yellow + Cl.commands[cmd].description.yellow + ')'.yellow;

            console.log(`${k}.`.red + ` ${cmd}${description}`);

        });

        Object.keys(Cl.jocker).sort().forEach((cmd, k) => {

            console.log(`${k}.`.red + ` ${cmd}`);

        });

    },

    config: {},

    jocker: {},

    commands: {

        'verbose'(){

            if(typeof process.env.VERBOSE === 'undefined'){

                process.env.VERBOSE = "true";

            }

            if(process.env.VERBOSE.toString() == "false"){

                process.env.VERBOSE = "true";
                console.log('Verbose ativado(' + process.env.VERBOSE + ')');

            } else{

                process.env.VERBOSE = "false";
                console.log('Verbose desativado(' + process.env.VERBOSE + ')');

            }

        },

        'create fake error'(){

            Logs.save('fake error', 'testing');

        },

        env(){

            console.log(process.env);

        },

        vars(){

            console.log(global.vars)

        },

        checkspace(){

            Util.checkSpace();

        },

        'sync report'(){

            global.sync.report();

        },

        'emit logs'(){

            Logs.sendYesterdayToLunastro();

        },

        // Não vamos interferir no nodemon
        rs(){},

        'list commands'(){

            Cl.list();

        },

        'commands'(){

            Cl.list();

        },

        'help'(){

            Cl.list();

        },

    }

}

module.exports = Cl;
global.cl = Cl;

