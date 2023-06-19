#!/usr/bin/env node
let Component = require('./module/kugel-components/components.js');

global.Component = Component;

Object.defineProperty(String.prototype, 'require', {
    get: function(){

        if(!process.env[this.toString()]) throw new Error(`Environment variable ${this.toString()} not found`);

        return require(process.env[this.toString()]);
    }
});

module.exports = {

    Component: Component,

    init(){

        return require('./boot/start');

    }

}