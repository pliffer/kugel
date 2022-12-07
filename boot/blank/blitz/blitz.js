const schedule = require("node-schedule");
// const profiler = require('v8-profiler-next');
const request  = require('request');
const spawn    = require('child_process').spawn;
const path     = require('path');
const fs       = require('fs-extra');
const os       = require('os');

const Blitz = {

    watchers: [],

    log(label, data, priority = 0){

        if(typeof data === 'undefined') data = '';

        console.log(label.green, data);

        module.exports.watchers.forEach(f => {

            f(label, data, priority);

        });

    },

    addWatcher(f){

        module.exports.watchers.push(f);

    }

}

module.exports = Blitz;

if(!global.blitz) global.blitz = module.exports;