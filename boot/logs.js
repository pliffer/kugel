const schedule = require("node-schedule");
const request  = require('request');
const spawn    = require('child_process').spawn;
const path     = require('path');
const fs       = require('fs-extra');
const os       = require('os');

if(global && global.master){

    console.log('The global master is: ', global.master);

}

if(!process.env.LUNASTRO_HOST || !process.env.LUNASTRO_LOGS){

    var warn = '@warn logs.js'.red;

    if(!warn) warn = '@warn logs.js';

    console.log("\n");
    console.log(warn);
    if(!process.env.LUNASTRO_HOST) console.log('@logs LUNASTRO_HOST is not defined');
    if(!process.env.LUNASTRO_LOGS) console.log('@logs LUNASTRO_LOGS is not defined');
    console.log("\n");

}

const Logs = {

    path: '',

    log(){

        if(process.env.VERBOSE == 'true'){

            console.log.apply(null, arguments);

        } else{

            Logs.save('console.log verbose silenced', {
                args: arguments
            });

        }

    },

    helpers: {

        months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],        

        simpleDate(unixtime){

            if(typeof unixtime === 'undefined') unixtime = new Date().getTime();

            var date = new Date(unixtime);

            var year  = date.getFullYear();
            var month = date.getMonth() + 1;
            var day   = date.getDate();

            if(month < 10){
                month = '0' + month;
            }

            if(day < 10){
                day = '0' + day;
            }

            return year + '-' + month + '-' + day;

        }

    },

    /*
    * @description Assegura que todas as pastas necessárias estão criadas
    */
    init(logPath){

        // Caso uma pasta esteja especificada
        if(typeof logPath !== 'undefined') Logs.path = logPath;
        else if(!Logs.path) Logs.path = global.dir.logs;

        var date = new Date();

        var year = date.getFullYear().toString();

        var month = Logs.helpers.months[date.getMonth()].toLowerCase();

        var day = date.getDate().toString();

        var dayPath = path.join(Logs.path, year, month, day);

        fs.ensureDirSync(path.join(Logs.path, year));
        fs.ensureDirSync(path.join(Logs.path, year, month));
        fs.ensureDirSync(path.join(Logs.path, 'review'));
        fs.ensureDirSync(path.join(Logs.path, 'reviwed'));

        fs.ensureDirSync(dayPath);

        return dayPath;

    },

    yesterdayLogsPath(){

        var date = new Date();

        date.setDate(date.getDate() - 1);

        var year = date.getFullYear().toString();

        var month = Logs.helpers.months[date.getMonth()].toLowerCase();

        var day = date.getDate().toString();

        return path.join(Logs.path, year, month, day);

    },

    appendHeader(filename){

        return new Promise((resolve, reject) => {

            var header = process.env.APP_NAME + " - log file (" + process.env.APP_NAME + " engine)\n";

            fs.appendFile(filename, header, err => {

                if(err) reject(err);
                else resolve();

            });

        });

    },

    append(filename, data){

        var localeDate = '[' + new Date().toLocaleString() + '] ';

        var data = "\r\n" + localeDate + data + "\n";

        return new Promise((resolve, reject) => {

            fs.appendFile(filename, data, err => {

                if(err) reject(err);
                else resolve(new Date().toLocaleString());

            });

        });

    },

    initFile(filename){

        return fs.pathExists(filename).then(exists => {

            if(!exists){

                return fs.ensureFile(filename).then(() => {

                    return Logs.appendHeader(filename);

                });

            }

        })

    },

    parseFile(logData){

        // Divide um arquivo de log em seus itens inseridos
        let list = logData.split(/\n\r\n^\[[0-9]+-[0-9]+-[0-9]+\s[0-9]+:[0-9]+:[0-9]+\]\s/gm);

        // Array que guardará cada item
        let arr  = [];

        // Para cada item contido no arquivo
        list.forEach((item, k) => {

            // Ignora o header(log init)
            if(k == 0) return;

            // Remove espaços desnecessários na hora de parsear o json
            item = item.trim();

            // Usamos o try, pois nem sempre será um json bem sucedido
            try{

                let jsonItem = JSON.parse(item);

                // Caso seja bem sucedido, vamos salvar no arr
                arr.push(jsonItem);

            } catch(e){



            }

        });

        // Retorna a lista de itens que estavam contidos no arquivo
        return arr;

    },

    getFile(label){

        var dayFile = Logs.init();

        var filename = path.join(dayFile, label + '.log');

        return fs.readFile(filename, 'utf-8');

    },

    getParsed(label){

        return Logs.getFile(label).then(logData => {

            return Logs.parseFile(logData);

        });

    },

    // Salva o que está diferente a partir do final do log do dia
    // @param begin (top|bottom)
    saveDiff(label, data, priority, begin = 'top'){

        return Logs.getParsed(label).then(parsed => {

            let aimItem = parsed[0];

            if(begin == 'bottom'){

                aimItem = parsed[parsed.length - 1];

            }

            Object.keys(aimItem).forEach(key => {

                if(JSON.stringify(data[key]) == JSON.stringify(aimItem[key])){

                    delete data[key];

                }

            });

            return Logs.save(label, data, priority);

        });

    },

    watchers: [],

    save(label, data, priority = 0){

        var dayFile = Logs.init();
        var needReview = false;

        if(priority > 15){

            needReview = true;

        }

        if(global.master){

            label = global.master + '.' + label;

        }

        var filename = path.join(dayFile, label + '.log');

        if(typeof data == 'object'){

            if(data._needReview){
                needReview = true;
            }

            data = JSON.stringify(data);
        }

        // Se certifica que o arquivo já foi iniciado
        Logs.initFile(filename).then(() => {

            if(needReview){

                var reviewPath = path.join(Logs.path, 'review', new Date().getTime() + '.' + label + '.json');

                fs.writeJson(reviewPath, data);

            }

            Logs.append(filename, data.toString()).then(when => {

                if(priority > 0){

                    console.log(`\n Logs.save [${when}] ->${label}`.bgGreen + "\n");

                    if(process.env.VERBOSE){

                        console.log(data.bgRed);

                    }

                }

            });

        });

        module.exports.watchers.forEach(f => {

            f(label, data, priority);

        });

        Logs.notify(label, data, priority);

    },

    addWatcher(f){

        module.exports.watchers.push(f);

    },

    notify(label, data, priority){

        if(!global.helpers || !global.helpers.access){

            return setTimeout(function(){

                Logs.notify(label, data, priority);

            }, 2000);

        }

        if(priority > 10){

            global.modules.notify.sendAdmins(`Log ${label}`, data.substr(0, 100));

        }

    },

    unhandledRejection(reason, p){

        if(!reason){

            // Logs.save('unhandledRejection-sem-reason', '', 1);

            return;

        }

        console.log('\n/* ------------------- '.red + 'Log' + ' ------------------- */'.red);
        console.log('                   unhandledRejection                '.bgRed);
        console.log('');
        console.log('Reason:', reason);
        console.log('\n/* ------------------- '.red + 'Log' + ' log ------------------- */\n'.red);

        var error = "Reason: " + reason + "\nStack: " + reason.stack + "\n";

        Logs.checkReason(reason);

        Logs.save('unhandledRejection', error, 20);

    },

    uncaughtException: (reason, p) => {

        console.log('\n/* ------------------- '.red + 'Log' + ' ------------------- */'.red);
        console.log('                   uncaughtException                '.bgRed);
        console.log('');
        console.log('Reason:', reason);
        console.log('\n/* ------------------- '.red + 'Log' + ' ------------------- */\n'.red);

        var error = "Reason: " + reason + "\nStack: " + reason.stack + "\n";

        Logs.checkReason(reason);

        Logs.save('uncaughtException', error, 20);

    },

    rejectionHandled: (reason, p) => {

        console.log('\n/* ------------------- ' + 'Log' + ' ------------------- */'.red);
        console.log('                     rejectionHandled                     '.bgRed);
        console.log('');
        console.log('Handled Rejection at: ', p);
        console.log("\n");
        console.log('Reason:', reason);
        console.log('\n/* ------------------- ' + 'Log' + ' ------------------- */\n'.red);

        var error = "Reason: " + reason + "\nStack: " + reason.stack + "\n";

        Logs.checkReason(reason);

        Logs.save('rejectionHandled', error, 20);

    },

    checkReason(reason){

        // Guarda o potencial conserto
        var fix = '';
        var fatal = false;

        console.log('Código da razão: ' + reason.code);

        // Pega o código do erro e testa
        switch(reason.code){
            case 'MODULE_NOT_FOUND':

                if(~reason.toString().indexOf(global.dir.root)){

                    var rootFile = reason.toString().replace('Error: Cannot find module \'', '').replace("'", '');
                    var file     = rootFile.replace(global.dir.root, '');

                    fix = 'Arquivo não encontrado: ' + file.green;

                    if(process.env.DEVELOPMENT){

                        spawn('subl', [rootFile]);

                    }

                } else{

                    var moduleName = reason.toString().replace('Error: Cannot find module', '').replace(/'/g, '').trim();

                    var command = 'npm install --save ' + moduleName;

                    fix = 'Para resolver o erro acima, digite:' + command.green;

                }

                fatal = true;

            break;
            case 'ER_NO_SUCH_TABLE':

                fix = 'Para resolver o erro crie as tabelas do arquivo: doc/generated-files/structure.sql';

            break;
            case 'EADDRINUSE':

                var pidFilePath = path.join(global.dir.logs, 'last.pid');

                fs.exists(pidFilePath).then(exists => {

                    if(!exists){

                        console.log(`Use o comando: netstat -tulpn | grep :${process.env.PORT} para\nencontrar o processo que está ocupando essa porta.`.green);

                    } else{

                        fs.readFile(pidFilePath, 'utf-8').then(content => {

                            console.log('Ultimo pid:', content);

                            console.log(`Ou o comando: netstat -tulpn | grep :${process.env.PORT}`.green);

                        });

                    }

                });

            break;
        }

        // Caso haja uma solução para o problema
        if(fix) console.log(fix);

        if(fatal) process.exit();

    },

    notFound: (req) => {

        // Armazena determinado ip
        var ip  = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Aqui, é armazenado a url, que já contem o req.query
        var url = req.originalUrl;

        var logObj = {
            ip: ip,
            url: url
        }

        // Caso possua body
        if(req.body && Object.keys(req.body).length){

            // Vamos armazenar no log também
            logObj.body = req.body;

        }

        // Vamos salvar o log
        Logs.save('not-found-404', logObj);

    }, 

    // @description Essa função é responsável por interceptar todas as requisições
    // e seus retornos, pois quando há algum erro, isto é, determinado pelo json
    // success: false, é armazenado nos logs, com informação útil para futuro
    // debugging
    middleware: (req, res, next) => {

        // @todo Verificar se a linha abaixo oferece alguma segurança
        // caso a gente bloqueie quando uma requisição vem de onde não permitimos
        // console.log('Host: ' + req.headers.host);

        // Intercepta a função antiga de json
        var oldJson = res.json;

        // Re-escreve a função
        res.json = (data) => {

            // Aplica o argumento a função antiga
            oldJson.apply(res, [data]);

            // Caso exista essa propriedade, mas ela for false
            if((typeof data.success !== 'undefined' && !data.success) || typeof data.status !== 'undefined' && data.status == 'error'){

                // Vamos pegar o ip
                var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

                // Remove a senha de uma eventual mensagem de erro
                delete req.body.pass;
                delete req.body.password;
                delete req.body.senha;

                // Vamos salvar o log
                Logs.save('json-success-false', {
                    data,
                    ip: ip,
                    url: req.originalUrl,
                    body: req.body
                });

            }

        }

        next();

    },

    sendYesterdayToLunastro(){

        var logFilePath = Logs.yesterdayLogsPath();

        console.log(`Tentando enviar logs de ${logFilePath}`);

        fs.readdir(logFilePath, function(err, data){

            data.forEach(log => {

                var isSendable = true;

                var logFileName = log.replace('.log', '');

                if(process.env.LUNASTRO_IGNORE){

                    process.env.LUNASTRO_IGNORE.split(',').forEach(function(lunastroIgnore){

                        if(logFileName ==  lunastroIgnore.trim()){

                            isSendable = false;

                        }

                    });

                }

                if(!isSendable) return;

                var logPath = path.join(logFilePath, log);

                fs.readFile(logPath, 'utf-8', (err, d) => {

                    var originalDLength = d.length;

                    // Se tiver mais de 65 mil caracteres, tamanho máximo do tipo TEXT
                    if(d.length > 65000){

                        d = "Log incompvaro, pois possui " + originalDLength + " caracteres\n\n" + d.substr(0, 65000);

                    }

                    request.post({

                        url: process.env.LUNASTRO_HOST,
                        json: {

                            jwt: process.env.LUNASTRO_LOGS,

                            data: {
                                action: 'create_child',
                                label: 'Revisão de ' + log + ' de ' + Logs.helpers.simpleDate(new Date().getTime()),
                                prazo: Logs.helpers.simpleDate(new Date().getTime() + 1000 * 60 * 60),
                                description: d
                            }

                        }

                    }, (err, body, res) => {

                        if(err) throw err;

                        if(res && res.success){

                            console.log(`${originalDLength*8} bytes em erros(${log}) enviados ao astr`);

                        } else{

                            console.log(`Erro ao enviar ${originalDLength*8} bytes em erros(${log}) ao astr`);

                            if(global && global.helpers && global.helpers.access && global.helpers.access.notify){

                                global.helpers.access.notify(`Erro ao enviar ${originalDLength*8} bytes em erros(${log}) pois ${res.message}`);

                            }

                        }

                    });


                })

            });

        });

    },

    // Usado para calcular o tempo delta, isto é, a relação entre o atraso e o delay
    // fixo usado para chamar a função usage
    lastUsage: 0,

    usageDelay: 20000,

    usage(){

        var cpus = os.cpus();

        var cpuLoad = 0;

        for(var i = 0, len = cpus.length; i < len; i++) {
            
            var cpu = cpus[i], total = 0;

            for(var type in cpu.times) {
                total += cpu.times[type];
            }

            for(type in cpu.times) {

                if(type == 'idle'){

                    cpuLoad = 100 - (Math.round(100 * cpu.times[type] / total));

                }

            }
        }

        var memory = (os.freemem() / os.totalmem() * 100).toFixed(2);

        if(Logs.lastUsage){

            var delta = new Date() - Logs.lastUsage - Logs.usageDelay;

            Logs.save('usage', {
                cpu:   cpuLoad,
                ram:   memory,
                delta: delta
            }, -1);

        }

        Logs.lastUsage = new Date().getTime();

    },

    readLastLogs(){

        var logFilePath = Logs.init();

        return new Promise((resolve, reject) => {

            fs.readdir(logFilePath, function(err, data){

                var readArr = [];

                data.forEach(log => {

                    readArr.push(new Promise((resolve, reject) => {

                        var logPath = path.join(logFilePath, log);

                        fs.readFile(logPath, 'utf-8', (err, data) => {

                            if(err) reject(err);
                            else{
                                resolve({
                                    path: logFilePath.replace(global.dir.root, ''),
                                    name: log,
                                    data: data
                                });
                            }

                        });

                    }));

                });

                Promise.all(readArr).then(resolve);

            });

        });

    },

    getDayPath(date){

        var year = date.getFullYear().toString();

        var month = Logs.helpers.months[date.getMonth()].toLowerCase();

        var day = date.getDate().toString();

        var dayPath = path.join(Logs.path, year, month, day);

        return dayPath;

    },

    read(logName, vigency){

        var date = new Date();
        var vigencyDays = 1;
        var dateEntries = {};

        // @todo Melhorar isso aqui, quero apenas que busca a partir do mês mais antigo
        if(typeof vigency === 'undefined') vigency = new Date().getTime() - 1000 * 60 * 60 * 24 * 30 * 7;

        var vigencyDate = new Date(vigency);
        var nowDate     = new Date();

        if(vigencyDate > nowDate) return Promise.reject('Logs.read() -> Vigency on the future?');

        while(vigencyDate < nowDate){

            vigencyDate.setDate(vigencyDate.getDate() + 1);

            if(vigencyDate < nowDate) vigencyDays++;

        }

        var logPromises = [];

        // @todo Remover isso
        var arrInutil = [];

        while(vigencyDays--) arrInutil.push(vigencyDays);

        // @todo Tirar dependencia de helpers
        return global.helpers.f.forEachPromise(arrInutil, () => {

            var dayPath = Logs.getDayPath(date);

            var logFile = path.join(dayPath, logName + '.log');

            date.setDate(date.getDate()-1);

            return fs.exists(logFile).then(exists => {

                if(!exists) return;

                return fs.readFile(logFile, 'utf-8').then(data => {

                    var header = process.env.APP_NAME + " - log file (" + process.env.APP_NAME + " engine)";
                    var validEntries = 0;

                    data = data.split(header).join('');

                    data.replace(/\n\n/g, "\n");

                    var entries = data.split(/\n\r\n/g);

                    entries.forEach(entry => {

                        entry = entry.trim();

                        if(!entry) return;

                        var entrySplited = entry.split(/\[([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})\,\s+([0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2})\s+(PM|AM)\]\s+/);

                        if(entry[0] == '[' && entrySplited.length == 5){

                            var entryTime = new Date(`${entrySplited[1]} ${entrySplited[2]} ${entrySplited[3]}`);

                            if(!dateEntries[entryTime.getTime()]){

                                dateEntries[entryTime.getTime()] = [];

                            }

                            dateEntries[entryTime.getTime()].push(entrySplited[4]);

                        }

                    });

                });

            });

        }).then(() => {

            var vigencyDateEntries = {};

            Object.keys(dateEntries).forEach(dateEntryKey => {

                if(dateEntryKey > vigency){

                    vigencyDateEntries[dateEntryKey] = dateEntries[dateEntryKey];

                }

            });

            return vigencyDateEntries;

        });

    },

    getReviews(){

        var reviews = fs.readdirSync(path.join(Logs.path, 'review'));

        return reviews;

    },

    startup(){

        if(!global.cl){

            return setTimeout(Logs.startup, 2000);

        }

        global.cl.add('log to astr', () => {

            Logs.sendYesterdayToLunastro();

        });

        global.cl.add('log review all', () => {

            console.log(Logs.getReviews());

        });

        global.cl.add('log show n ?', (logName) => {

            var date = new Date();

            date.setDate(date.getDate() - 2);

            var vigency = date.getTime();

            Logs.read(logName).then(content => {

                console.log(Object.keys(content).length);

            });

        });

        global.cl.add('test log', () => {

            Logs.save('test log', {
                blank: true
            }, 25);

        });

        global.cl.add('log show ?', (logName) => {

            var date = new Date();

            date.setDate(date.getDate() - 2);

            var vigency = date.getTime();

            Logs.read(logName).then(content => {

                console.log(content);

            });

        });

        Logs.save('server start', {
            at: new Date().getTime()
        }, 12);

        var reviews = Logs.getReviews();

        if(reviews.length){

            console.log(`Existem ${reviews.length} logs a serem revisados`.bgRed);

        }

    }

}

global.modules.module.addToComponent('express-middleware', Logs.middleware);

process.on('unhandledRejection', Logs.unhandledRejection)
process.on('uncaughtException',  Logs.uncaughtException)
process.on('rejectionHandled',   Logs.rejectionHandled)

module.exports = Logs;

// Envia os relatórios todo dia pela manhã
schedule.scheduleJob('00 00 * * *', Logs.sendYesterdayToLunastro);

setInterval(Logs.usage, Logs.usageDelay);

Logs.startup();

if(!global.logs) global.logs = module.exports;

