module.exports = function (app) {
    var models = require('../models');
    var ensure = require('./ensure.js')

    app.post('/central-transfer', ensure.central, function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'Branch')
                res.json('invalid target');

            models.Transaction.create({
                amount: req.body.amount,
                senderId: 1,
                receiverId: receiver.id
            }).then(function (transaction) {
                transaction.save().then(function () {
                    console.log('Transaction complete.');
                    res.redirect('/transfer');
                });
            });
        })
    });

    app.post('/branch-transfer', ensure.branch, function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'User') {
                res.redirect('/transfer?valid=false');
            }

            validateTransaction(req.user.id, receiver.id, req.body.amount, function (valid) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    res.redirect('/transfer?valid=false');
                } else {
                    models.Transaction.create({
                        amount: req.body.amount,
                        senderId: req.user.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            console.log('Transaction complete.');
                            res.redirect('/transfer?valid=true');
                        });
                    });
                }
            });
        });
    });

    app.post('/user-transfer', ensure.branch, function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'User') {
                res.redirect('/transfer?valid=false');
            }

            validateTransaction(req.user.id, receiver.id, req.body.amount, function (valid) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    res.redirect('/transfer?valid=false');
                } else {
                    models.Transaction.create({
                        amount: req.body.amount,
                        senderId: req.user.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            console.log('Transaction complete.');
                            res.redirect('/transfer?valid=true');
                        });
                    });
                }
            });
        });
    });

    function validateTransaction(senderId, receiverId, amount, done) {
        if (amount <= 0) {
            done(false);
        }

        if (senderId == receiverId) {
            done(false);
        }

        userSum(senderId, function (sum) {
            done(sum >= amount);
        });
    }

    function userSum(userId, done) {
        models.Transaction.findAll({
            where: models.Sequelize.or(
                {receiverId: userId},
                {senderId: userId}
            )
        }).then(function (transactions) {
            var sum = 0;
            for (var i = 0; i < transactions.length; i++) {
                var t = transactions[i];
                if (t.receiverId == userId) {
                    sum += t.amount;
                } else if (t.senderId == userId) {
                    sum -= t.amount;
                }
            }

            done(sum);
        });
    }
};