let fs = require('fs');
let path = require('path');

let name = process.argv[2];

if(!name) {

    console.log('@error No module name provided');

    process.exit();

}

let modulePath = path.join(__dirname, '../..', 'modules', name);

if(!fs.existsSync(modulePath)) {

    console.log('@error Module does not exist');

    process.exit();

}

let packageLocation = path.resolve(__dirname, '../../package.json');

let package = require(packageLocation);

for(let step in package.kugel.modules) {

    let modules = package.kugel.modules[step];

    if(modules.includes(name)) {

        modules.splice(modules.indexOf(name), 1);

    }
}

// if(package.kugel.modules.lightstart.includes(name)) {

//     console.log('@error Module not enabled');

//     process.exit();

// }

// package.kugel.modules.lightstart.splice(package.kugel.modules.lightstart.indexOf(name), 1);

fs.writeFileSync(packageLocation, JSON.stringify(package, null, 4));

console.log('@info Module disabled');
