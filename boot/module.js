let chokidar = require("chokidar")
let walkdir  = require("walkdir")
let path     = require('path')
let fs       = require('fs-extra')
let crc32    = require('crc').crc32
let sass     = require('sass')

let Util = require(global.dir.boot + '/util.js');

require('colors');

module.exports = {

    specialPaths: ['views/page', 'views/public', 'views/components'],

    ignorableFiles: [path.sep + 'package-lock.json'],

    isSassEnabled(){

        return global.package.kugel.config.sass !== false;

    },

    log(){

        // Melhorar, pois multiplos argumentos não estão pegando
        console.log.apply(null, arguments);

    },

    onload: function(){

        if(!global.package.kugel.config.modules) return Promise.resolve();

        global.modules.cl.add("apply files", function(){

            return module.exports.reapplyFiles();

        });

        global.modules.cl.add("delete modules", function(){

            return module.exports.delModules();

        });

        if(process.env.RELOAD_ON_MODULE_CHANGE == 'true' && process.env.MODULES_SYMLINK != 'true'){

            module.exports.listenToModulesUpstream();

        }

        global.modules.cl.add("apply views", function(){

            Util.kugel.compileViews();

        });

        Util.kugel.compileViews();

        global.modules.cl.add("apply modules", () => {

            return module.exports.applyModules();

        }, 'Responsável por retornar arquivos para a pasta de módulos');

        let viewsWatcher = chokidar.watch(global.dir.views, {
            persistent: true
        });

        let assetsWatcher = chokidar.watch(global.dir.assets, {
            persistent: true
        });

        viewsWatcher.on('change', filePath => {

            module.exports.runChange(filePath, 'views');

        });

        assetsWatcher.on('change', filePath => {

            module.exports.runChange(filePath, 'assets');

        });
        
        if(process.env.APP_HOTRELOAD == 'true'){

            let routesWatcher = chokidar.watch(global.dir.routes, {
                persistent: true
            });

            let controllersWatcher = chokidar.watch(global.dir.controllers, {
                persistent: true
            });

            let modelsWatcher = chokidar.watch(global.dir.models, {
                persistent: true
            });

            routesWatcher.on('change', filePath => {

                module.exports.runChange(filePath, 'routes');

            });

            controllersWatcher.on('change', filePath => {

                module.exports.runChange(filePath, 'controllers');

            });

            modelsWatcher.on('change', filePath => {

                module.exports.runChange(filePath, 'models');

            });

        }

        // Caso estejamos lidando com symlinks, não é necessário observar as mudanças nessa pasta
        if(process.env.MODULES_SYMLINK != 'true'){

            let modulesWatcher = chokidar.watch(global.dir.modules, {
                persistent: true
            });

            modulesWatcher.on('change', filePath => {

                module.exports.runChange(filePath, 'modules');

                // @dry
                if(module.exports.isSassEnabled()){

                    if(filePath.substr(-4) == '.css') return;

                }

                if(process.env.MODULES_AUTO_APPLY == 'true'){

                    module.exports.applyModules();

                }

            });

        }

        return Promise.resolve(module.exports);

    },

    compile: {

        sass(filePath){

            return new Promise((resolve, reject) => {

                let outPath = filePath.replace('.scss', '.css');

                sass.render({

                    file: filePath,
                    outFile: outPath,

                }, function(error, result){

                    if(error) return reject(error);

                    fs.writeFile(outPath, result.css, function(err){

                        if(err) return reject(err);

                        resolve();

                    });

                });

            });

        }

    },

    async runChange(filePath, type){

        let extensionFile = path.extname(filePath);

        switch(type){

            case 'modules':
            case 'assets':
            case 'views':

                switch(extensionFile){

                    case '.pug':

                        global.modules.cl.execute('apply views');

                    break;
                    case '.jpg':
                    case '.jpeg':
                    case '.png':
                    case '.gif':

                        // Hot reload de imagem

                    break;
                    case '.sass':
                    case '.scss':

                        // @todo Verificar se é bom deixar default false dessa maneira
                        if(module.exports.isSassEnabled){

                            await module.exports.compile.sass(filePath);

                        }

                    break;
                    case '.css':
                    case '.js':

                        // @todo Verificar alguma task na mudança dos assets

                    break;
                    default:
                        // Arquivo não relevante foi alterado
                    break;

                }

            break;
            case 'routes':

                // Todo

            break;
            case 'controllers':
            case 'models':

                console.log('Arquivo tipo ' + type.green + ' recarregado: ' + filePath);

                delete require.cache[filePath];

                require(filePath);

            break;

        }

        await module.exports.reapplyFiles(filePath);

    },

    components: {},

    applyFolders(moduleName){

        let modulePath = path.join(global.dir.modules, moduleName);

        return fs.readdir(global.dir.app).then(appFiles => {
            
            return fs.readdir(modulePath).then(moduleFolder => {

                let promiseCopy = [];

                moduleFolder.forEach(folder => {

                    if(!appFiles.includes(folder)) return;

                    promiseCopy.push(new Promise((resolve, reject) => {

                        let moduleFolderPath = path.join(modulePath, folder);

                        let walk = walkdir(moduleFolderPath);

                        walk.on('file', (asset) => {

                            // @todo Modo dinamico de determinar quais formatos não devem ser copiados
                            if(asset.substr(-5) == '.scss') return;
                            if(asset.substr(-5) == '.sass') return;

                            let relativeAsset = asset.replace(modulePath, '');
                            let appAsset      = path.join(global.dir.app, relativeAsset);

                            if(fs.existsSync(appAsset)) fs.unlinkSync(appAsset);

                            fs.copySync(asset, appAsset, {
                                overwrite: true
                            });

                        });

                        walk.on('end', resolve);

                    }));

                });

            });

        });

    },

    applyFilesFirstRun: {},

    // Move os arquivos públicos da pasta do módulo para a pasta app
    applyFiles(moduleName, __file){

        let firstTime = false;

        if(!module.exports.applyFilesFirstRun[moduleName]){
            module.exports.applyFilesFirstRun[moduleName] = true;
            firstTime = true;
        }

        let modulePath = path.join(global.dir.modules, moduleName);

        let package = {
            kugel: false
        };

        if(moduleName != 'module') package = fs.readJsonSync(path.join(modulePath, 'package.json'));

        // Lista os arquivos públicos de determinado módulo
        return module.exports.listFiles(moduleName).then(files => {

            let applyPromise = [];

            // Caso tenha package.json e também a propriedade .kugel
            if(package && package.kugel){

                applyPromise.push(module.exports.applyFolders(moduleName));

            } else{

                // Caso não tenha arquivos, ignora
                if(!Object.keys(files).length) return;

                for(let file in files){

                    // Aqui, definimos onde cada arquivo será depositado
                    let destinationFolder = global.dir[file];

                    // @todo Pensar em fazer o mesmo para outros tipos de arquivo(routes, modules, etc)
                    if(file == 'views'){

                        // No caso de views, preferimos que fique dentro de uma pasta
                        // chamada modules, por motivos de include no pug
                        destinationFolder = path.join(global.dir[file], 'modules', moduleName);

                        applyPromise.push(fs.ensureDirSync(destinationFolder));

                    }

                    if(file == 'views/page'){

                        destinationFolder = path.join(global.dir.views, 'page');

                    }

                    if(file == 'views/includes'){

                        destinationFolder = path.join(global.dir.views, 'includes');

                    }

                    if(file == 'views/public'){

                        destinationFolder = path.join(global.dir.views, 'public');

                    }

                    if(file == 'views/components'){

                        destinationFolder = path.join(global.dir.views, 'components');

                    }

                    // @todo Criar situação de verificar quando o file tanto não existe no sistema, quanto
                    // não está em specialPaths
                    // if(!module.exports.specialPaths.includes(file) && destinationFolder)

                    files[file].forEach(asset => {

                        let absoluteFileSrc = asset.replace(path.join(global.dir.modules, moduleName, file), '');

                        let destinationFolderPath = path.join(destinationFolder, absoluteFileSrc);

                        applyPromise.push(fs.readFile(asset, 'utf-8').then(assetData => {

                            // Verifica se o arquivo já existe
                            let destinationPromise = fs.exists(destinationFolderPath).then(destinationExists => {

                                if(destinationExists) return fs.readFile(destinationFolderPath, 'utf-8');

                                return Math.random().toString();

                            });

                            // @todo Verificar como podemos forçar que após compilar um sass, possamos indexar o .css resultante
                            if((asset.substr(-5) === '.scss' || asset.substr(-5) === '.sass')){

                                if(firstTime){
                                
                                    return module.exports.compile.sass(asset);

                                } else{

                                    return;

                                }

                            }

                            return destinationPromise.then(destinationData => {

                                if(crc32(assetData) !== crc32(destinationData)){

                                    return fs.copy(asset, destinationFolderPath, {
                                        overwrite: true
                                    });

                                }

                            });

                        }));

                    });

                }

            }

            return Promise.all(applyPromise);

        });

    },

    // Verifica por @todo arquivos inexistentes, @todo pastas, e arquivos duplicados
    verifyModules(bootSteps){

        if(!global.package.kugel.config.modules) return Promise.resolve();

        let errors = [];

        let modulesPromise = [];

        let includedModules = [];

        let uniqueFiles = {};

        for(step in bootSteps){

            let modules = bootSteps[step];

            modules.forEach(moduleName => {

                if(includedModules.includes(moduleName)){

                    errors.push("O módulo " + moduleName + " já foi incluído");

                }

                includedModules.push(moduleName);

                let moduleRepoPath = path.join(process.env.MODULES_PATH, moduleName);
                let modulePath     = path.join(global.dir.modules, moduleName);

                // Determina se o módulo está em fase de desenvolvimento
                // ou melhor, se ele está apenas na pasta do projeto
                let wipModule = false;

                // Se não existe na pasta de repositório
                if(!fs.existsSync(moduleRepoPath)){

                    wipModule = true;

                    // E se também não estiver na pasta do sistema
                    if(!fs.existsSync(modulePath)){

                        return errors.push(moduleName + " não encontrado em MODULES_PATH e em global.dir.modules");

                    }

                }

                if(wipModule) return;

                modulesPromise.push(Util.tree(moduleRepoPath).then(files => {

                    files.forEach(file => {

                        if(module.exports.ignorableFiles.includes(file)) return;

                        if(file == path.sep + 'package.json'){

                            let package      = fs.readJsonSync(path.join(moduleRepoPath, 'package.json'));
                            let mainFileName = package.main.substr(0, package.main.length - 3);

                            if(package.name !== moduleName){

                                errors.push(`O nome do modulo deve ser identico ao .name no package.json (${package.name} != ${moduleName})`);

                            }

                            if(!package.main) errors.push(`A propriedade .main é obrigatória no package.json (${moduleName})`);
                            else{

                                if(mainFileName !== moduleName){

                                    errors.push(`O arquivo em .main no package.json deve ser igual ao nome do módulo (${mainFileName} != ${moduleName})`);

                                }

                            }

                            return;

                        }

                        if(typeof uniqueFiles[file] == 'undefined'){

                            uniqueFiles[file] = [];

                        }

                        uniqueFiles[file].push(moduleName);

                    });

                }));

            });

        }

        return Promise.all(modulesPromise).then(() => {

            for(let file in uniqueFiles){

                // Se tiver node_modules no caminho do arquivo
                if(file.split('node_modules').length > 1) continue;

                if(uniqueFiles[file].length > 1 && process.env.MODULES_SYMLINK != 'true'){

                    errors.push(`Arquivo encontrado ${uniqueFiles[file].length} vezes nos módulos: ${uniqueFiles[file].join(', ').green} -> ${file.green}`);

                }

            }

            if(errors.length){

                module.exports.showInitializationFatalErrors(errors);

            }

            return Promise.resolve();

        });

    },

    showInitializationFatalErrors(errors){

        console.log("@error".red + " erros durante a inicialização: ");

        errors.forEach((error, k) => {

            console.log(++k + ". " + error);

        });

        console.log(`@info Pasta usada ${process.env.MODULES_PATH}`);

        process.exit();

    },

    listenToModulesUpstream(){

        let upstreamWatcher = chokidar.watch(process.env.MODULES_PATH, {
            persistent: true
        });

        upstreamWatcher.on('change', filePath => {

            // Pega a pasta relativa do módulo
            let modulePath = filePath.replace(process.env.MODULES_PATH + path.sep, '');

            let moduleName = modulePath.split(path.sep)[0];

            // @todo Fazer numa variável mais global
            if(['.git', 'doc'].includes(moduleName)) return;

            // Deleta determinado modulo
            module.exports.delModule(moduleName);

        });

    },

    delModules(){

        // Remove a pasta de módulos
        // @todo É importante armazenar os dados que foram modificados
        // para que não se perca nenhum dado de cache ou outro dado importante
        // que não fora salvo
        return fs.remove(global.dir.modules).then(async () => {

            console.log('@info Pasta de modulos deletada');

            // @tag 1231418Xaa

            // Passa por todos os modulos carregados
            for(mod in global.modules){

                // Se for o módulo principal (este arquivo), não vamos recarrega-lo
                if(mod == 'module') continue;

                // Deleta a instância do módulo para posterior load
                delete global.modules[mod];

            }

            // Carrega a lista de módulos novamente, em ordem
            await global.modules.module.loadModules(global.package.kugel.modules.core,       'core');
            await global.modules.module.loadModules(global.package.kugel.modules.startup,    'startup');
            await global.modules.module.loadModules(global.package.kugel.modules.lightstart, 'lightstart');
            await global.modules.module.loadModules(global.package.kugel.modules.start,      'start');

            // @todo Pode ser necessário preservar algumas propriedades que são geradas durante
            // o estado de ligado. Uma das formas de fazer é ao carregar o módulo, listar quais
            // propriedades existiam nesse início e as que forem criadas posterior, ficariam ar
            // mazenadas na @tag 1231418Xaa, e aplicadas aqui, após o load de cada módulo

        });

    },

    // Remove os arquivos públicos do módulo para na pasta app
    delPublicModuleFiles(moduleName){

        // @todo o mesmo que applyFiles, só que ao invés de .cp, será .del ou unlink

    },

    // Remove a pasta do modulo e puxa novamente
    delModule(moduleName){

        // Armazena os módulos que podem ter hotinstall
        let allowedDelModules = [];

        allowedModuleTypes = ['start', 'lightstart'];

        allowedModuleTypes.forEach(moduleType => {

            global.package.kugel.modules[moduleType].forEach(allowedModuleName => {

                allowedDelModules.push(allowedModuleName);

            });

        });

        if(!allowedDelModules.includes(moduleName)){

            console.log(`@info ${moduleName} atualizado, porém não pertence ao grupo instalável: (${allowedModuleTypes.join(',')})`);

            return;

        } else{

            console.log(`@info Reinstalando modulo ${moduleName}`);

        }

        // Vamos ignorar se determinado modulo não estiver carregado
        if(!global.modules[moduleName]) return;

        // Deleta a instanciação do módulo
        delete global.modules[moduleName];

        // Deleta a pasta no sistema responsável pelo módulo
        return fs.remove(path.join(global.dir.modules, moduleName)).then(() => {

            return module.exports.loadModules([moduleName], 'hotinstall');

        });

    },

    listFiles(moduleName){

        let moduleObj = global.modules[moduleName];

        if(!moduleObj){
            return global.logs.save('undefined moduleObj', {moduleName: moduleName});
        }

        let files = {};

        let filesPromise = [];

        if(moduleObj.files){

            for(let file in moduleObj.files){

                // Vamos ignorar tudo que não está em dir, pois tanto faz parte da lógica
                // quanto precisamos limitar por segurança
                if(typeof global.dir[file] === 'undefined' && !module.exports.specialPaths.includes(file)){

                    console.log(`@info Propriedade ${file} de .files ignorada, por não existir dentro de app (${moduleName})`)

                    continue;

                }

                filesPromise.push(new Promise((resolve, reject) => {

                    let filePath = path.join(global.dir.modules, moduleName, file);

                    let thatFile = file;

                    let walk = walkdir(filePath);

                    walk.on('file', (asset) => {

                        if(!files[thatFile]) files[thatFile] = [];

                        files[thatFile].push(asset);

                    });

                    walk.on('end', resolve);

                }));

            }

        }

        return Promise.all(filesPromise).then(() => {

            return files;

        });

    },

    installModule(moduleName){

        console.log('@info'.green, moduleName, 'instalando');

        let modulePath = path.join(global.dir.modules, moduleName);

        if(typeof process.env.MODULES_PATH == 'undefined'){

            console.log("@warn Defina a variável MODULES_PATH para instalação automática dos modulos");
            process.exit();

        }

        let moduleRepoPath = path.join(process.env.MODULES_PATH, moduleName);

        if(!fs.existsSync(moduleRepoPath)){

            console.log(`@warn Modulo ${moduleName} não encontrado`);
            process.exit();

        }

        if(process.env.MODULES_SYMLINK) fs.symlinkSync(moduleRepoPath, modulePath);
        else fs.copySync(moduleRepoPath, modulePath);

        console.log('@info'.green, moduleName, 'instalado');

    },

    loadModules(modules, modulesType){

        if(!global.package.kugel.config.modules) return Promise.resolve();

        let modulePromises = [];

        modules.forEach(async moduleName => {

            let modulePath = path.join(global.dir.modules, moduleName);

            let moduleExists = fs.existsSync(modulePath);

            if(!moduleExists){

                module.exports.installModule(moduleName);

            }

            modulePromises.push(new Promise((resolve, reject) => {

                // @todo Verificar necessidade de garantir que não exista nada anteriormente
                // associado a essa variavel
                let moduleInstance = require(modulePath);

                if(moduleInstance.files){

                    let errors = [];

                    // @todo Detectar outros tipos se necessário
                    if(typeof moduleInstance.files == 'string'){

                        errors.push(`O atributo .files deve ser um objeto`);

                    } else{

                        for(let file in moduleInstance.files){

                            if(!fs.existsSync(path.join(modulePath, file))){

                                errors.push(`A pasta ${file} não existe dentro do módulo ${moduleName}`);

                            }

                        }

                    }

                    if(errors.length){

                        errors.forEach((error, k) => {

                            errors[k] = error = '@' + moduleName + ': ' + error; 

                        }); 

                        fs.moveSync(modulePath, modulePath + '.errored');

                        return module.exports.showInitializationFatalErrors(errors);
                    }

                }

                let commonPromise = () => {};

                if(moduleInstance.then){

                    global.modules[moduleName] = {

                        onload: new Promise((resolve2, reject) => {
                            commonPromise = resolve2
                        })

                    }

                    return moduleInstance.then(moduleObj => {

                        if(!moduleObj){
                            console.log(`@warn modulo ${moduleName} sem objeto de retorno`)
                            moduleObj = {}
                        }

                        global.modules[moduleName] = moduleObj; 

                        commonPromise(global.modules[moduleName])

                    }).then(() => {

                        resolve()

                    });

                } else{

                    global.modules[moduleName] = moduleInstance;

                    process.env[moduleName.replace('-', '_') + '_MODULE_PATH'] = __dirname;

                    console.log(`${"@module".yellow} Carregando módulo ${moduleName.red}`);

                    return module.exports.applyFiles(moduleName).then(resolve);

                }

            }).then(() => {

                if(global.modules[moduleName]){

                    return module.exports.applyFiles(moduleName);

                }

            }));

        });

        return Promise.all(modulePromises).then(() => {

            console.log(`${"@module".yellow} ${modules.length} modulos ${modulesType.red} carregados`);

        });

    },

    debounceApplyModules: null,

    applyModules(){

        // Impede que ao chamado multiplas vezes em menos de 500ms passe de uma execução
        clearTimeout(module.exports.debounceApplyModules);

        module.exports.debounceApplyModules = setTimeout(function(){

            let modulesApp    = fs.readdirSync(global.dir.modules);
            let modulesOrigin = fs.readdirSync(process.env.MODULES_PATH);

            modulesApp.forEach(mod => {

                let modulePath = path.join(global.dir.modules, mod);

                if(!modulesOrigin.includes(mod)){

                    return fs.copy(modulePath, path.join(process.env.MODULES_PATH, mod)).then(() => {

                        console.log(`@info Adicionando o módulo ${mod} na pasta env.MODULES_PATH`);

                    });

                }

                Util.tree(modulePath).then(tree => {

                    tree.forEach(async file => {

                        let moduleFilePath       = path.join(modulePath, file);
                        let moduleOriginFilePath = path.join(process.env.MODULES_PATH, mod, file);

                        // Se for um arquivo css
                        if(moduleFilePath.substr(-4) == '.css'){

                            // E já existir um .scss ou .sass, não vamos mandar a pasta original
                            if(fs.existsSync(moduleFilePath.replace('.css', '.scss')) || fs.existsSync(moduleFilePath.replace('.css', '.sass'))){

                                return;

                            }

                        }

                        if(await Util.crc32(moduleFilePath) != await Util.crc32(moduleOriginFilePath)){

                            if(fs.existsSync(moduleOriginFilePath)) fs.unlinkSync(moduleOriginFilePath);

                            fs.copy(moduleFilePath, moduleOriginFilePath, {
                                overwrite: true
                            }).then(() => {

                                console.log(`@info Arquivo ${file.green} do modulo ${mod.green} aplicado com sucesso`);

                            }).catch(e => {

                                console.log(`@info Arquivo ${file.green} do modulo ${mod.green} ${"não aplicado".red}`);
                                console.log(`@err ${e.toString()}`);

                            });

                        }

                    });

                });

            });

        }, 500);

    },

    reapplyFiles(file){

        let lockOnModule = false;

        if(file){

            let relativeFilePath = file.replace(global.dir.modules, '');

            lockOnModule = relativeFilePath.split(path.sep)[1];

        }

        let applyPromise = [];

        for(moduleName in global.modules){

            if(lockOnModule && lockOnModule != moduleName) continue; 

            applyPromise.push(module.exports.applyFiles(moduleName, file));

        }

        return Promise.all(applyPromise).then(() => {

            return global.helpers.f.checksum();

        });

    },

    addToComponent(component, obj){

        component = component.toLowerCase();

        // Caso este componente não esteja declarado, vamos declara-lo
        if(typeof module.exports.components[component] == 'undefined'){

            module.exports.components[component] = {
                stack: []
            }

        }

        // @todo Procurar um jeito melhor de definir ser um array
        if(obj instanceof Array){

            obj.forEach(item => {

                module.exports.components[component].stack.push(item);

            });

        } else{

            module.exports.components[component].stack.push(obj);

        }

        module.exports.onComponentListener[component] ??= [];

        module.exports.onComponentListener[component].forEach(f => f(obj));

    },

    onComponentListener: {},

    onComponent(component, callback){

        module.exports.onComponentListener[component] ??= [];

        module.exports.onComponentListener[component].push(callback);

        if(module.exports.components[component] && module.exports.components[component].stack){

            module.exports.components[component].stack.forEach(f => {

                callback(f);

            });

        }

    },

    getComponentStack(component){

        if(!module.exports.components[component]){

            console.log(`@warn O componente ${component} não está definido`);

            return [];
        }

        return module.exports.components[component].stack;

    },

    // Retorna um componente de modo ordenado, desde que possua o atributo order
    getOrderedComponentStack(component){

        return module.exports.getComponentStack(component).sort((a, b) => {

            return a.order - b.order;

        });

    }

}

