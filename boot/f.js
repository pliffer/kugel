const folderSize = require('get-folder-size');
const sha512     = require("js-sha512").sha512;
const walkdir    = require("walkdir");
const path       = require('path');
const fs         = require('fs-extra');
const {crc32}    = require('crc');
const xlsx       = require('xlsx');
const pug        = require('pug');

let Logs = require(global.dir.boot + '/logs.js');

module.exports = {

    compileComponents(sub){

        let componentsPath = path.join(global.dir.views, 'components', sub);

        let components = fs.readdirSync(componentsPath);

        let fullHtml = '';

        for(component of components){

            let componentPath = path.join(componentsPath, component);

            fullHtml += module.exports.compileView(componentPath, {
                require: require,
                pretty: true
            });

        }

        return fullHtml;

    },

    compileView(file, options){

        return pug.renderFile(file, options);

    },

    matchPattern(str, rule){

        let notMatch = false;

        if(rule[0] == '!'){

            notMatch = true;
            rule = rule.substr(1);

        }

        var escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

        let test = new RegExp("^" + rule.split("*").map(escapeRegex).join(".*") + "$").test(str);

        if(notMatch) test = !test;

        return test;

    },

    arrayToXlsx: function(filename, array){

        // @todo Usar o reject, pois aqui não sabemos quando ocorrer um erro

        console.log('Criando arquivo a partir de', array.length, 'linhas')

        return new Promise((resolve, reject) => {
    
            let wb = xlsx.utils.book_new();
            let ws = xlsx.utils.aoa_to_sheet(array);

            xlsx.utils.book_append_sheet(wb, ws, "Estoque");

            xlsx.writeFileAsync(filename, wb, () => {

                console.log('Arquivo', filename, 'gerado');

                resolve(filename);

            });

        });

    },

    getBuffer: function(filename){

        return new Promise((resolve, reject) => {

            fs.readFile(filename, (err, buffer) => {

                if(err) reject(err);
                else resolve(buffer);

            });

        });

    },

    filterArrayByColumns: function(arr, columns){

        var aux = [];

        arr.forEach(function(item){

            var auxItem = []

            item.forEach(function(col, k){

                if(columns.includes(k)) auxItem.push(col)

            });

            aux.push(auxItem)

        });

        return aux;

    },

    excelToJson: function(filename){

        let wb = xlsx.readFile(filename);

        return module.exports.wbToJson(wb);

    },

    excelToArray: function(filename){

        let wb = xlsx.readFile(filename);

        return module.exports.wbToArray(wb);

    },

    wbToJson: function(wb){

        let sheet = wb.Sheets[wb.SheetNames[0]];

        return xlsx.utils.sheet_to_json(sheet);

    },

    wbToArray: function(wb){

        let sheet = wb.Sheets[wb.SheetNames[0]];

        return xlsx.utils.sheet_to_json(sheet, {
            header: 1
        });

    },

    forEachPromise: function(arr, callback){

        return new Promise(function(resolve, reject){

            var index = 0;

            var tick = function(){

                if(typeof arr[index] === 'undefined'){

                    return resolve();

                }

                var callRet = callback(arr[index], index);

                // Se não tiver then
                if(!callRet.then){

                    index++;
                    tick();

                }

                callRet.then(function(){

                    index++;

                    tick();

                });

            }

            tick();

        });

    },

    getDateString: function(){

        return global.helpers.f.getLightDate() + '-' + global.helpers.f.getSimpleHour(undefined, false).replace(':', 'h');

    },

    getLightDate: function(unixtime, delimiter){

        if(typeof unixtime === 'undefined'){
            unixtime = new Date().getTime();
        }

        if(typeof delimiter === 'undefined'){
            delimiter = '-';
        }

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

        var offset = date.getTimezoneOffset() / 60;

        if(offset < 10){
            offset = '0' + offset;
        }

        return day + delimiter + month;

    },

    getTrace(numbers = true){

        let getStackTrace = function() {
            let obj = {};
            Error.captureStackTrace(obj, getStackTrace);
            return obj.stack;
        };

        let trace = getStackTrace();

        let traceList = [];
        let traceListRet = [];

        let lastWasModule = false;

        trace.split("\n").forEach(traceLine => {

            traceLine = traceLine.trim();

            if(!~traceLine.indexOf(global.dir.root)) return;
            if(~traceLine.indexOf(__filename)) return;

            traceLine = traceLine.replace(global.dir.root + '/', '');
            traceLine = traceLine.replace(/at\s/, '');

            if(~traceLine.indexOf('Object.save (logs.js:')) return;

            if(~traceLine.indexOf('node_modules/')){

                if(lastWasModule) return;

                lastWasModule = true;

                let moduleName = traceLine.split('node_modules/')[1].split('/')[0];

                traceLine = moduleName + ' (modulo node.js)';

            }

            traceList.push(traceLine);

        });

        traceList.reverse().forEach(function(traceItem, n){

            let prefixText = (n + 1) + '. ';

            if(!numbers) prefixText = '';

            traceListRet.push(prefixText + traceItem);

        });

        return traceListRet;

    },

    getSimpleHour(unixtime, outputSeconds){

        if(typeof unixtime === 'undefined') unixtime = new Date().getTime();

        if(typeof outputSeconds === 'undefined') outputSeconds = true;

        var date = new Date(unixtime);

        var hour    = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();

        if(hour < 10){
            hour = '0' + hour;
        }

        if(minutes < 10){
            minutes = '0' + minutes;
        }

        if(seconds < 10){
            seconds = '0' + seconds;
        }

        if(outputSeconds){
            outputSeconds = ':' + seconds;
        } else{
            outputSeconds = '';
        }

        return hour + ':' + minutes + outputSeconds;

    },

    format: {

        cpf(cpf){

            cpf = cpf.toString();

            cpf = cpf.replace(/[^\d]/g, "");
            return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

        },

        cnpj(cnpj){

            cnpj = cnpj.toString();

            cnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")

            return cnpj;

        },

        capitalize(str){

            str = str.toString();

            let capitalizedStr = '';

            capitalizedStr += str[0].toUpperCase() + str.substr(1);

            return capitalizedStr;

        },

    },

    pagedSocketResponse(socket, label, table, allRows, opts){

        if(typeof opts === 'undefined') opts = {};

        if(typeof opts.setSync === 'undefined') opts.setSync = true;

        let page       = 0;

        let perPage    = 200;
        let totalPages = Math.ceil(allRows / perPage);

        let next = function(){

            page += 1;

            let rows = module.exports.pagedArray(page, perPage, allRows);

            if(rows.length){

                socket.emit(label + ' page', {

                    page: page,
                    table: table,
                    total: allRows.length,
                    rows: rows

                }, () => {

                    next();

                });

            } else{

                socket.emit(label + ' page finish', table, opts);

            }

        }

        next();

    },

    pagedArray(page, perPage, array){

        var pageItems = [];

        var total = Math.ceil(array.length / perPage);
        var start = (page-1) * perPage;
        var end   = page * perPage;

        array.forEach(function(item, k){

            if(k >= start && k < end) pageItems.push(item)

        });

        if(!pageItems.length){

            return false;

        }
        
        return pageItems;

    },

    standardResponse(promise, res){

        promise.then(data => {

            let obj = {
                success: true
            }

            if(typeof data !== 'undefined'){
                obj.message = data;
            }

            res.json(obj);

        }).catch(e => {

            res.json({
                success: false,
                message: e.toString()
            });

        });

    },

    getFolderSizes(){

        return new Promise((resolve, reject) => {

            let ret = [];

            folderSize(global.dir.storage, (err, bytes) => {

                ret.push('Storage: ' + module.exports.toMb(bytes));

                folderSize(global.dir.logs, (err, bytes) => {

                    ret.push('Logs: ' + module.exports.toMb(bytes));

                    resolve(ret);

                });

            });

        });

    },

    toMb(bytes){

        return (bytes / 1024 / 1024).toFixed(2);

    },

    /**
     * Cria um token, baseado numa sequencia de caracteres
     * @param  {Number} length Tamanho do token, em caracteres
     * @return {String}        token
     * @version 1.0
     */
    genToken(length){

        length = length || 50;

        var a = "-_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");

        var b = [];  

        for (var i=0; i<length; i++) {
            var j = (Math.random() * (a.length-1)).toFixed(0);
            b[i] = a[j];
        }

        return b.join("");

    },

    random(min, max){
        return Math.floor(Math.random()*(max-min+1)+min);
    },

    randomToken(){
        return sha512(Math.random().toString()).substr(0, 10);
    },

    bufferToBase64(buffer){
        var binary = '';
        var bytes  = new Uint8Array(buffer);
        var length = bytes.byteLength;

        for (var i = 0; i < length; i++){
            binary += String.fromCharCode(bytes[i]);
        }

        // @Todo: Esta feature, btoa, está disponível apenas no browser
        return window.btoa(binary);
    },

    getAssets(){

        return new Promise((resolve, reject) => {

            if(global.config.state === 'development' && global.dir.assets){

                let walk = walkdir(global.dir.assets);
                let files = [];

                walk.on('file', (asset) => {

                    files.push(asset.replace(global.dir.assets, ''));

                });

                walk.on('end', () => {

                    resolve(files);

                });

            } else{

                resolve([]);

            }

        });

    },

    getFiles(){

        return new Promise((resolve, reject) => {

            let filesPromise = [];
            let fileList = [];
            let rootFolders = [];

            fs.readdir(global.dir.root).then(files => {

                let readDirProm = [];

                files.filter(file => {

                    if(file === '.git') return false;
                    if(file === 'node_modules') return false;
                    if(file === 'modules') return false;
                    if(file === 'doc') return false;

                    return true;

                }).forEach(file => {

                    readDirProm.push(fs.lstat(file).then(stat => {

                        if(stat.isDirectory()) rootFolders.push(file);

                    }));

                });

                return Promise.all(readDirProm).then(() => {

                    return rootFolders;

                });

            }).then(folders => {

                let filesPromise = [];

                folders.forEach(folder => {

                    filesPromise.push(new Promise((resolve, reject) => {

                        let walkPath = global.dir.root + '/' + folder;

                        let walk = walkdir(walkPath);

                        walk.on('file', (asset) => {

                            let path = asset.replace(global.dir.root + '/', '');

                            if(path.substr(0, 4) == '.git') return;
                            if(path.substr(0, 5) == '.logs') return;
                            if(path.substr(0, 12) == 'node_modules') return;

                            if(asset.split('/node_modules/').length > 1) return;
                            if(asset.split('/modules/').length > 1) return;
                            if(asset.split('/cache/').length > 1) return;
                            if(asset.split('/doc/').length > 1) return;

                            fileList.push(asset);

                        });

                        walk.on('end', resolve);

                    }));

                });

                return Promise.all(filesPromise).then(() => {

                    resolve(fileList);

                });

            });

        });

    },

    saveLastMod(){

        module.exports.getFiles().then(files => {

            let statList = {};

            let stateProm = [];

            files.forEach(file => {

                let relativePath = file.replace(global.dir.root, '');

                stateProm.push(fs.lstat(file).then(stat => {

                    let size  = stat.size;
                    let mtime = stat.mtimeMs;

                    statList[relativePath] = {
                        size: size,
                        mtime: mtime
                    };

                }));

            });

            Promise.all(stateProm).then(() => {

                Logs.saveDiff('organizr report', statList);

            });

        });

    },

    assetsChecksum(){

        let files = {};

        let checksumPromise = [];
        let checksums = "";

        return module.exports.getAssets().then(assets => {

            assets.forEach(asset => {

                let assetPath = path.join(global.dir.assets, asset);

                checksumPromise.push(fs.readFile(assetPath).then(file => {

                    files[assetPath] = crc32(file);

                }));

            });

            return Promise.all(checksumPromise).then(() => {

                Object.keys(files).sort().forEach(filename => {

                    checksums += files[filename].toString(16);

                });

                let finalChecksum = sha512(checksums);

                return finalChecksum;

            });

        });

    },

    checksum(triggerFile){

        let checksumPath = path.join(global.dir.logs, 'checksum.sha512');

        fs.ensureFile(checksumPath).then(() => {

            fs.readFile(checksumPath, 'utf-8').then(oldChecksum => {

                global.helpers.f.assetsChecksum().then(newChecksum => {

                    global.helpers.vars.checksum = newChecksum;

                    if(oldChecksum !== newChecksum){

                        console.log('@warn Nova versão de assets detectada(notifica atualização PWA)');

                        if(global.io) global.io.emit('checksum', newChecksum, triggerFile);

                        fs.writeFile(checksumPath, newChecksum, 'utf-8');

                    }

                });

            });

        });

    }

}

global.app.onload(() => {

    if(global.cl){

        global.cl.add('list assets', () => {

            module.exports.getAssets().then(assets => {

                assets.forEach(asset => {

                    console.log("'" + asset + "',");

                });

            });

        });

        global.cl.add('show checksum', () => {

            module.exports.assetsChecksum().then(checksum => {

                console.log('Checksum', checksum);

            });

        }, 'lista o CRC dos arquivos da pasta assets');
        
    }

});

// module.exports.saveLastMod();



