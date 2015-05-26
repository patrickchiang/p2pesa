module.exports = function (sequelize, Sequelize) {
    var User = sequelize.define('User', {
        phone: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        pin: {
            type: Sequelize.STRING,
            allowNull: true    // null for non-users
        },
        branch_status: {
            type: Sequelize.STRING,
            allowNull: true
        },
        one_time_code: {
            type: Sequelize.STRING,
            allowNull: true
        }
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
            }
        }
    });

    return User;
};