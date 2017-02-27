/**
 * Created by Ricardo Morais on 25/02/2017.
 */

module.exports = function(dialect, host, user, password, database) {

    let Sequelize = require('sequelize');
    let sequelize = new Sequelize(database, user, password, {
        host: host,
        dialect: dialect,
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        },
    });

    let moduleName = 'IOCore';

    let meta = {
        sequelize: sequelize,
        name: moduleName,

        query: {
            action: {
                createInput: (name) => {
                    return meta.model.Input.create({
                        name: name
                    });
                },
                createOutput: (name) => {
                    return meta.model.Output.create({
                        name: name
                    });
                }
            }
        },
        model: {
            Input: sequelize.define(moduleName + 'Input', {
                name: { type: Sequelize.STRING, allowNull: false, unique: true },
            }, {
                freezeTableName: true,
                underscoredAll: true
            }),
            Output: sequelize.define(moduleName + 'Output', {
                name: { type: Sequelize.STRING, allowNull: false, unique: true },
            }, {
                freezeTableName: true,
                underscoredAll: true
            })
        }
    };

    return meta;

};