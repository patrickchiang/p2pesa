module.exports = {
    validateTransaction: validateTransaction,
    userSum: userSum
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