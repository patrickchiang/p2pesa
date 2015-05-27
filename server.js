/**
 * Module imports
 */

var express = require('express');
var app = express();

var Sequelize = require('sequelize');

var models = require('./models');
var ensure = require('./routes/ensure.js');

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
    res.render('confirm.jade');
});

app.get('/secure', ensure.user, ensure.twostep, function (req, res) {
    res.render('secure.jade');
});

app.get('/branch', ensure.save, function (req, res) {
    res.render('branch.jade', {user: req.user});
});

app.get('/transfer', ensure.save, ensure.user, function (req, res) {
    res.render('transfer.jade', {user: req.user});
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