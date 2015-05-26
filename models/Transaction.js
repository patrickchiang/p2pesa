module.exports = function (sequelize, Sequelize) {
    var Transaction = sequelize.define('Transaction', {
        one_time_code: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        amount: {
            type: Sequelize.DECIMAL,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
                Transaction.belongsTo(models.User, {as: 'sender'});
                Transaction.belongsTo(models.User, {as: 'receiver'});
            }
        }
    });

    return Transaction;
};