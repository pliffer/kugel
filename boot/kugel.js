const path = require('path')
const fs   = require('fs-extra')

let Logs = require('./logs')
let Util = require('./util')

Logs.init(global.dir.root + '/.logs')

if(!process.env.APP_NAME || !process.env.SECRET){

    setTimeout(Util.env.generate, 1000)

    return

}

// Require configuration file
global.config = global.package.kugel.config

const port     = process.env.PORT     || 8080
const host     = process.env.HOST     || 'localhost'
const protocol = process.env.PROTOCOL || 'http'

// @todo Rodar função global.config.setup para aliviar esse arquivo
// e deixar o sistema mais modular

module.exports = {

    lightstart(f){

        return f()

    },

    finalstart(f){

        global.app.load()

        return f()

    }

}

fs.ensureDirSync(global.dir.models)
fs.ensureDirSync(global.dir.storage)
fs.ensureDirSync(global.dir.modules)
fs.ensureDirSync(global.dir.routes)
fs.ensureDirSync(global.dir.controllers)
fs.ensureDirSync(global.dir.doc)

fs.ensureDirSync(path.join(global.dir.doc, 'generated-files'))

fs.ensureDirSync(global.dir.data)

if(global.dir.views){

    fs.ensureDirSync(global.dir.views)
    fs.ensureDirSync(path.join(global.dir.views, 'components'));
    fs.ensureDirSync(path.join(global.dir.views, 'components', 'header'));
    fs.ensureDirSync(path.join(global.dir.views, 'components', 'body'));

}

if (global.dir.assets) {

    fs.ensureDirSync(global.dir.assets)

}

// Require main modules
const express = require('express')
const http    = require('http')

if (global.config.database) {

    global.db = require(path.join(global.dir.boot, 'database.js'));
    global.Database = global.db

}

if(global.config.modules){

    global.dir.modules = path.join(global.dir.root, 'modules')

    fs.ensureDirSync(global.dir.modules)

}

// Aqui, geramos as chaves .pem
if(global.config.jwt) Util.generateKeyPairs()

// Enable the socket io
if (global.config.socket) {
    var socket = require('socket.io')
}

// Enables the module of gzip compression
if (global.config.gzip) {
    var compression = require('compression')
}

if (global.config.morgan) {
    var morgan = require('morgan')
}

if (global.config.session) {
    var session     = require('express-session')
    var mysql_store = require('express-mysql-session')(session)

    if (global.config.socket) {
        var io_session = require('express-socket.io-session')
    }
}

if (global.config.body_parser){
    var bodyParser  = require('body-parser')
}

if(global.config.socket){

    global.io = null

    global.socket = {

        // @todo Mover para uma área melhor
        loggedUsers: {},

        setup(io){

            global.io = io

            global.modules.module.getComponentStack('socket-middleware').forEach(socketComponent => {

                io.use(socketComponent)

            })

            io.on('connection', socket => {

                socket.on('login', (jwt, callback) => {

                    console.log('Login de socket')

                    global.modules.module.getComponentStack('socket-con').forEach(socketComponent => {

                        socketComponent(socket)

                    })

                    if(typeof callback === 'undefined') callback = function(){}

                    socket.emit('checksum', global.helpers.vars.checksum)

                    global.helpers.jwt.verify(jwt).then(decoded => {

                        socket.decoded = decoded

                        Users.setLastLogin(decoded.mail)

                        socket.join('logged')
                        socket.join('user_' + decoded.id)

                        callback()

                    })

                })

            })

        }

    }

}

// Set the constants
const app = express()

if (global.config.body_parser) {

    app.use(bodyParser.json({

        limit: process.env.BODYPARSER_LIMIT || '250mb'

    }))

    app.use(bodyParser.urlencoded({

        limit: process.env.BODYPARSER_LIMIT || '250mb',

        // @todo Verificar necessidade de colocar o extended em .env
        extended: true

    }))

}

// Warning: CORS
if (global.config.cors) {

    app.use((req, res, next) => {

        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Credentials', 'true')
        res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Access-Control-Allow-Methods, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, action, x-access-token')
        res.header('Access-Control-Allow-Methods', '*')

        next()

    })

}

global.modules.module.getComponentStack('express-middleware').forEach(middleware => {

    app.use(middleware)

})

var server = http.createServer(app)

if (global.config.socket) {
    var io = socket.listen(server)
}

// Configure the gzip
if (global.config.gzip){

    app.use(compression({filter: shouldCompress}))
     
    function shouldCompress (req, res) {
      if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
      }
     
      // fallback to standard filter function
      return compression.filter(req, res)
    }

}

// Enable delivery of static content
if (global.config.assets) {

    fs.ensureDirSync(path.join(global.dir.assets, 'js'))
    fs.ensureDirSync(path.join(global.dir.assets, 'css'))

    fs.ensureDirSync(path.join(global.dir.assets, 'vendor', 'js'))
    fs.ensureDirSync(path.join(global.dir.assets, 'vendor', 'css'))

    // Configure the assets folder
    app.use(express.static(global.dir.assets))

}

// Template engine
if (global.config.template_engine) {

    app.set('cache view', true)

    app.set('views', global.dir.views)
    app.set('view engine', global.config.template_engine)

}

// Setup the morgan looger
if (global.config.morgan) app.use(morgan('dev', {

    skip: function (req, res) {

        var splited = req.originalUrl.split('/')

        if(req.url === '/api/instance-data') return true

        if(splited[1] === 'customer' && splited[splited.length-1] === 'image'){
            return true
        }

    }

}))

// Handles the session
if (global.config.session) {

    // Store session on mysql
    var session_store = new mysql_store({}, global.Database)

    // Express session
    var express_session = session({
        secret: process.env.SECRET,
        resave: true,
        saveUninitialized: true,
        store: session_store
    })

    // Express session manager
    app.use(express_session)

}

if (global.config.session && global.config.socket){
    // Handles the shared session of socket io-express
    io.use(io_session(express_session, {
        autoSave:true
    }))
}

global.app.onload(() => {

    global.modules.module.onComponent('onload express-middleware', middleware => {

        middleware(app);

    })

    // Ignore cordova.js 404 error on browser environment
    app.get('cordova.js', (req, res) => res.send(''))

    if(global.modules.cl){

        global.modules.cl.init(process)

        Util.cl.setup(global.modules.cl)

    }

})

server.listen(port, () => {

    console.log(`@info ${process.env.APP_NAME} listening on ${protocol}://${host}:${port}`)

    if (global.config.socket) {

        global.socket.setup(io)

    }

    fs.writeFile(path.join(global.dir.logs, 'last.pid'), process.pid.toString(), 'utf-8')

    global.helpers.f.checksum()

    if(global.app.onstartserver) global.app.onstartserver(app)

})
