const path = require('path')
const fs   = require('fs-extra')

require('colors');

const Components = require('kugel-components');

module.exports = {

    async load(modules){

        // Passa por cada etapa de carregamento
        for(let step in modules){

            // Passa por cada módulo da etapa
            let modulesStep = modules[step];

            // Passa por cada módulo da etapa
            for(let moduleName of modulesStep){

                let link;

                // Define a pasta local, para caso o módulo esteja em desenvolvimento
                let localModulePath = path.join(process.env.ROOT + '/modules', moduleName);

                // Define a pasta do node_modules
                let nodeModulePath  = path.join(process.env.ROOT + '/node_modules', moduleName);

                // Define a pasta do módulo instalado pelo package manager
                let modulePath = nodeModulePath;

                // Caso tenha uma pasta local para desenvolvimento do módulo
                if(fs.existsSync(localModulePath)){

                    modulePath = localModulePath;
    
                    // Caso não tenha a pasta nodeModules, vamos linkar na pasta local
                    link = !fs.existsSync(nodeModulePath);

                }

                // Caso não tenha o módulo
                if(!fs.existsSync(modulePath)) throw new Error(`@module ${moduleName.red} não encontrado`);

                // Caso não tenha o package.json
                if(!fs.existsSync(path.join(modulePath, 'package.json'))) throw new Error(`@module ${moduleName.red} não possui o package.json`);

                // Carrega o package.json
                let package = fs.readJsonSync(path.join(modulePath, 'package.json'));
                
                // Caso não tenha o campo kugel no package.json
                if(!package.kugel) throw new Error(`@module ${moduleName.red} não possui o campo kugel no package.json`);

                // @todo Remover dependencia de kugel-server
                if(package.kugel.static){

                    // Define a pasta de arquivos estáticos
                    let staticPath = path.join(modulePath, package.kugel.static);

                    // Adiciona a pasta de arquivos estáticos
                    Components.get('express-static').add(staticPath);

                }

                // @todo Remover dependencia de kugel-server
                if(package.kugel.views){

                    // Define a pasta de views
                    let viewsPath = path.join(modulePath, package.kugel.views);

                    // Adiciona a pasta de views
                    Components.get('express-views').add(viewsPath);

                }

                // Usar apenas para desenvolvimento
                process.env['module-' + moduleName] = modulePath;
                process.env[moduleName] = modulePath;

                console.log(`@module ${moduleName.green} carregado`);

                // Carrega o módulo, para que possa rodar suas funções internas
                require(modulePath);

                if(link){

                    // @todo Criar link simbólico para o módulo local
                    
                }

            }

        }

    }

}