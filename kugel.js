#!/usr/bin/env node

module.exports = {

    init(){

        return require('./boot/start');

    }

}

console.log(process.env);