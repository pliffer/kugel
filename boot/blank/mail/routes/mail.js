module.exports = (router) => {

    // @test
    router.get('/beacon/:id/mail-logo.png', (req, res) => {

        res.sendFile(global.dir.assets + '/img/favicon.png');

        global.helpers.mail.setOpen(req.params.id);

    });

    // Retorna o router
    return router

}