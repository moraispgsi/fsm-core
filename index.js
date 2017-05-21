
/**
 * Created by Ricardo Morais on 25/02/2017.
 *
 * This module is the core for modeling Finite-state machines using SCXML. It is simply a database that can be used in
 * the versioning of SCXML Finite-state machine models. This module also validates the SCXML.
 **/
//  ______   ______     __    __           ______     ______     ______     ______
// /\  ___\ /\  ___\   /\ "-./  \         /\  ___\   /\  __ \   /\  == \   /\  ___\
// \ \  __\ \ \___  \  \ \ \-./\ \        \ \ \____  \ \ \/\ \  \ \  __<   \ \  __\
//  \ \_\    \/\_____\  \ \_\ \ \_\        \ \_____\  \ \_____\  \ \_\ \_\  \ \_____\
//   \/_/     \/_____/   \/_/  \/_/         \/_____/   \/_____/   \/_/ /_/   \/_____/
//

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
        meta.isVersionSealed = function (versionID) {
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
        meta.getFsmByName = function (name) {
            return co(function*(){
                let fsm = yield meta.model.fsm.findOne({
                    where: {
                        name: name
                    }
                });
                if (!fsm) {
                    throw new Error('fsm not found');
                }
                return fsm.dataValues;
            });
        };

        /**
         * Finds a finite-state machine by ID
         * @param fsmID The ID of the finite-state machine
         * @returns {*} A promise to return the finite-state machine
         */
        meta.getFsmById = function (fsmID) {
            return co(function*(){
                let fsm = yield meta.model.fsm.findById(fsmID);
                if(!fsm) {
                    throw new Error("version not found");
                }
                return fsm.dataValues;
            });
        };

        /**
         * Finds a version by ID
         * @param versionID The ID of the version
         * @returns {*} A promise to return the version
         */
        meta.getVersionById = function (versionID) {
            return co(function*(){
                let version = yield meta.model.version.findById(versionID);
                if(!version) {
                    throw new Error("version not found");
                }
                return version.dataValues;
            });
        };

        /**
         * Returns the latest sealed finite-state machine version
         * @param fsmID the id of the finite-state machine
         * @returns {*} Returns a promise to return the latest sealed version
         */
        meta.getLatestSealedFsmVersion = function (fsmID) {
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
                return version.dataValues;
            });
        };

        /**
         * Returns the latest finite-state machine version
         * @param fsmID the id of the finite-state machine
         * @returns {*} Returns a promise to return the latest sealed version
         */
        meta.getLatestFsmVersion = function (fsmID) {
            return co(function*(){
                let version = yield meta.model.version.findOne({
                    where: {
                        fsmID: fsmID,
                    },
                    order: [ [ 'createdAt', 'DESC' ] ]
                });
                if (!version) {
                    throw new Error('version not found');
                }
                return version.dataValues;
            });
        };

        /**
         * Gets all the versions of a finite-state machine
         * @param fsmID the finite-state machine id
         * @returns an Array of versions
         */
        meta.getFsmVersions = function (fsmID) {
            return co(function*(){
                let versions = yield meta.model.version.findAll({
                    where: {
                        fsmID: fsmID
                    },
                });
                if (!versions) {
                    return [];
                }

                versions = versions.map(function(version){
                    return version.dataValues;
                });

                return versions;
            });
        };

        /**
         * Gets all the versions that are sealed of a finite-state machine
         * @param fsmID the finite-state machine id
         * @returns an Array of versions
         */
        meta.getFsmSealedVersions = function (fsmID) {
            return co(function*(){
                let versions = yield meta.model.version.findAll({
                    where: {
                        fsmID: fsmID,
                        isSealed: true
                    },
                });
                if (!versions) {
                    return [];
                }

                versions = versions.map(function(version){
                    return version.dataValues;
                });

                return versions;
            });
        };

        /**
         * Creates a new Finite-state machine model.
         * @param name The name of the finite-state machine model
         * @returns {Promise} A promise to create a finite-state machine model and return an object with
         * a fsm property and a version property which is the first unsealed version
         */
        meta.createFSM = function (name) {
            return sequelize.transaction(function (t) {
                return co(function*() {
                    let fsm = yield meta.model.fsm.create({name: name}, {transaction: t});
                    let version = yield meta.model.version.create({fsmID: fsm.dataValues.id}, {transaction: t});
                    return {fsm: fsm.dataValues, version: version.dataValues};
                });
            });
        };

        /**
         * Removes a Finite-State machine model if there is only one version and that version is not sealed
         * @param fsmID the Finite-State machine id
         * @returns {Promise} A promise to remove the Finite-State machine model
         */
        meta.removeFSMModel = function (fsmID) {
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
        meta.removeFSMModelVersion = function (versionID) {
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
        meta.setScxml = function (versionID, scxml) {
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
        meta.seal = function (versionID) {
            return co(function*() {

                let version = yield meta.model.version.findById(versionID);
                let versionValues = version.dataValues;
                if (versionValues.isSealed) {
                    throw new Error("Version is already sealed.");
                }

                //Validate the SCXML
                yield meta.validateSCXML(versionValues.scxml);

                yield meta.model.version.update({
                    isSealed: true,
                }, {
                    where: {id: versionID}
                });

            });
        };

        /**
         * Creates a new version from of a finite-state machine. The new version will reference the old one. The
         * latest version must be sealed
         * @param fsmID The id of the finite-state machine to create a new version of
         * @returns {Promise} A Promise to create a new version of the FSM model return the version.
         */
        meta.newVersion = function (fsmID) {
            return co(function*(){
                let version = yield meta.getLatestFsmVersion(fsmID);
                let isVersionSealed = yield meta.isVersionSealed(version.id);
                if(!isVersionSealed) {
                    throw new Error("The latest version must be sealed");
                }
                let scxml = version.dataValues.scxml;
                let newVersion = yield meta.model.version.create({
                    fsmID: version.dataValues.fsmID,
                    parentVersionID: version.dataValues.id,
                    scxml: scxml
                });
                return newVersion.dataValues;
            });
        };

        /**
         * Validates a SCXML string
         * The validation is done using the xmllint npm library
         * https://github.com/kripken/xml.js/issues/8
         * @param {String} scxml A string with the SCXML document to validate
         * @returns {Promise} A Promise that validates the SCXML string
         */
        meta.validateSCXML = function(scxml){
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
            foreignKey: 'parentVersionID',
            constraints: false,
            onDelete: 'CASCADE'
        });

        yield sequelize.sync();
        return meta;

    });

};
