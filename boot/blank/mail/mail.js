const Email      = require('email-templates');
const nodemailer = require('nodemailer');
const path       = require('path');

const _uuid = require('uuid');

const uuid = _uuid.v4;

const email = new Email({
    juice: true
});

let Mail = {

    databaseSchema: {

        mail: '\
            CREATE TABLE `mail` (\
              `id` bigint unsigned NOT NULL AUTO_INCREMENT,\
              `created_at` bigint unsigned DEFAULT NULL,\
              `uuid` text,\
              `sent_at` bigint unsigned DEFAULT NULL,\
              `opened` tinyint(1) DEFAULT 0,\
              `opened_at` bigint unsigned DEFAULT NULL,\
              `from` text,\
              `to` text,\
              `content` longtext,\
              `subject` text,\
              `template` text,\
              UNIQUE KEY `id` (`id`)\
            );\
        ',

        mail_blacklist: '\
            CREATE TABLE `mail_blacklist` (\
              `id` bigint unsigned NOT NULL AUTO_INCREMENT,\
              `created_at` bigint unsigned DEFAULT NULL,\
              `mail` varchar(128) DEFAULT NULL,\
              UNIQUE KEY `id` (`id`)\
            );\
        '

    },

    install(){

        // @todo Passar por todas as tabelas acima e instalar

    },

    uninstall(){

        // @todo Dar um drop em todas as tabelas acima e verificar se foram removidas com sucessop
        // @todo Permitir opção de fazer backup dos dados

    },

    files: {
        routes: 'routes'
    },

    simpleSend(opts){

        let newOpts = opts.data;

        if(opts.attachments){
            newOpts.attachments = opts.attachments;
        }

        return Mail.byTemplate(opts.to, opts.from, opts.subject, opts.template, newOpts);

    },

    // Armazena o e-mail que está prestes a ser
    // enviado no banco de dados
    create(id, opts, to, from, subject, template, content){

        if(typeof id === 'undefined') id = uuid();

        let created_at = new Date().getTime();

        content = content.replace(/[\u0800-\uFFFF]/g, '');

        return global.db.updateQuery("INSERT INTO mail(created_at, `uuid`, `to`, `from`, subject, template, content) VALUES(?, ?, ?, ?, ?, ?, ?)", [created_at, id, to, from, subject, template, content]).then(() => {

            // Envia o e-mail
            return Mail.send(to, from, subject, content, opts);

        });

    },

    checkBlacklist(mail){

        return global.db.readQuery("SELECT * FROM mail_blacklist WHERE mail = ? LIMIT 1", [mail]);

    },

    send(to, from, subject, html, opts){

        console.log('Tentando enviar e-mail');

        return new Promise((resolve, reject) => {

            try{

                var transporter = nodemailer.createTransport({

                    host: process.env.SMTP_HOST,
                    secure: true,
                    // secureConnection: true,
                    port: 465,
                    // requireTLS: true,

                    auth: {

                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS

                    },

                    // tls:{

                    //     // Para que o email possa ser enviado é preciso manter o tls desativado por hora
                    //     // @todo Pesquisar sobre como encontrar 
                    //     rejectUnauthorized: false

                    // }
                });

                var mailOptions = {

                    from: from,
                    to: to,
                    subject: subject,
                    html: html

                }

                if(opts && opts.attachments){

                    mailOptions.attachments = opts.attachments;

                }

                if(opts && opts.unsubscribe){

                    mailOptions.list = {

                        unsubscribe: {
                            url: opts.unsubscribe,
                            comment: 'Permite escolher quais listas de e-mail deseja desinscrever-se'
                        }

                    }

                }

                transporter.sendMail(mailOptions, function(err, info){

                    if (err) {
                        reject(err);
                    } else {

                        Mail.setSent(opts.uuid);
                        resolve(info.response);

                    }

                });

            } catch(e){

                reject(e);

            }

        });

    },

    byTemplate(to, from, subject, template, opts){

        let id = uuid();

        opts.uuid = id;

        let productionUrl = `${process.env.PROTOCOL}://${process.env.HOST}`;

        if(process.env.PRODUCTION_URL){

            productionUrl = process.env.PRODUCTION_URL;

        }

        opts.webBeacon = `${productionUrl}/beacon/${id}/mail-logo.png`;

        return Mail.checkBlacklist(to).then(blacklisted => {

            if(blacklisted) return Promise.reject("Este e-mail está blacklistado");

            // return Tokens.generate('unsubscribe', to, 48).then(unsubscribeToken => {

                // opts.unsubscribe = `https://astr.app/unsubscribe/${to}/${unsubscribeToken}`;            

                // Cria o html para o e-mail
                return email.render(template, opts).then(html => {

                    return Mail.create(id, opts, to, from, subject, template, html).then(() => {

                        if(global.config.verbose) console.log(`E-mail enviado para ${to} (${subject})`);

                    })

                });

            // });

        });

    },

    // Define que o e-mail foi aberto
    setOpen(id){

        let opened_at = new Date().getTime();

        // @todo Marcar sempre que houver uma atualização que abriu o e-mail
        // e também marcar qual foi o inicializador(imagem ou link)

        // Marca como aberto apenas os que não foram ainda abertos
        return global.db.updateQuery("UPDATE mail SET opened = true, opened_at = ? WHERE uuid = ? AND opened_at IS NULL", [opened_at, id]);

    },

    // Define que o e-mail foi enviado
    setSent(id){

        let sent_at = new Date().getTime();

        return global.db.updateQuery("UPDATE mail SET sent_at = ? WHERE uuid = ?", [sent_at, id]);

    },

    simple: {

        byTemplate(to, from, subject, template, opts = {}){

            console.log(`Começando a enviar o e-mail para ${to}`);

            // Cria o html para o e-mail
            return email.render(template, opts).then(html => {

                return Mail.simple.create(to, from, subject, html, opts).then(() => {

                    console.log(`E-mail enviado para ${to} (${subject})`);

                });

            });

        },

        create(to, from, subject, html, opts){

            html = html.replace(/[\u0800-\uFFFF]/g, '');

            // Envia o e-mail
            return Mail.send(to, from, subject, html, opts);

        }

    }

}

module.exports = Mail;

global.app.onload(() => {

    global.cl.add('test mail', () => {});

});