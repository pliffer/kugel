let Component = require('./component.js');

class Components {

    constructor() {
        this.list = {};
        this.onComponentListeners = {};
    }

    get(name) {

        if (!this.list[name]) {

            this.list[name] = new Component(name);

        }

        return this.list[name];
        
    }

    stack(name) {

        return this.get(name).stack;

    }

    on(name, callback) {

        return this.get(name).on(callback);

    }

    register(name, obj) {

        return this.get(name).add(obj);

    }

}

module.exports = new Components();
  