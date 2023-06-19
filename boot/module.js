const path = require('path')
const fs   = require('fs-extra')

require('colors');

const Component = require('../module/kugel-components/components.js');

module.exports = {

    async load(modules){

        // Armazena os modulos a serem usados
        let modulesObj = {};

        // Passa por cada etapa de carregamento
        for(let stage in modules){

            // Passa por cada módulo da etapa
            let modulesInStage = modules[stage];

            // Passa por cada módulo da etapa
            for(let moduleName of modulesInStage){

                let createLinkInNodeModules = false;

                // Define a pasta local, para caso o módulo esteja em desenvolvimento
                let developmentModulePath = path.join(process.env.ROOT + '/modules', moduleName);

                // Detect if moduleName is a path, and if it is, moduleName is the end of the path
                if(moduleName.indexOf('/') > -1){

                    // Define a pasta local para desenvolvimento do módulo
                    developmentModulePath = moduleName;

                    // Define o nome do módulo
                    moduleName = moduleName.split('/').pop();

                }

                // Define a pasta do node_modules
                let installedModulePath  = path.join(process.env.ROOT + '/node_modules', moduleName);

                // Define a pasta do módulo instalado pelo package manager
                let actualModulePath = installedModulePath;

                // Caso tenha uma pasta local para desenvolvimento do módulo
                if(await fs.exists(developmentModulePath)){

                    actualModulePath = developmentModulePath;
    
                    // Caso não tenha a pasta nodeModules, vamos linkar na pasta local
                    createLinkInNodeModules = !await fs.exists(installedModulePath);

                }

                // Caso não tenha o módulo
                if(!await fs.exists(actualModulePath)) throw new Error(`@module ${moduleName.red} não encontrado`);

                // Caso não tenha o package.json
                if(!await fs.exists(path.join(actualModulePath, 'package.json'))) throw new Error(`@module ${moduleName.red} não possui o package.json`);

                // Carrega o package.json
                let packageJson = await fs.readJson(path.join(actualModulePath, 'package.json'));
                
                // Caso não tenha o campo kugel no package.json
                if(!packageJson.kugel) throw new Error(`@module ${moduleName.red} não possui o campo kugel no package.json`);

                // Usar apenas para desenvolvimento
                if(typeof process.env[moduleName] == 'undefined'){

                    process.env[moduleName] = actualModulePath;
                    
                }

                // Define a variável de ambiente com o caminho do módulo
                process.env['module-' + moduleName] = actualModulePath;

                console.log(`@module ${moduleName.green} carregado`);

                if(createLinkInNodeModules){

                    let linkPath = path.join(installedModulePath, 'index.js');

                    let linkContent = `module.exports = require('${developmentModulePath}');`;

                    fs.ensureDirSync(installedModulePath);
                    fs.writeFileSync(linkPath, linkContent);

                }

                // @todo Verificar casos onde o módulo não tenha o main
                if(packageJson.main){
    
                    // Carrega o módulo, para que possa rodar suas funções internas
                    modulesObj[packageJson.kugel.name || moduleName] = require(installedModulePath);

                }

            }

        }

        // Retorna os módulos carregados
        return modulesObj;

    }

}