module.exports = function (app) {
    var models = require('../models');
    var ensure = require('./ensure.js')
    var utility = require('./utility.js')

    var config = require('../config');
    var twilio = require('twilio');
    var client = twilio(config.twilio_sid, config.twilio_auth);
    var phone = require('phone');
    var bcrypt = require('bcrypt-nodejs');

    app.post('/central-transfer', ensure.central, function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'Branch')
                res.render('transfer.jade', {user: req.user, message: 'Invalid branch!'});

            models.Transaction.create({
                amount: req.body.amount,
                senderId: 1,
                receiverId: receiver.id
            }).then(function (transaction) {
                transaction.save().then(function () {
                    console.log('Transaction complete.');
                    res.render('transfer.jade', {user: req.user, message: 'Transfer completed successfully!'});
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
                res.render('transfer.jade', {user: req.user, message: 'Invalid user!'});
                return;
            }

            utility.validateTransaction(req.user.id, receiver.id, req.body.amount, function (valid) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    res.render('transfer.jade', {user: req.user, message: 'Invalid add amount!'});
                    return;
                } else {
                    models.Transaction.create({
                        amount: req.body.amount,
                        senderId: req.user.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            console.log('Transaction complete.');
                            res.render('transfer.jade', {
                                user: req.user,
                                message: 'Transfer completed successfully!'
                            });
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
                res.render('transfer.jade', {user: req.user, message: 'Invalid user!'});
                return;
            }

            utility.validateTransaction(req.user.id, receiver.id, req.body.amount, function (valid) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    res.render('transfer.jade', {user: req.user, message: 'Invalid transfer amount!'});
                    return;
                } else {
                    models.Transaction.create({
                        amount: req.body.amount,
                        senderId: req.user.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            console.log('Transaction complete.');
                            res.render('transfer.jade', {user: req.user, message: 'Transfer completed successfully!'});
                            return;
                        });
                    });
                }
            });
        });
    });

    app.post('/withdraw', ensure.branch, function (req, res) {
        if (req.body.code != req.user.one_time_code) {
            res.render('withdraw.jade', {user: req.user, message: 'Wrong confirmation code!'});
            return;
        }

        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (receiver) {
            if (receiver == null || receiver.branch_status != 'Branch') {
                res.render('withdraw.jade', {user: req.user, message: 'Invalid phone number!'});
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
                        res.render('withdraw.jade', {user: req.user, message: 'Invalid withdrawal amount!'});
                        return;
                    } else {
                        models.Transaction.create({
                            amount: req.user.withdraw_amount,
                            senderId: sender.id,
                            receiverId: receiver.id
                        }).then(function (transaction) {
                            transaction.save().then(function () {
                                res.render('withdraw.jade', {
                                    user: req.user,
                                    message: 'Withdrawal completed successfully!'
                                });
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
            var senderPhone = req.body.From;
            var n = message.split(' ');
            var receiverPhone = n[n.length - 1];

            models.User.find({
                where: {
                    phone: receiverPhone
                }
            }).then(function (receiver) {
                if (receiver == null) {
                    models.User.create({
                        phone: receiverPhone,
                        pin: bcrypt.hashSync('secure'),
                        branch_status: 'User'
                    }).then(function (result) {
                        smsSend(senderPhone, receiverPhone, amount, {id: result.id}, res);
                    });
                } else if (receiver.branch_status != 'User') {
                    client.sendMessage({
                        to: phone(senderPhone)[0],
                        from: config.twilio_phone,
                        body: 'Receiver is not a valid P2Pesa user. Please try again with another user.'

                    }, function (err, responseData) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    res.json('');
                    return;
                } else {
                    smsSend(senderPhone, receiverPhone, amount, receiver, res);
                }

            });
        } else {
            res.send('You are not twilio.  Buzz off.');
        }
    });

    function smsSend(senderPhone, receiverPhone, amount, receiver, res) {
        models.User.find({
            where: {
                phone: senderPhone
            }
        }).then(function (sender) {
            if (sender == null || sender.branch_status != 'User') {
                client.sendMessage({
                    to: phone(senderPhone)[0],
                    from: config.twilio_phone,
                    body: 'You are not a valid P2Pesa user. Please register an account.'

                }, function (err, responseData) {
                    if (err) {
                        console.log(err);
                    }
                });

                res.json('');
                return;
            }

            utility.validateTransaction(sender.id, receiver.id, amount, function (valid, sum) {
                console.log('Valid: ' + valid);
                if (!valid) {
                    client.sendMessage({
                        to: phone(senderPhone)[0],
                        from: config.twilio_phone,
                        body: 'Your send money request was not formatted correctly.'

                    }, function (err, responseData) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    res.json('');
                    return;
                } else {
                    models.Transaction.create({
                        amount: amount,
                        senderId: sender.id,
                        receiverId: receiver.id
                    }).then(function (transaction) {
                        transaction.save().then(function () {
                            client.sendMessage({
                                to: phone(receiverPhone)[0],
                                from: config.twilio_phone,
                                body: 'User ' + senderPhone + ' has sent you $' + amount + ' using P2Pesa!'

                            }, function (err, responseData) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            client.sendMessage({
                                to: phone(senderPhone)[0],
                                from: config.twilio_phone,
                                body: 'You have successfully sent ' + receiverPhone + ' $' + amount + '. Your balance is now $' + (sum - amount)
                            }, function (err, responseData) {
                                if (err) {
                                    console.log(err);
                                }
                            });

                            res.json('');
                            return;
                        });
                    });
                }
            });

        });
    }
};