const fs   = require('fs-extra');
const path = require('path');

require('colors');

let name = process.argv[2];

if(!name) {

    console.log('@error No module name provided'.red);

    process.exit();

}

let nodeModulePath = path.join(process.cwd(), 'node_modules', name);

if(!fs.existsSync(nodeModulePath)) {

    console.log('@error Module not installed at node_modules'.red);

    process.exit();

}

let modulePath = path.join(process.cwd(), 'modules', name);

if(fs.existsSync(modulePath)) {

    console.log('@error Module already exists at modules'.red);

    process.exit();

}

fs.moveSync(nodeModulePath, modulePath);

console.log('@success Node Module moved to /modules');