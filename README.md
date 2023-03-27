Definições gerais de kugel: 

    O app é um boilerplate para a criação de módulos dentro do framework kugel. Tem o objetivo de facilitar a criação de softwares
    dentro de qualquer linguagem de programação e em qualquer plataforma

    Gerenciamento de logs
    

Modulos principais:

	Server
		Interface de inicialização de um servidor http

		Observa pelo process.env.PORT para definir a porta de escuta, que por padrão é 8080

    Better Express
        Oferece uma interface de requisições http mais amigável, com camada de autenticação JWT e aguarda por promises

        router.jwt.get('/api', () => {

            return Promise.resolve()

        });

    Validate
        Permite a validação de dados enviados a uma rota de acordo com um schema

    Jwt
        Interface de geração de tokens JWT para autenticação de usuários e APIs
        
        .pem (JWT)

    Permissions
        Camada de abstração para validar as permissões atribuídas a um JWT


Boot
    logs.js
        Interface de armazenamento de logs de modo organizado

    module.js
        Interface de carregamento de módulos

    start.js
        Inicialização do framework

    util.js
        Funções utilitárias

    database.js [@deprecated - use relationalNoun]
        Interface de conexão com banco de dados

Package.json