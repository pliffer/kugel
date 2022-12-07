const fileUpload = require('express-fileupload')
const express    = require('express')
const path       = require('path')
const fs         = require('fs-extra')

module.exports = {

    registredRoutes: {
        delete: [],
        post:   [],
        put:    [],
        get:    []
    },

    STRING_MESSAGE: {

        success: {
            type: 'boolean'
        },

        message: {
            type: 'string'
        },

        unixtime: {
            type: 'integer'
        }

    },

    // @todo Modificar para object
    OBJECT_MESSAGE: {

        success: {
            type: 'boolean'
        },

        message: {
            type: 'string'
        },

        unixtime: {
            type: 'integer'
        }

    },

    ARRAY_MESSAGE: {

        success: {
            type: 'boolean'
        },

        message: {
            type: 'string'
        },

        unixtime: {
            type: 'integer'
        }

    },

    NO_MESSAGE: {

        success: {
            type: 'boolean'
        },

        unixtime: {
            type: 'integer'
        }

    },

    // @todo Alterar pro texto html de 404
    NOT_FOUND: {

        success: {
            type: 'boolean'
        },

        unixtime: {
            type: 'integer'
        }

    },

    router(app){

        // Passa por cada arquivo dentro de routes e o inicia
        fs.readdirSync(global.dir.routes).forEach(routeName => {

            let routeFile = path.join(global.dir.routes, routeName)

            let routeObj = require(routeFile)

            if(typeof routeObj === 'object') return

            let router = new express.Router()

            let routerFunctions = {

                get(route, f, opts){

                    module.exports.registredRoutes.get.push(route);

                    router.get(route, async (req, res) => {

                        if(opts && opts.file){
                            
                            res.sendFile(await f(req.query, req.params));

                        } else{

                            res.std(f(req.query, req.params));

                        }

                    })

                },

                getRaw(route, f, opts){

                    module.exports.registredRoutes.get.push(route);

                    router.get(route, async (req, res) => {

                        res.send(await f(req.query, req.params));

                    });

                },

                post(route, f){

                    module.exports.registredRoutes.post.push(route);

                    router.post(route, (req, res) => {

                        res.std(f(req.body, req.params))

                    })

                },

                put(route, f){

                    module.exports.registredRoutes.put.push(route);

                    router.put(route, (req, res) => {

                        res.std(f(req.body, req.params))

                    })

                }

            }

            global.modules.module.getComponentStack('express-sub-methods').forEach(subMethod => {

                subMethod(router, routerFunctions, module.exports);

            });

            routeObj(routerFunctions)

            // Caso a rota esteja prefixada
            if(typeof routeObj.route !== 'undefined'){

                // Router com prefixo
                app.use(routeObj.route, router)

            } else{

                // Router sem prefixo
                app.use(router)

            }

        })

    }

}

global.modules.module.addToComponent('express-middleware', (req, res, next) => {

    res.ifcan = (permissions, promise) => {

        if(typeof permissions == 'string') permissions = [permissions]

        var includeAll = true

        permissions.forEach(function(permission){

            if(!req.decoded.permissions || !req.decoded.permissions.includes(permission)){

                includeAll = false

            }

        })

        if(includeAll || req.decoded.permissions.includes('admin')){

            res.std(promise)

        } else{

            res.std(Promise.reject('401 - No permission'))

        }

    }

    res.std = promise => {

        // Turn the result into a promise
        if(typeof promise.then === 'undefined') promise = Promise.resolve(promise);

        promise.then(result => {

            res.json({
                success: true,
                message: result,
                unixtime: new Date().getTime()
            });

        }).catch(e => {

            if(typeof e === 'undefined') {

                res.json({
                    success: false,
                    message: 'undefined error',
                    unixtime: new Date().getTime()
                });

                return;

            }

            // If its standard way
            if((e.success || e.message) && e.status){
    
                res.status(e.status);

                // @todo Verificar se esse código é relevante
                delete e.status;
                res.json(e);

            } else{

                console.error('@error'.yellow, 'at', req.originalUrl, e.toString().red);

                if(typeof e === 'undefined') e = "";

                res.json({
                    success: false,
                    message: e.toString(),
                    unixtime: new Date().getTime()
                });

            }

        });

    }

    next()

})

global.modules.module.addToComponent('express-middleware', fileUpload())

global.modules.module.addToComponent('onload express-middleware', app => {

    module.exports.router(app);

});

global.app.onload(() => {

    global.cl.add('list routes', () => {

        let routes = global.modules.validate.validations;

        let doc = '';

        for(method in module.exports.registredRoutes){

            module.exports.registredRoutes[method].forEach(route => {

                let foundRoute = routes[route.substr(1)];

                if(foundRoute){

                    doc += "[" + method + "]", route, "{\n";

                    Object.keys(foundRoute.props).forEach(prop => {

                        let registry = foundRoute.props[prop].registry;
                        let required = registry.required.args[0];

                        let type = '';
                        let typeFunction = registry.type.args[0].toString();

                        if(typeFunction.indexOf('String') !== -1) type = 'String';
                        if(typeFunction.indexOf('Number') !== -1) type = 'Number';
                        if(typeFunction.indexOf('Array')  !== -1) type = 'Array';

                        doc += "    " + prop + ': ' + type + (required?" (required)":"") + "\n";

                    });
                    
                    doc += "}\n\n";

                } else{

                    doc += "[" + method + "]", route, "{}\n";


                }


            });

        }

        setTimeout(() => {

            // console.log(doc);

        }, 1000);

    });

    // Warning: CORS
    if (global.config.cors) {

        // @todo Impedir readição de componente, no caso de um HOTRELOAD
        global.modules.module.addToComponent('express-middleware', (req, res, next) => {

            res.header('Access-Control-Allow-Origin', '*')
            res.header('Access-Control-Allow-Credentials', 'true')
            res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, action, x-access-token')

            next()

        })

    }

})

