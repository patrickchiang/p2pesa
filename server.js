/**
 * Module imports
 */

var express = require('express');
var app = express();

var Sequelize = require('sequelize');

var models = require('./models');
var ensure = require('./routes/ensure.js');
var utility = require('./routes/utility.js');

var config = require('./config');
var twilio = require('twilio');
var client = twilio(config.twilio_sid, config.twilio_auth);
var phone = require('phone');

app.set('views', __dirname + '/site');

/**
 * Routes
 */

require('./routes/auth.js')(app);
require('./routes/transfer.js')(app);

/**
 * Views
 */

app.get('/', function (req, res, next) {
    res.render('index.jade');
});

app.get('/confirm', ensure.user, function (req, res) {
    res.render('confirm.jade', {user: req.user});
});

app.post('/confirm', ensure.branch, function (req, res) {
    if (req.body.amount && req.body.phone) {
        // send text message with amount
        var code = (Math.random() + 1).toString(36).substring(2, 7).toUpperCase();

        req.user.one_time_code = code;
        req.user.withdraw_amount = req.body.amount;
        req.user.withdraw_target = req.body.phone;

        //Send an SMS text message
        client.sendMessage({
            to: phone(req.body.phone)[0],
            from: config.twilio_phone,
            body: 'You are withdrawing $' + req.user.withdraw_amount + ' Your code is: ' + code

        }, function (err, responseData) {
            if (err) {
                console.log(err);
            }
        });

        res.render('confirm.jade', {user: req.user});
    } else {
        res.redirect('/withdraw');
    }
});

app.get('/secure', ensure.user, ensure.twostep, function (req, res) {
    utility.userSum(req.user.id, function (sum) {
        res.render('secure.jade', {user: req.user, sum: sum});
    });
});

app.get('/branch', ensure.save, function (req, res) {
    if (req.user == null) {
        res.render('branch.jade', {user: req.user, sum: 0});
        return;
    }

    utility.userSum(req.user.id, function (sum) {
        res.render('branch.jade', {user: req.user, sum: sum});
    });
});

app.get('/transfer', ensure.save, ensure.user, function (req, res) {
    res.render('transfer.jade', {user: req.user});
});

app.get('/withdraw', ensure.save, ensure.branch, function (req, res) {
    res.render('withdraw.jade', {user: req.user});
});

app.get('/register', ensure.save, ensure.elevated, function (req, res) {
    res.render('register.jade', {user: req.user});
});


/**
 * Static views
 */

app.use('/', express.static(__dirname + '/site'));

/**
 * Initialize server
 */
var server = app.listen(3000, function () {
    console.log('Listening on port %d', server.address().port);
});
server.timeout = 120000;
app.timeout = 120000;

process.on('uncaughtException', function (err) {
    console.error(err.stack);
    console.log("Node NOT Exiting...");
});