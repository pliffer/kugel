class Component {

    constructor(name) {
        
        this.name = name;

        this._stack     = [];
        this._listeners = [];

    }

    add(obj) {

        if (Array.isArray(obj)) {
            obj.forEach((item) => {
                this._stack.push(item);
            });
        } else {
            this._stack.push(obj);
        }

        this._listeners.forEach((f) => f(obj));

    }

    on(callback) {

        this._listeners.push(callback);

        this._stack.forEach((f) => {
            callback(f);
        });

    }

    get stack() {

        return this._stack;

    }

}

module.exports = Component;