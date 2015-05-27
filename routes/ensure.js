module.exports = {
    user: ensureUser,
    twostep: ensureSecondFactor,
    elevated: ensureElevated,
    central: ensureCentral,
    save: saveRedirect
};

function saveRedirect(req, res, next) {
    req.session.returnTo = req.url;
    return next();
}

function ensureUser(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/');
}

function ensureSecondFactor(req, res, next) {
    if (req.isAuthenticated() && req.user.one_time_code != null) {
        return next();
    }

    res.redirect('/confirm');
}

function ensureElevated(req, res, next) {
    if (req.isAuthenticated() && (req.user.branch_status == 'Central' || req.user.branch_status == 'Branch')) {
        return next();
    }

    res.redirect('/branch');
}

function ensureCentral(req, res, next) {
    if (req.isAuthenticated() && req.user.branch_status == 'Central') {
        return next();
    }

    res.redirect('/branch');
}