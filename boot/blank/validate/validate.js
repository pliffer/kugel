const path = require('path');
const fs   = require('fs-extra');

const Schema = require('validate');
const Logs   = global.logs;

let Validate = {

    validations: {},

    _original: {},

    add(name, method, schema, output = {}){

        if(typeof schema == 'undefined'){

            console.log(`@error validate schema undefined ${name}`);
            return;

        }

        let finalName = name;

        if(name.substr(0, 1) != '/') finalName = '/' + name;

        if(typeof Validate.validations[name] === 'undefined'){

            Validate.validations[name] = {};

        }

        if(typeof Validate._original[finalName] === 'undefined'){

            Validate._original[finalName] = {};

        }

        Validate.validations[name][method] = new Schema(schema);

        for(param in schema){

            if(schema[param].type){

                schema[param].type = schema[param].type.toString().substr(9).split('() {')[0].toLowerCase();

            }

        }

        if(Object.keys(output).length == 0){

            console.log(`@warn no validate output on ${name}`)

        }

        Validate._original[finalName][method] = {
            input: schema,
            output: output
        };

        fs.writeJson(path.join(__dirname, 'validate.cache.json'), JSON.stringify(module.exports._original))

    },

    check(name, method, obj){

        if(typeof obj == 'undefined'){

            console.log(`@error validate param@check(obj) undefined (${name})`);
            return;

        }

        var errors = Validate.validations[name][method].validate(obj);

        // Aconteceu algum erro na validação
        if(errors.length){

            let list = [];

            errors.forEach(error => {

                list.push(error.toString());

            });

            let objCopy = JSON.parse(JSON.stringify(obj));

            // Deleta dados que não podem ficar logs log por segurança
            delete objCopy.password;
            delete objCopy.pass;

            Logs.save('validate.js', {
                list: list,
                name: name,
                obj: objCopy
            });

            return Promise.reject({
                success: false,
                status: 400,
                message: list
            });

        }

        return Promise.resolve();

    }

}

module.exports = Validate;

global.helpers.validate = module.exports;

if(!global.validate){
    global.validate = module.exports;
}