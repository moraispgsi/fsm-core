
/**
 * Created by Ricardo Morais on 25/02/2017.
 *
 * This module is the core for modeling Finite-state machines using SCXML. It is simply a database that can be used in
 * the versioning of SCXML Finite-state machine models. This module also validates the SCXML.
 **/


 /**
 * Uses the sequelize library to connect to a database using the information given, a database library as to be
 * installed and its type should be sent as the dialect
 *
 * # One of the following libraries will suffice:
 * $ npm install --save pg pg-hstore
 * $ npm install --save mysql2
 * $ npm install --save sqlite3
 * $ npm install --save tedious // MSSQL
 *
 * The dialect should be one of the following
 * dialect: 'mysql'|'sqlite'|'postgres'|'mssql',
 *
 * @param dialect A string representing the database technology 'mysql'|'sqlite'|'postgres'|'mssql'
 * @param host The host of the database
 * @param user The user
 * @param password The user password
 * @param database The name of the database
 * @returns {Promise} Returns a promise that will return an object interface for this module
 */
module.exports = function (dialect, host, user, password, database, config) {

    //Load dependencies
    let co = require('co');                //For a easier promise handling experience
    let Sequelize = require('sequelize');  //For a ORM for the database
    const fs = require('fs');              //For file reading
    const xmllint = require('xmllint');    //For SCXML Validations

    return co(function*() {

        config = config || {};
        config.host = host;
        config.dialect = dialect;
        config.pool = {
            max: 5,
            min: 0,
            idle: 10000
        };

        //Setup sequelize with the database parameters received
        let sequelize = new Sequelize(database, user, password, config);

        let tablePrefix = 'FSMCore';  //The prefix of every table in the database
        let meta = {};                //The module is stored in this object
        meta.sequelize = sequelize;   //Store an initialized sequelize.js instance
        meta.moduleName = 'fsm-core'; //The name of the module
        meta.model = {};              //Stores the model definitions
        meta.query = {};              //Stores the functions that query the database
        meta.action = {};             //Stores the actions available
        meta.utils = {};              //Stores utility facilities

        /**
         * This table holds the finite-state machines declarations, each row represent a finite-state machine
         * @type {Object} Model table definition
         */
        meta.model.fsm = sequelize.define(tablePrefix + 'Fsm', {
            name: {type: Sequelize.STRING, allowNull: false, unique: true},
        }, {
            freezeTableName: true,
            underscoredAll: false
        });

        /**
         * This table holds the finite-state machines version, each row represent a version of a
         * finite-state machine model
         * @type {Object} Model table definition
         */
        meta.model.version = sequelize.define(tablePrefix + 'Version', {
            isSealed: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
            scxml: {type: Sequelize.TEXT, allowNull: true}
        }, {
            freezeTableName: true,
            underscoredAll: false
        });

        /**
         * Verifies if a version is sealed
         * @param versionID the version ID
         * @returns {*} Returns a promise to return a boolean value
         */
        meta.query.isVersionSealed = function (versionID) {
            return co(function*(){
                let version = yield meta.model.version.findById(versionID);
                if (!version) {
                    throw new Error('version not found');
                }
                return version.dataValues.isSealed;
            });
        };

        /**
         * Gets a finite-state machine by its name
         * @param name the name of the finite-state machine
         * @returns {*} Returns a promise to return the finite-state machine
         */
        meta.query.getFsmByName = function (name) {
            return co(function*(){
                let fsm = yield meta.model.fsm.findOne({
                    where: {
                        name: name
                    }
                });
                if (!fsm) {
                    throw new Error('fsm not found');
                }
                return fsm;
            });
        };

        /**
         * Returns the latest sealed finite-state machine version
         * @param fsmID the id of the finite-state machine
         * @returns {*} Returns a promise to return the latest sealed version
         */
        meta.query.getLatestSealedFsmVersion = function (fsmID) {
            return co(function*(){
                let version = yield meta.model.version.findOne({
                    where: {
                        fsmID: fsmID,
                        isSealed: true
                    },
                    order: [ [ 'createdAt', 'DESC' ] ]
                });
                if (!version) {
                    throw new Error('version not found');
                }
                return version;
            });
        };
        /**
         * Creates a new Finite-state machine model
         * @param name The name of the finite-state machine model
         */
        meta.action.createFSM = function (name) {
            return sequelize.transaction(function (t) {
                return co(function*() {
                    let fsm = yield meta.model.fsm.create({name: name}, {transaction: t});
                    let version = yield meta.model.version.create({fsmID: fsm.dataValues.id}, {transaction: t});
                    return {fsm: fsm, version: version};
                });
            });
        };
        /**
         * Removes a Finite-State machine model if there is only one version and that version is not sealed
         * @param fsmID the Finite-State machine id
         * @returns {Promise} A promise to remove the Finite-State machine model
         */
        meta.action.removeFSMModel = function (fsmID) {
            return co(function*() {
                let fsm = yield meta.model.fsm.findById(fsmID);
                if (!fsm) {
                    throw new Error('FSM not found');
                }
                let versions = yield meta.model.version.findAll({where: {fsmID: fsm.dataValues.id}});
                if (versions.length > 1) {
                    throw new Error('FSM has more than one version');
                }
                //Fms has at least one version therefor the array has one version
                if (versions[0].dataValues.isSealed) {
                    throw new Error('fsm version is sealed');
                }
                //Cascade deletion
                yield fsm.destroy();
            });
        };

        /**
         * Removes a Finite-State machine model version if the version is not sealed
         * @param versionID The id of the Finite-State machine model version
         * @returns {Promise} A promise to remove the Finite-State machine model version
         */
        meta.action.removeFSMModelVersion = function (versionID) {
            return co(function*() {
                let version = yield meta.model.version.findById(versionID);

                if (!version) {
                    throw new Error('version not found');
                }

                if (version.dataValues.isSealed) {
                    throw new Error('fsm version is sealed');
                }

                let fsm = meta.model.fsm.findOne({
                    where: {
                        id: version.dataValues.fsmID
                    }
                });
                //If the fsm has only one version, the fsm  must be removed
                version.destroy();
                let count = yield meta.model.version.count({where: {id: versionID}});
                //There is only one version and the version is not sealed
                if (count === 0) {
                    fsm.destroy();
                }
            });
        };
        /**
         * Sets the current scxml for a FSM model version
         * @param versionID The id of the FSM model version
         * @param scxml A string SCXML
         * @returns {Promise} A Promise to set SCXML of the FSM model version
         */
        meta.action.setScxml = function (versionID, scxml) {
            return co(function*(){
                let version = yield meta.model.version.findById(versionID);
                let versionValues = version.dataValues;

                if (versionValues.isSealed) {
                    throw new Error("Version is already sealed.");
                }

                yield meta.model.version.update({
                    scxml: scxml,
                }, {
                    where: {id: versionID}
                });
            });
        };

        /**
         * Seals a FSM model version if it is not already sealed and the scxml of the version is valid
         * @param versionID The id of the FSM model version
         * @returns {Promise} A Promise to seal the version and return the new version
         */
        meta.action.seal = function (versionID) {
            return co(function*() {

                let version = yield meta.model.version.findById(versionID);
                let versionValues = version.dataValues;
                if (versionValues.isSealed) {
                    throw new Error("Version is already sealed.");
                }

                //Validate the SCXML
                yield meta.utils.validateSCXML(versionValues.scxml);

                yield meta.model.version.update({
                    isSealed: true,
                }, {
                    where: {id: versionID}
                });

            });
        };

        /**
         * Clones a FSM model version, the cloning process creates a new finite-state machine with only one version
         * whose data match the FSM model version to be copied. The newly created version will be unsealed
         * @param versionID The id of the FSM model version to clone
         * @param fsmName The name of the new finite-state machine
         * @returns {Promise} A Promise to create the clone and return an object with the fsm data and the version data
         */
        meta.action.clone = function (versionID, fsmName) {
            return co(function*() {
                let data = yield meta.model.fsm.createFSM(fsmName);
                let fsmVersion = data.version;
                let version = yield meta.model.version.findById(versionID);
                let scxml = version.dataValues.scxml;
                yield meta.model.version.update({
                    scxml: scxml
                }, { where: { id: fsmVersion.dataValues.id} });
                return data;
            });
        };

        /**
         * Creates a fork from the a FSM Model version. This will generate a new version with the same exact model of
         * the version to fork and the new version will reference the old one. The version to fork must also be sealed
         * @param versionID The id of the version to fork
         * @returns {Promise} A Promise to fork a FSM model version and return the version.
         */
        meta.action.fork = function (versionID) {
            return co(function*(){
                let version = yield meta.model.version.findById(versionID);
                yield meta.assert.assertVersionSealed(versionID);
                let scxml = version.dataValues.scxml;
                let newVersion = yield meta.model.version.create({
                    fsmID: version.dataValues.fsmID,
                    versionParentForkID: version.dataValues.id,
                    scxml: scxml
                });
                return newVersion;
            });
        };

        /**
         * Validates a SCXML string
         * The validation is done using the xmllint npm library
         * https://github.com/kripken/xml.js/issues/8
         * @param {String} scxml A string with the SCXML document to validate
         * @returns {Promise} A Promise that validates the SCXML string
         */
        meta.utils.validateSCXML = function(scxml){
            return co(function*(){

                let xsdFiles = [];
                let xmlxsd = fs.readFileSync('xmlSchemas/xml.xsd','utf8')

                //Using a flattened scxml.xsd file from https://www.w3.org/2011/04/SCXML/scxml.xsd
                //The flattening was done using oXygen XML Editor in Tools > Flatten Schema
                let scxmlxsd = fs.readFileSync('xmlSchemas/scxml.xsd','utf8')
                xsdFiles.push(xmlxsd);
                xsdFiles.push(scxmlxsd);

                let opts = {
                    xml: scxml,
                    schema: xsdFiles,
                };

                let errors = xmllint.validateXML(opts).errors;
                if(errors) {
                    throw new Error(errors);
                }

            });
        };

        //Creating the table relationships
        meta.model.version.belongsTo(meta.model.fsm, {foreignKey: 'fsmID', constraints: false, onDelete: 'CASCADE'});
        meta.model.version.belongsTo(meta.model.version, {
            foreignKey: 'versionParentForkID',
            constraints: false,
            onDelete: 'CASCADE'
        });

        yield sequelize.sync();
        return meta;

    });

};
