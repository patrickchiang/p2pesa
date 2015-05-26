module.exports = function (sequelize, Sequelize) {
    var User = sequelize.define('User', {
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        username: {
            type: Sequelize.STRING,
            allowNull: true,   // TODO: change
            unique: true
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },
        profile_image: {
            type: Sequelize.STRING,
            allowNull: false
        }
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
                User.hasMany(models.Photo);
                User.hasMany(models.Album);
            }
        }
    });

    return User;
};