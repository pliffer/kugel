const path = require('path');
const fs   = require('fs');

// Define a variável de ambiente ROOT como o caminho absoluto da pasta do projeto, que é onde iniciou o node .
process.env.ROOT = path.resolve(process.cwd());

// Armazena a data e hora atuais na variável startedAt para calcular o tempo de inicialização mais tarde
const startedAt = new Date();

console.log('@starting Iniciando (' + startedAt + ')');

// Verifica se o arquivo .env existe e, caso contrário, criar copiando o arquivo .env.example
if(!fs.existsSync(process.env.ROOT + '/.env')){

    console.log('@starting Criando .env');
    fs.copyFileSync(process.env.ROOT + '/.env.example', process.env.ROOT + '/.env');

}

// Define uma variável para guardar a função de resolução da Promise
let triggerStart;

// Exporta uma Promise que será resolvida quando o aplicativo estiver pronto para iniciar
module.exports = new Promise((resolve) => { triggerStart = resolve });

// Função assíncrona auto-executável para realizar várias verificações e configurações antes de iniciar o aplicativo
(async () => {

    try{
    
        // Lê arquivos na raiz do projeto
        const rootFiles = fs.readdirSync(process.env.ROOT);
    
        // Exibe mensagem sobre dependências e recomendações
        console.log('@starting Dependencias e recomendações');
    
        // Exibe aviso se o projeto não estiver em um repositório Git
        if(!rootFiles.includes('.git')){
    
            console.warn("\n@warning Fora de um projeto git");
    
        }
    
        // Exibe erro e encerrar o processo se as dependências do projeto não estiverem instaladas
        if(!rootFiles.includes('node_modules') || !rootFiles.includes('package.json')){
    
            console.log("\n@error Instale as dependências: npm install\n");
            process.exit();
    
        }
    
        // Carrega o arquivo package.json
        let package = require(path.join(process.env.ROOT, './package.json'));
    
        // Verifica se a propriedade "kugel" está definida no arquivo package.json e exibir erro e encerrar o processo, caso contrário
        if(typeof package.kugel == 'undefined'){
    
            console.log("@fatal O package.json deve possuir a propriedade kugel");
            process.exit();
    
        }

        // Carrega variáveis de ambiente do arquivo .env usando o módulo 'dotenv'
        require('dotenv').config({
            path: process.env.ROOT + '/.env'
        });

        // Define a propriedade 'config' do objeto package.kugel, se não existir
        package.kugel.config ??= {};

        // Se a propriedade 'modules' estiver definida em package.kugel.config, carrega os módulos especificados usando o módulo './module.js'
        if(package.kugel.config.modules){
    
            const module = require('./module.js');
    
            // Exibir mensagem sobre módulos
            console.log('@starting Modulos');
    
            // Carregar módulos
            await module.load(package.kugel.modules);

        }

        // Gravar o ID do processo (PID) para fins de depuração
        fs.writeFileSync(path.join(process.env.ROOT, 'lastpid'), process.pid.toString(), 'utf-8')
    
        console.log("@started Iniciado " + (new Date() - startedAt) + "ms");

        // Chama a função de resolução da Promise para iniciar o aplicativo
        triggerStart();

    } catch(err){
        
        // Exibe mensagem de erro e encerra o processo
        if(err){

            console.error("@error Fatal Error");
            console.error(err);
    
        }
    
    }

})();
