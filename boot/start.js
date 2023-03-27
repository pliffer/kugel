const path = require('path');
const fs   = require('fs');

process.env.ROOT = path.resolve(__dirname, '../');

const startedAt   = new Date();

console.log('@starting Iniciando (' + startedAt + ')');

if(!fs.existsSync(process.env.ROOT + '/.env')){

    console.log('@starting Criando .env');
    fs.copyFileSync(process.env.ROOT + '/.env.example', process.env.ROOT + '/.env');

}

(async () => {

    try{
    
        const rootFiles = fs.readdirSync(process.env.ROOT);
    
        console.log('@starting Dependencias e recomendações');
    
        if(!rootFiles.includes('.git')){
    
            console.warn("\n@warning Fora de um projeto git");
    
        }
    
        if(!rootFiles.includes('node_modules') || !rootFiles.includes('package.json')){
    
            console.log("\n@error Instale as dependências: npm install\n");
            process.exit();
    
        }
    
        let package = require(path.join(process.env.ROOT, './package.json'));
    
        if(typeof package.kugel == 'undefined'){
    
            console.log("@fatal O package.json deve possuir a propriedade kugel");
            process.exit();
    
        }

        require('dotenv').config({
            path: process.env.ROOT + '/.env'
        });

        package.kugel.config ??= {};

        if(package.kugel.config.modules){
    
            const module = require('./module.js');
    
            console.log('@starting Modulos');
    
            await module.load(package.kugel.modules);

        }

        // @future Criar um arquivo que guarda as informações relevantes do processo para debug
        fs.writeFileSync(path.join(process.env.ROOT, 'lastpid'), process.pid.toString(), 'utf-8')

        console.log("@started Iniciado " + (new Date() - startedAt) + "ms");

    } catch(err){
    
        if(err){
    
            console.error("@error Fatal Error");
            console.error(err);
    
        }
    
    }

})();
