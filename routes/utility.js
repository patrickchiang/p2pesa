module.exports = {
    validateTransaction: validateTransaction,
    userSum: userSum,
    getWordAt: getWordAt
};

var models = require('../models');

function validateTransaction(senderId, receiverId, amount, done) {
    if (amount <= 0) {
        done(false);
    }

    if (senderId == receiverId) {
        done(false);
    }

    userSum(senderId, function (sum) {
        done(sum >= amount);
    });
}

function userSum(userId, done) {
    models.Transaction.findAll({
        where: models.Sequelize.or(
            {receiverId: userId},
            {senderId: userId}
        )
    }).then(function (transactions) {
        var sum = 0;
        for (var i = 0; i < transactions.length; i++) {
            var t = transactions[i];
            if (t.receiverId == userId) {
                sum += t.amount;
            } else if (t.senderId == userId) {
                sum -= t.amount;
            }
        }

        done(sum);
    });
}

// Get dollar amount where s is message
// Number(getWordAt(s, s.indexOf('$')).substring(1));

// Get last word in message
// var n = words.split(" ");
// n[n.length - 1];

function getWordAt(str, pos) {
    // Perform type conversions.
    str = String(str);
    pos = Number(pos) >>> 0;

    // Search for the word's beginning and end.
    var left = str.slice(0, pos + 1).search(/\S+$/),
        right = str.slice(pos).search(/\s/);

    // The last word in the string is a special case.
    if (right < 0) {
        return str.slice(left);
    }

    // Return the word, using the located bounds to extract it from the string.
    return str.slice(left, right + pos);
}