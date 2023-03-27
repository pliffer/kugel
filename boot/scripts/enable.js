const fs   = require('fs');
const path = require('path');

let name = process.argv[2];

if(!name) {

    console.log('@error No module name provided');

    process.exit();

}

let modulePath = path.join(process.cwd(), 'modules', name);

if(!fs.existsSync(modulePath)) {

    console.log('@error Module not installed');

    process.exit();

}

let packageLocation = path.resolve(process.cwd(), 'package.json');

let package = require(packageLocation);

if(!package.kugel.modules.default) {

    package.kugel.modules.default = [];

}

if(package.kugel.modules.default.includes(name)) {

    console.log('@error Module already enabled');

    process.exit();

}

package.kugel.modules.default.push(name);

fs.writeFileSync(packageLocation, JSON.stringify(package, null, 4));

console.log('@info Module enabled');