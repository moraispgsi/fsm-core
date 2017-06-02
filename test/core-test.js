require('expectations');
let path = require("path");
let Sequelize = require("sequelize");
let indexPath = path.join(__dirname, '../index.js');
let co = require('co');
let init = require(indexPath);


let dbhost = process.env.DATABASE_HOST;
let dbport = process.env.DATABASE_PORT;
let dbname = process.env.DATABASE_NAME;
let dbuser = process.env.DATABASE_USER;
let dbpass = process.env.DATABASE_PASSWORD;
let dialect = process.env.DIALECT;


describe('This suite tests the database model definition', () => {
    it('Should be able to insert and remove new fsm', (done) => {
        co(function*(){
            let meta = yield init(dialect, dbhost, dbuser, dbpass, dbname, {logging: false, port: dbport});
            yield meta.model.fsm.destroy({
                where: {
                    name: "testingFiniteStateMachine"
                }
            });
            let data = yield meta.model.fsm.create({
                name: "testingFiniteStateMachine"
            });
            expect(data.dataValues.hasOwnProperty("id")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("name")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("updatedAt")).toBeTruthy();
            yield meta.model.fsm.destroy({
                where: {
                    name: "testingFiniteStateMachine"
                }
            });
            meta.sequelize.close();
            done();
        }).then();
    });

    it('Should be able to insert and remove new version', (done) => {
        co(function*(){
            let meta = yield init(dialect, dbhost, dbuser, dbpass, dbname, {logging: false, port: dbport});

            yield meta.model.fsm.destroy({
                where: {
                    name: "testingFiniteStateMachine"
                }
            });

            let data = yield meta.model.fsm.create({
                name: "testingFiniteStateMachine"
            });

            expect(data.dataValues.hasOwnProperty("id")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("name")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("updatedAt")).toBeTruthy();
            yield meta.model.version.destroy({
                where: {
                    parentVersionID: -1000
                }
            });

            data = yield meta.model.version.create({
                fsmID: data.dataValues.id,
                parentVersionID: -1000,
                scxml: '<scxml></scxml>',
                parentVersionID: 1
            });

            expect(data.dataValues.hasOwnProperty("id")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("fsmID")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("scxml")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("parentVersionID")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data.dataValues.hasOwnProperty("updatedAt")).toBeTruthy();

            //Clean up
            yield meta.model.version.destroy({
                where: {
                    parentVersionID: -1000
                }
            });

            yield meta.model.fsm.destroy({
                where: {
                    name: "testingFiniteStateMachine"
                }
            });
            meta.sequelize.close();
            done();
        }).then();
    });
});

describe('This suit tests the core functions of the module', () => {

    it('Create a state-machine', (done) => {
        co(function*(){
            let init = require(indexPath);
            let meta = yield init(dialect, dbhost, dbuser, dbpass, dbname, {logging: false, port: dbport});
            let data = yield meta.createFSM("testingFiniteStateMachine").then();

            expect(data.hasOwnProperty("fsm")).toBeTruthy();
            expect(data.fsm.hasOwnProperty("id")).toBeTruthy();
            expect(data.fsm.hasOwnProperty("name")).toBeTruthy();
            expect(data.fsm.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data.fsm.hasOwnProperty("updatedAt")).toBeTruthy();


            expect(data.hasOwnProperty("version")).toBeTruthy();
            expect(data.version.hasOwnProperty("id")).toBeTruthy();
            expect(data.version.hasOwnProperty("fsmID")).toBeTruthy();
            expect(data.version.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data.version.hasOwnProperty("updatedAt")).toBeTruthy();

            //Clean up
            yield meta.model.version.destroy({
                where: {
                    id: data.version.id
                }
            });

            yield meta.model.fsm.destroy({
                where: {
                    id: data.fsm.id
                }
            });
            meta.sequelize.close();
            done();
        }).then();
    });

    it('Create a finite-state machine set the SCXML, seal a version and create a new version ', (done) => {

        co(function*(){
            let meta = yield init(dialect, dbhost, dbuser, dbpass, dbname, {logging: false, port: dbport});
            let data1 = yield meta.createFSM("testingFiniteStateMachine").then();

            expect(data1.hasOwnProperty("fsm")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("id")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("name")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("updatedAt")).toBeTruthy();

            expect(data1.hasOwnProperty("version")).toBeTruthy();
            expect(data1.version.hasOwnProperty("id")).toBeTruthy();
            expect(data1.version.hasOwnProperty("fsmID")).toBeTruthy();
            expect(data1.version.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data1.version.hasOwnProperty("updatedAt")).toBeTruthy();

            let scxml = "<scxml xmlns=\"http://www.w3.org/2005/07/scxml\" version=\"1.0\" datamodel=\"ecmascript\"> </scxml>";
            yield meta.setScxml(data1.version.id, scxml).then();
            yield meta.seal(data1.version.id).then();
            let data2 = yield meta.newVersion(data1.fsm.id).then();
            expect(data2.hasOwnProperty("id")).toBeTruthy();
            expect(data2.hasOwnProperty("fsmID")).toBeTruthy();
            expect(data2.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data2.hasOwnProperty("updatedAt")).toBeTruthy();

            let retrievedVersion = yield meta.model.version.findById(data2.id);
            expect(retrievedVersion.dataValues.hasOwnProperty("id")).toBeTruthy();
            expect(retrievedVersion.dataValues.hasOwnProperty("isSealed")).toBeTruthy();
            expect(retrievedVersion.dataValues.hasOwnProperty("scxml")).toBeTruthy();
            expect(retrievedVersion.dataValues.hasOwnProperty("parentVersionID")).toBeTruthy();
            expect(retrievedVersion.dataValues.hasOwnProperty("fsmID")).toBeTruthy();
            expect(retrievedVersion.dataValues.hasOwnProperty("createdAt")).toBeTruthy();
            expect(retrievedVersion.dataValues.hasOwnProperty("updatedAt")).toBeTruthy();

            expect(retrievedVersion.dataValues.scxml).toEqual(scxml);
            expect(retrievedVersion.dataValues.isSealed).toEqual(false);

            //Clean up
            yield meta.model.version.destroy({
                where: {
                    id: data2.id
                }
            }).then();

            yield meta.model.version.destroy({
                where: {
                    id: data1.version.id
                }
            }).then();

            yield meta.model.fsm.destroy({
                where: {
                    id: data1.fsm.id
                }
            }).then();

            meta.sequelize.close();
            done();

        }).then();
    });

    it('Testing getters', (done) => {

        co(function*() {
            let meta = yield init(dialect, dbhost, dbuser, dbpass, dbname, {logging: false, port: dbport});
            yield meta.model.fsm.destroy({
                where: {
                    name: "testingFiniteStateMachine"
                }
            });
            let data1 = yield meta.createFSM("testingFiniteStateMachine").then();

            expect(data1.hasOwnProperty("fsm")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("id")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("name")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data1.fsm.hasOwnProperty("updatedAt")).toBeTruthy();

            expect(data1.hasOwnProperty("version")).toBeTruthy();
            expect(data1.version.hasOwnProperty("id")).toBeTruthy();
            expect(data1.version.hasOwnProperty("fsmID")).toBeTruthy();
            expect(data1.version.hasOwnProperty("createdAt")).toBeTruthy();
            expect(data1.version.hasOwnProperty("updatedAt")).toBeTruthy();

            let fsm = yield meta.getFsmByName("testingFiniteStateMachine");
            expect(fsm.hasOwnProperty("id")).toBeTruthy();
            expect(fsm.hasOwnProperty("name")).toBeTruthy();
            expect(fsm.hasOwnProperty("createdAt")).toBeTruthy();
            expect(fsm.hasOwnProperty("updatedAt")).toBeTruthy();
            expect(fsm.name).toEqual("testingFiniteStateMachine");

            fsm = yield meta.getFsmById(fsm.id);
            expect(fsm.hasOwnProperty("id")).toBeTruthy();
            expect(fsm.hasOwnProperty("name")).toBeTruthy();
            expect(fsm.hasOwnProperty("createdAt")).toBeTruthy();
            expect(fsm.hasOwnProperty("updatedAt")).toBeTruthy();
            expect(fsm.name).toEqual("testingFiniteStateMachine");

            let fsms = yield meta.getAllFsms();
            expect(fsms.filter((fsm)=> fsm.id === data1.fsm.id).length === 1).toBeTruthy();

            let versions = yield meta.getAllVersions();
            expect(versions.filter((version)=> version.id === data1.version.id).length === 1).toBeTruthy();

            let version = yield meta.getVersionById(data1.version.id);
            expect(data1.version.id === version.id).toBeTruthy();

            version = yield meta.getLatestFsmVersion(data1.fsm.id);
            expect(data1.version.id === version.id).toBeTruthy();

            yield meta.model.version.destroy({
                where: {
                    id: data1.version.id
                }
            }).then();

            yield meta.model.fsm.destroy({
                where: {
                    id: data1.fsm.id
                }
            }).then();

            meta.sequelize.close();
            done();

        }).then();
    })
});
