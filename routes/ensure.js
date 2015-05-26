module.exports = {user: ensureAuthenticated, twostep: ensureSecondFactor};

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.returnTo = req.url;
    res.redirect('/index.html');
}

function ensureSecondFactor(req, res, next) {
    if (req.isAuthenticated() && req.user.one_time_code != null) {
        return next();
    }
    req.session.returnTo = req.url;
    res.redirect('/confirm.html');
}