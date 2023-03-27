let fs     = require('fs-extra');
let path   = require('path');
let colors = require('colors');

// Turn the /module to /node_modules

let name = process.argv[2];

if(!name) {

    console.log('@error No module name provided'.red);

    process.exit();

}

let modulePath = path.join(process.cwd(), 'modules', name);

if(!fs.existsSync(modulePath)) {

    console.log('@error Module not installed at /modules'.red);

    process.exit();

}

let nodeModulePath = path.join(process.cwd(), 'node_modules', name);

if(fs.existsSync(nodeModulePath)) {

    console.log('@error Module already exists at /node_modules'.red);

    process.exit();

}

fs.moveSync(modulePath, nodeModulePath);

console.log('@success Module moved to /node_modules');