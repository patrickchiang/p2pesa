module.exports = function (app) {
    var models = require('../models');
    var ensure = require('./ensure.js')
    var utility = require('./utility.js')

    var config = require('../config');
    var twilio = require('twilio');
    var client = twilio(config.twilio_sid, config.twilio_auth);
    var phone = require('phone');


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
                return;
            }

            utility.validateTransaction(req.user.id, receiver.id, req.body.amount, function (valid) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    res.redirect('/transfer?valid=false');
                    return;
                } else {
                    models.Transaction.create({
                        amount: req.body.amount,
                        senderId: req.user.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            console.log('Transaction complete.');
                            res.redirect('/transfer?valid=true');
                            return;
                        });
                    });
                }
            });
        });
    });

    app.post('/user-transfer', ensure.user, function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'User') {
                res.redirect('/transfer?valid=false');
                return;
            }

            utility.validateTransaction(req.user.id, receiver.id, req.body.amount, function (valid) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    res.redirect('/transfer?valid=false');
                    return;
                } else {
                    models.Transaction.create({
                        amount: req.body.amount,
                        senderId: req.user.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            console.log('Transaction complete.');
                            res.redirect('/secure');
                            return;
                        });
                    });
                }
            });
        });
    });

    app.post('/withdraw', ensure.branch, function (req, res) {
        if (req.body.code != req.user.one_time_code) {
            res.redirect('/withdraw?valid=false');
            return;
        }

        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'Branch') {
                res.redirect('/withdraw?valid=false');
                return;
            }

            models.User.find({
                where: {
                    phone: req.user.withdraw_target
                }
            }).then(function (sender) {
                utility.validateTransaction(sender.id, receiver.id, req.user.withdraw_amount, function (valid) {
                    console.log('Valid: ' + valid);
                    if (!valid) {
                        res.redirect('/withdraw?valid=false');
                        return;
                    } else {
                        models.Transaction.create({
                            amount: req.user.withdraw_amount,
                            senderId: sender.id,
                            receiverId: receiver.id
                        }).then(function (transaction) {
                            transaction.save().then(function () {
                                console.log('Withdrawal complete.');
                                res.redirect('/withdraw?valid=true');
                                return;
                            });
                        });
                    }
                });
            });
        });
    });

    app.post('/mobile', function (req, res) {
        if (twilio.validateExpressRequest(req, config.twilio_auth)) {
            var message = req.body.Body;
            var amount = Number(utility.getWordAt(message, message.indexOf('$')).substring(1));
            var sender = req.body.From;
            var n = message.split(' ');
            var receiver = n[n.length - 1];

            console.log(message);
            console.log(amount);
            console.log(sender);
            console.log(receiver);
        } else {
            res.send('You are not twilio.  Buzz off.');
        }
    });
};