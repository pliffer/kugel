#!/usr/bin/env node
let Component = require('./module/kugel-components/components.js');

global.Component = Component;

module.exports = {

    Component: Component,

    init(){

        return require('./boot/start');

    }

}