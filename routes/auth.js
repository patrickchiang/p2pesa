module.exports = function (app) {
    var bcrypt = require('bcrypt-nodejs');

    var passport = require('passport')
    var LocalStrategy = require('passport-local').Strategy;

    var session = require('express-session');
    var bodyParser = require('body-parser');

    var config = require('../config');
    var client = require('twilio')(config.twilio_sid, config.twilio_auth);
    var phone = require('phone');

    var models = require('../models');

    /**
     * Sessions setup
     */

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    app.use(session({
        secret: config.session_secret,
        resave: true,
        saveUninitialized: true
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    /**
     * Passport serialization
     */

    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (user, done) {
        done(null, user);
    });

    /**
     * Passport local strategy users setup
     */

    passport.use('local-user', new LocalStrategy({
            usernameField: 'phone',
            passwordField: 'pin'
        },
        function (username, password, done) {
            models.User.find({phone: username}).then(function (user) {
                if (user == null)
                    return done(null, false);

                if (bcrypt.compareSync(password, user.pin)) {

                    // Generate random 5 digit code
                    var code = (Math.random() + 1).toString(36).substring(2, 7).toUpperCase();

                    user.one_time_code = code;
                    user.save();

                    //Send an SMS text message
                    client.sendMessage({
                        to: phone(user.phone)[0],
                        from: config.twilio_phone,
                        body: 'Your code is: ' + code

                    }, function (err, responseData) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    return done(null, {
                        phone: user.phone
                    });
                } else {
                    return done(null, false);
                }
            }).error(function (err) {
                return done(null, false);
            });
        }
    ));

    passport.use('local-user-two', new LocalStrategy({
            usernameField: 'phone',
            passwordField: 'code'
        },
        function (username, password, done) {
            models.User.find({phone: username}).then(function (user) {
                if (user == null)
                    return done(null, false);

                if (password == user.one_time_code) {
                    return done(null, {
                        phone: user.phone,
                        one_time_code: user.one_time_code
                    });
                } else {
                    return done(null, false);
                }
            }).error(function (err) {
                return done(null, false);
            });
        }
    ));

    /**
     * Routing
     */

    app.post('/login-user', passport.authenticate('local-user', {failureRedirect: 'index.html'}), function (req, res) {
        res.redirect('confirm.html');
    });

    app.post('/login-user-two', passport.authenticate('local-user-two', {failureRedirect: 'confirm.html'}), function (req, res) {
        res.redirect('secure.html');
    });

    app.post('/register-user', function (req, res) {
        models.User.find({phone: req.body.phone}).then(function (model) {
            if (model != null) {
                console.log('User already found');
                res.status(409).end();
            } else {
                models.User.create({
                    phone: req.body.phone,
                    pin: bcrypt.hashSync(req.body.pin),
                    branch_status: 'User'
                }).then(function (result) {
                    passport.authenticate('local-user')(req, res, function () {
                        res.json('/');
                    });
                }).catch(function (err) {
                    console.log(err);
                });
            }
        });
    });

    app.get('/init', function (req, res) {
        console.log('Creating and zeroing database');
        models.sequelize.sync({force: true}).then(function (stuff) {

            console.log('Saving Central Bank User');
            models.User.create({
                phone: '2063029844',
                pin: bcrypt.hashSync('secure'),
                branch_status: 'Central',
                one_time_code: 'GOOD'
            }).then(function (user) {
                user.save().then(function () {
                    res.json('initing...');
                });
            });
        });
    });

    app.post('/mobile', function (req, res) {
        if (twilio.validateExpressRequest(req, config.twilio_auth)) {
            console.log(req.body);
        } else {
            res.send('you are not twilio.  Buzz off.');
        }
    });

    app.get('/logout', function (req, res) {
        req.logout();
        delete req.session.secondFactor;
        res.redirect('index.html');
    });

};