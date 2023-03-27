let fs = require('fs');
let path = require('path');

console.log('@info Creating a new module');

let name = process.argv[2];

if(!name) {

    console.log('@error No module name provided');

    process.exit();

}

let modulePath = path.join(process.cwd(), 'modules', name);

if(fs.existsSync(modulePath)) {

    console.log('@error Module already exists');

    process.exit();

}

fs.mkdirSync(modulePath);

fs.writeFileSync(path.join(modulePath, 'index.js'), `module.exports = () => {

    console.log('@info Module ${name} loaded');

};

module.exports();`);

fs.writeFileSync(path.join(modulePath, 'package.json'), JSON.stringify({
    name: name,
    version: '1.0.0',
    description: 'A module created with Kugel',
    main: 'index.js',
    kugel: {
        version: 2
    }
}, null, 4));

console.log('@info Module created');
console.log('npm run enable ' + name + ' #to enable it');