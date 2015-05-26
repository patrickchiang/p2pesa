module.exports = function (app) {

    var bcrypt = require('bcrypt-nodejs');
    var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
    var session = require('express-session');
    var bodyParser = require('body-parser');

    var models = require('../models');

    /**
     * Sessions setup
     */

    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());

    app.use(session({
        secret: 'patrick is the best as always',
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
            usernameField: 'email',
            passwordField: 'pass'
        },
        function (username, password, done) {
            models.User.find({
                where: models.Sequelize.or(
                    {username: username},
                    {email: username}
                )
            }).then(function (users) {
                var results = users;

                if (results == null)
                    return done(null, false);
                if (bcrypt.compareSync(password, results.password)) {
                    var user = results;
                    return done(null, {
                        user_id: user.id,
                        email: user.email,
                        username: user.username,
                        profile_image: user.profile_image
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

    app.post('/login', passport.authenticate('local-user'), function (req, res) {
        res.json(req.session.returnTo || '/');
    });

    app.post('/register', function (req, res) {
        models.User.find({
            where: {
                email: req.body.email
            }
        }).then(function (model) {
            if (model != null) {
                console.log("already found");
                res.status(409).end();
            } else {
                models.sequelize.transaction(function (t) {
                    return models.User.create({
                        email: req.body.email,
                        password: bcrypt.hashSync(req.body.pass),
                        username: req.body.username
                    }, {transaction: t}).then(function (user) {
                        return models.Album.create({
                            name: 'Default',
                            caption: 'Default Album',
                            UserId: user.id
                        }, {transaction: t});
                    });
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

    app.get('/logout', function (req, res) {
        req.logout();
        res.redirect('/login.html');
    });

};