let fs     = require('fs-extra');
let path   = require('path');
let colors = require('colors');

// Turn the /node_modules to /modules

let name = process.argv[2];

if(!name) {

    console.log('@error No module name provided'.red);

    process.exit();

}

let nodeModulePath = path.join(__dirname, '../..', 'node_modules', name);

if(!fs.existsSync(nodeModulePath)) {

    console.log('@error Module not installed at node_modules'.red);

    process.exit();

}

let modulePath = path.join(__dirname, '../..', 'modules', name);

if(fs.existsSync(modulePath)) {

    console.log('@error Module already exists at modules'.red);

    process.exit();

}

fs.moveSync(nodeModulePath, modulePath);

console.log('@success Node Module moved to /modules');