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

/**
 * Views
 */

app.get('/', function (req, res, next) {
    res.redirect('/index.html');
});

app.get('/index.html', function (req, res) {
    res.render('index.jade');
});

app.get('/confirm.html', ensure.user, function (req, res) {
    res.render('confirm.jade');
});

app.get('/secure.html', ensure.user, ensure.twostep, function (req, res) {
    res.render('secure.jade');
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