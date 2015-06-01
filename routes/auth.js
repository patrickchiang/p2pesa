module.exports = function (app) {
    var bcrypt = require('bcrypt-nodejs');

    var passport = require('passport')
    var LocalStrategy = require('passport-local').Strategy;

    var session = require('express-session');
    var bodyParser = require('body-parser');

    var config = require('../config');
    var twilio = require('twilio');
    var client = twilio(config.twilio_sid, config.twilio_auth);
    var phone = require('phone');

    var models = require('../models');
    var ensure = require('./ensure.js')

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
            models.User.find({
                where: {
                    phone: username
                }
            }).then(function (user) {
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
                        id: user.id,
                        phone: user.phone,
                        branch_status: user.branch_status
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
            models.User.find({
                where: {
                    phone: username
                }
            }).then(function (user) {
                if (user == null)
                    return done(null, false);

                if (password == user.one_time_code) {
                    return done(null, {
                        id: user.id,
                        phone: user.phone,
                        one_time_code: user.one_time_code,
                        branch_status: user.branch_status
                    });
                } else {
                    return done(null, false);
                }
            }).error(function (err) {
                return done(null, false);
            });
        }
    ));

    passport.use('local-elevated', new LocalStrategy({
            usernameField: 'phone',
            passwordField: 'pin'
        },
        function (username, password, done) {
            models.User.find({
                where: {
                    phone: username
                }
            }).then(function (user) {
                if (user == null)
                    return done(null, false);

                if (bcrypt.compareSync(password, user.pin)) {
                    return done(null, {
                        id: user.id,
                        phone: user.phone,
                        branch_status: user.branch_status
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

    app.post('/login-user', function (req, res, next) {
        passport.authenticate('local-user', function (err, user, info) {
            if (err) {
                return res.render('index.jade', {message: 'Login failed!'});
            }
            if (!user) {
                return res.render('index.jade', {message: 'Login failed!'});
            }
            req.logIn(user, function (err) {
                if (err) {
                    return res.render('index.jade', {message: 'Login failed!'});
                }
                return res.redirect('/confirm');
            });
        })(req, res, next);
    });

    app.post('/login-elevated', function (req, res, next) {
        passport.authenticate('local-elevated', function (err, user, info) {
            if (err) {
                return res.render('branch.jade', {message: 'Login failed!'});
            }
            if (!user) {
                return res.render('branch.jade', {message: 'Login failed!'});
            }
            req.logIn(user, function (err) {
                if (err) {
                    return res.render('branch.jade', {message: 'Login failed!'});
                }
                return res.redirect('/branch');
            });
        })(req, res, next);
    });

    app.post('/login-user-two', function (req, res, next) {
        passport.authenticate('local-user-two', function (err, user, info) {
            if (err) {
                return res.render('index.jade', {message: 'Bad confirmation code!'});
            }
            req.logIn(user, function (err) {
                if (err) {
                    return res.render('index.jade', {message: 'Bad confirmation code!'});
                }
                return res.redirect('/secure');
            });
        })(req, res, next);
    });

    app.post('/central-register', function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (model) {
            if (model != null) {
                console.log('User already found');
                res.render('register.jade', {user: req.user, message: 'Branch already exists!'});
            } else {
                models.User.create({
                    phone: req.body.phone,
                    pin: bcrypt.hashSync(req.body.pin),
                    branch_status: 'Branch'
                }).then(function (result) {
                    console.log('Branch created.');
                    res.render('register.jade', {user: req.user, message: 'Branch successfully registered!'});
                }).catch(function (err) {
                    console.log(err);
                });
            }
        });
    });

    app.post('/branch-register', function (req, res) {
        models.User.find({
            where: {
                phone: req.body.phone
            }
        }).then(function (model) {
            if (model != null) {
                console.log('User already found');
                res.render('register.jade', {user: req.user, message: 'User already exists!'});
            } else {
                models.User.create({
                    phone: req.body.phone,
                    pin: bcrypt.hashSync(req.body.pin),
                    branch_status: 'User'
                }).then(function (result) {
                    console.log('User created.');
                    res.render('register.jade', {user: req.user, message: 'User successfully registered!'});
                }).catch(function (err) {
                    console.log(err);
                });
            }
        });
    });

    app.get('/logout', function (req, res) {
        req.logout();
        delete req.session.secondFactor;
        res.redirect('/');
    });

};