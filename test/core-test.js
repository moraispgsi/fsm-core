require('expectations');
let path = require("path");
let Sequelize = require("sequelize");
let indexPath = path.join(__dirname, '../index.js');
let co = require('co');
let init = require(indexPath);

describe('This suite tests the repository interface', () => {
    it('Should be able to add and remove machines', (done) => {
        co(function*(){


            done();
        }).then();
    });

    it('Should be able to insert and remove a version', (done) => {
        co(function*(){


            done();
        }).then();
    });
});

describe('This suit tests the core functions of the module', () => {

    it('Create a state-machine', (done) => {
        co(function*(){


            done();
        }).then();
    });

    it('Create a finite-state machine set the SCXML, seal a version and create a new version ', (done) => {
        co(function*(){



            done();
        }).then();
    });

    it('Testing getters', (done) => {
        co(function*() {

        }).then();
    })
});
