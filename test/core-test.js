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
                done();
            }).then();
        });

        it('Create new version ', (done) => {

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

                yield meta.setScxml(data1.version.id,"<scxml xmlns=\"http://www.w3.org/2005/07/scxml\" version=\"1.0\" datamodel=\"ecmascript\"> </scxml>").then();

                yield meta.seal(data1.version.id).then();
                let data2 = yield meta.newVersion(data1.fsm.id).then();
                expect(data2.hasOwnProperty("id")).toBeTruthy();
                expect(data2.hasOwnProperty("fsmID")).toBeTruthy();
                expect(data2.hasOwnProperty("createdAt")).toBeTruthy();
                expect(data2.hasOwnProperty("updatedAt")).toBeTruthy();

                //Clean up
                yield meta.model.version.destroy({
                    where: {
                        id: data2.id
                    }
                });

                yield meta.model.version.destroy({
                    where: {
                        id: data1.version.id
                    }
                });

                yield meta.model.fsm.destroy({
                    where: {
                        id: data1.fsm.id
                    }
                });

                done();
            }).then();
        });
    });
});