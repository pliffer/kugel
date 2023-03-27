const path = require('path')
const fs   = require('fs-extra')

require('colors');

const Components = require(process.env.ROOT + '/../kugel-components');

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

                if(!fs.existsSync(modulePath)) throw new Error(`@module ${moduleName.red} não encontrado`);

                if(!fs.existsSync(path.join(modulePath, 'package.json'))) throw new Error(`@module ${moduleName.red} não possui o package.json`);

                let package = fs.readJsonSync(path.join(modulePath, 'package.json'));

                if(!package.kugel) throw new Error(`@module ${moduleName.red} não possui o campo kugel no package.json`);

                if(package.kugel.static){

                    let staticPath = path.join(modulePath, package.kugel.static);

                    Components.get('express-static').add(staticPath);

                }

                if(package.kugel.views){

                    let viewsPath = path.join(modulePath, package.kugel.views);

                    Components.get('express-views').add(viewsPath);

                }

                // Usar apenas para desenvolvimento
                process.env['module-' + moduleName] = modulePath;
                console.log(`@module ${moduleName.green} carregado`);

                require(modulePath);

                if(link){

                    // @todo Criar link simbólico para o módulo local
                    
                }

            }

        }

    }

}