module.exports = function (app) {
    var models = require('../models');
    var ensure = require('./ensure.js')

    app.post('/central-transfer', ensure.central, function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (user) {
            if (user == null || user.branch_status != 'Branch')
                res.json('invalid target');

            models.Transaction.create({
                amount: req.body.amount,
                senderId: 1,
                receiverId: user.id
            }).then(function (transaction) {
                transaction.save().then(function(){
                    console.log('Transaction complete.');
                    res.redirect('/transfer');
                });
            });
        })
    });
};