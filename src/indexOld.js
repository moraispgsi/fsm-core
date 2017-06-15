
//  .d888
// d88P"
// 888
// 888888.d8888b 88888b.d88b.        .d8888b .d88b. 888d888 .d88b.
// 888   88K     888 "888 "88b      d88P"   d88""88b888P"  d8P  Y8b
// 888   "Y8888b.888  888  888888888888     888  888888    88888888
// 888        X88888  888  888      Y88b.   Y88..88P888    Y8b.
// 888    88888P'888  888  888       "Y8888P "Y88P" 888     "Y8888


module.exports = function(repositoryPath) {

    let nodegit = require("nodegit");
    let co = require("co");
    let fs = require("fs-extra");
    let jsonfile = require("jsonfile");
    let rimraf = require('rimraf');
    let debug = require("debug")("git");
    let validator = require('xsd-schema-validator');

    repositoryPath = repositoryPath || __dirname + "/repo";
    let machinesDirPath = repositoryPath + "/machines";
    let manifestPath = repositoryPath + "/manifest.json";
    let configPath = repositoryPath + "/config.json";

    debug("Using path %s", repositoryPath);

    /**
     * Initializes the repository connection
     * @method init
     * @returns {Promise} Repository connection
     */
    function init(){

        debug("Checking if there is a repository");
        return co(function*(){
            let repo;
            try {
                repo = yield nodegit.Repository.open(repositoryPath);
            } catch(err) {
                debug("Repository not found.");
                repo = yield _createRepository();
            }

            debug("Repository is ready");
            return repo;

        });
    }

    /**
     * Recursively gather the paths of the files inside a directory path
     * @method _getFiles
     * @param {String} path The directory path to search
     * @returns {Array} An Array of file paths belonging to the directory path provided
     */
    function _getFiles(path){
        let files = [];
        fs.readdirSync(path).forEach(function(file){
            let subpath = path + '/' + file;
            if(fs.lstatSync(subpath).isDirectory()){
                let filesReturned = _getFiles(subpath);
                files = files.concat(filesReturned);
            } else {
                files.push(path + '/' + file);
            }
        });
        return files;
    }

    /**
     * Commit to the repository
     * @method _commit
     * @param {Repository} repo The repository connection object
     * @param {Array} pathsToStage The array of file paths(relative to the repository) to be staged
     * @param {String} message The message to go along with this commit
     * @param {Array} pathsToUnstage The array of file paths(relative to the repository) to be un-staged
     * @returns {Array} An Array of file paths belonging to the directory path provided
     */
    function _commit(repo, pathsToStage, message, pathsToUnstage) {
        return co(function*(){
            repo = repo || (yield nodegit.Repository.open(repositoryPath));
            debug("Adding files to the index");
            let index = yield repo.refreshIndex(repositoryPath + "/.git/index");

            if(pathsToUnstage && pathsToUnstage.length && pathsToUnstage.length > 0) {
                for(let file of pathsToUnstage) {
                    yield index.removeByPath(file);
                }
                yield index.write();
                yield index.writeTree();
            }

            debug("Creating main files");
            let signature = nodegit.Signature.default(repo);
            debug("Commiting");
            yield repo.createCommitOnHead(pathsToStage, signature, signature, message || "Automatic initialization");
        });
    }

    /**
     * Create a new repository
     * @method _createRepository
     * @returns {Promise} Repository connection
     */
    function _createRepository() {
        return co(function*(){
            try {
                debug("Creating a new one");
                let repo = yield nodegit.Repository.init(repositoryPath, 0);
                debug("Connection established");
                debug("Creating main files");
                yield _createManifest(repo);
                yield _createConfig(repo);
                fs.mkdirSync(machinesDirPath);
                yield _commit(repo, ["manifest.json", "config.json"]);
                debug("Repository was successfully created");
                return repo;
            } catch (err) {
                debug(err);
                debug("Nuking the repository");
                yield new Promise(function(resolve, reject) {
                    rimraf(repositoryPath, function () {
                        resolve();
                    });
                }).then();
                throw new Error(err);
            }
        });
    }

    /**
     * Create the manifest file inside the repository
     * @method _createManifest
     * @returns {Promise}
     */
    function _createManifest(){
        let file = repositoryPath + '/manifest.json';
        let manifest = {
            machines: {}
        };

        return new Promise(function(resolve, reject) {
            debug("Creating manifest file");
            jsonfile.writeFile(file, manifest, function (err) {
                if(err){
                    debug("Failed to create the manifest file");
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * Create the config file inside the repository
     * @method _createManifest
     * @returns {Promise}
     */
    function _createConfig(){
        let file = repositoryPath + '/config.json';
        let config = {
            simulation: false
        };
        return new Promise(function(resolve, reject) {
            jsonfile.writeFile(file, config, function (err) {
                if(err){
                    reject(err);
                    return;
                }
                resolve();
            });

        });
    }

    /**
     * Retrieve the repository path
     * @method getRepositoryPath
     * @returns {String} The path to the repository
     */
    function getRepositoryPath(){
        return repositoryPath;
    }

    /**
     * Retrieve the repository manifest.json file as a JavasScript Object
     * @method getManifest
     * @returns {Object} The manifest Object
     */
    function getManifest(){
        return jsonfile.readFileSync(manifestPath);
    }

    /**
     * Update the repository manifest.json file using a JavasScript Object
     * @method setManifest
     * @param {Object} manifest The manifest Object to save
     * @param {boolean} withCommit If true commits the changes to the repository
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise} If withCommit is true, the function returns a Promise
     */
    function setManifest(manifest, withCommit, message){
        jsonfile.writeFileSync(manifestPath, manifest, {spaces: 2});
        if(withCommit) {
            return _commit(null, ["manifest.json"],
               message || "Changed the manifest file");
        }
    }

    /**
     * Retrieve the repository config.json file as a JavasScript Object
     * @method getConfig
     * @returns {Object} The config Object
     */
    function getConfig(){
        return jsonfile.readFileSync(configPath);
    }

    /**
     * Update the repository config.json file using a JavasScript Object
     * @method setConfig
     * @param {Object} config The config Object to save
     * @param {boolean} withCommit If true commits the changes to the repository
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise} If withCommit is true, the function returns a Promise
     */
    function setConfig(config, withCommit, message){
        jsonfile.writeFileSync(configPath, config, {spaces: 2});
        if(withCommit) {
            return _commit(null, ["config.json"],
                message || "Changed the config file");
        }
    }

    /**
     * Get the names of all of the machines in the repository
     * @method getMachinesNames
     * @returns {Array} An array with all the machine's names
     */
    function getMachinesNames() {
        let manifest = getManifest();
        return Object.keys(manifest.machines);
    }

    /**
     * Add a new machine to the repository
     * @method addMachine
     * @param {String} name The name of the new machine
     * @returns {Promise}
     */
    function addMachine(name) {
        return co(function*(){
            debug("Adding a new machine with the name '%s'", name);
            let manifest = getManifest();

            if(manifest.machines[name]) {
                debug("Machine already exists");
                throw new Error("Machine already exists");
            }

            manifest.machines[name] = {
                route: "machines/" + name,
                "versions": {
                    "version1": {
                        "route": "machines/" + name + "/versions/version1",
                        "instances": {}
                    }
                }
            };

            let machineDirPath = "machines/" + name;
            let machineVersionsDirPath = machineDirPath + "/versions";
            let version1DirPath = machineVersionsDirPath + "/version1";
            let version1InstancesDirPath = version1DirPath + "/instances";
            let modelFile = version1DirPath + '/model.scxml';
            let infoFile = version1DirPath + "/info.json";

            debug("Creating the directories");
            fs.mkdirSync(repositoryPath + "/" + machineDirPath);
            fs.mkdirSync(repositoryPath + "/" + machineVersionsDirPath);
            fs.mkdirSync(repositoryPath + "/" + version1DirPath);
            fs.mkdirSync(repositoryPath + "/" + version1InstancesDirPath);

            debug("Creating the base.scxml file");
            fs.copySync(__dirname + '/base.scxml', repositoryPath + "/" + modelFile);

            debug("Creating the version info.json file");
            let infoVersion1 = { "isSealed": false };
            jsonfile.writeFileSync(repositoryPath + "/" + infoFile, infoVersion1);

            debug("Setting the manifest");
            setManifest(manifest);

            yield _commit(null, ["manifest.json", modelFile, infoFile], "Added '" + name + "' machine");
            debug("A new machine with the name '%s' was successfully added", name);
        });
    }

    /**
     * Remove a machine from the repository
     * @method removeMachine
     * @param {String} name The name of the machine
     * @returns {Promise}
     */
    function removeMachine(name) {
        return co(function*(){
            debug("Removing the machine");
            let manifest = getManifest();

            if(!manifest.machines[name]) {
                debug("Machine doesn't exists");
                return;
            }

            let machinePath = machinesDirPath + "/" + name;
            let removedFileNames = _getFiles(machinePath).map((f)=>f.substring(repositoryPath.length + 1));

            delete manifest.machines[name];
            yield new Promise(function(resolve, reject) {
                rimraf(machinesDirPath + "/" + name, function () {
                    resolve();
                });
            }).then();

            debug("Setting the manifest");
            setManifest(manifest);

            yield _commit(null, ["manifest.json"], "Removed '" +  name + "' machine.", removedFileNames);

            return Object.keys(manifest.machines);

        });
    }

    /**
     * Get the keys of all of the versions of machine in the repository
     * @method getVersionsKeys
     * @param {String} machineName The name of the machine to get the version's keys
     * @returns {Array} An array with all the version's keys of the machine
     */
    function getVersionsKeys(machineName) {
        let manifest = getManifest();
        if (!manifest.machines[machineName]) {
            throw new Error("Machine does not exists");
        }
        return Object.keys(manifest.machines[machineName].versions);
    }

    /**
     * Retrieve the version directory path
     * @method getVersionRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {String} The route
     */
    function getVersionRoute(machineName, versionKey) {
        let manifest = getManifest();

        if (!manifest.machines[machineName]) {
            throw new Error("Machine does not exists");
        }

        if (!manifest.machines[machineName].versions[versionKey]) {
            throw new Error("Version does not exists");
        }

        return manifest.machines[machineName].versions[versionKey].route;
    }

    /**
     * Retrieve the version's info.json file path
     * @method getVersionInfoRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {String} The route
     */
    function getVersionInfoRoute(machineName, versionKey) {
        return getVersionRoute(machineName, versionKey) + "/info.json";
    }

    /**
     * Retrieve the version's model.scxml file path
     * @method getVersionModelRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {String} The route
     */
    function getVersionModelRoute(machineName, versionKey) {
        return getVersionRoute(machineName, versionKey) + "/model.scxml";
    }

    /**
     * Retrieve the version info.json file as a JavasScript Object
     * @method getVersionInfo
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {Object} The info Object
     */
    function getVersionInfo(machineName, versionKey) {
        let route = getVersionInfoRoute(machineName, versionKey);
        return jsonfile.readFileSync(repositoryPath + "/" + route);
    }

    /**
     * Update the version info.json file using a JavasScript Object
     * @method setVersionInfo
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {Object} info The info Object to save
     * @param {boolean} withCommit If true commits the changes to the repository
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise} If withCommit is true, the function returns a Promise
     */
    function setVersionInfo(machineName, versionKey, info, withCommit, message) {

        let route = getVersionInfoRoute(machineName, versionKey);
        let previousInfo = jsonfile.readFileSync(repositoryPath + "/" + route);
        if(previousInfo.isSealed) {
            throw new Error("Cannot change the version SCXML because the version is sealed.")
        }

        jsonfile.writeFileSync(repositoryPath + "/" + route, info, {spaces: 2});

        if(withCommit) {
            return _commit(null, [route],
                message || "Changed the info for the " + versionKey + " of the '" + machineName + "' machine" );
        }

    }

    /**
     * Add a new version to a machine
     * @method addVersion
     * @param {String} machineName The name of the machine
     * @returns {Promise} The version key
     */
    function addVersion(machineName) {
        return co(function*() {
            debug("Adding a new version to the '" + machineName + "' machine");
            let manifest = getManifest();

            if (!manifest.machines[machineName]) {
                throw new Error("Machine does not exists");
            }

            let versions = manifest.machines[machineName].versions;
            let versionKeys = Object.keys(versions);
            let lastVersionKey = versionKeys[versionKeys.length - 1];
            let lastVersion = versions[lastVersionKey];
            let lastVersionInfoFile = lastVersion.route + "/info.json";
            let lastVersionInfo = jsonfile.readFileSync(repositoryPath + "/" + lastVersionInfoFile);
            let lastVersionModelFile = lastVersion.route + '/model.scxml';

            if(!lastVersionInfo.isSealed) {
                throw new Error("The last versions is not sealed yet");
            }

            let newVersionKey = "version" + (versionKeys.length + 1);
            let versionDirPath = manifest.machines[machineName].route + "/versions/" + newVersionKey;
            manifest.machines[machineName].versions[newVersionKey] = {
                "route": versionDirPath,
                "instances": {}
            };

            let versionInstancesDirPath = versionDirPath + "/instances";
            let modelFile = versionDirPath + '/model.scxml';
            let infoFile = versionDirPath + "/info.json";

            debug("Creating the directories");
            fs.mkdirSync(repositoryPath + "/" + versionDirPath);
            fs.mkdirSync(repositoryPath + "/" + versionInstancesDirPath);

            debug("Copying the previous version's model.scxml");
            fs.copySync(repositoryPath + "/" + lastVersionModelFile, repositoryPath + "/" + modelFile);

            debug("Creating the version info.json file");
            let infoVersion = { "isSealed": false };
            jsonfile.writeFileSync(repositoryPath + "/" + infoFile, infoVersion);

            debug("Setting the manifest");
            setManifest(manifest);
            yield _commit(null, ["manifest.json",  modelFile, infoFile],
                "Created the "+newVersionKey+" for the '" + machineName + "' machine");

            return newVersionKey;

        });

    }

    /**
     * Seal a version of a machine
     * @method addMachine
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {Promise}
     */
    function sealVersion(machineName, versionKey) {
        return co(function*(){
            debug("Attempting to seal the version '%s' of the machine '%s'", versionKey, machineName);
            let info = yield getVersionInfo(machineName, versionKey);
            if(info.isSealed) {
                throw new Error("Version it already sealed");
            }

            debug("Getting manifest");
            let manifest = getManifest();
            let model = getVersionSCXML(machineName, versionKey);
            let isValid = isSCXMLValid(model);

            if(!isValid) {
                throw new Error("The model is not valid.");
            }

            info.isSealed = true;
            setVersionInfo(machineName, versionKey, info);
            debug("The version '%s' of the machine '%s' was sealed successfully", versionKey, machineName);

        });
    }


    /**
     * Retrieve the version model.scxml file as a String
     * @method getVersionSCXML
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {String} The model
     */
    function getVersionSCXML(machineName, versionKey) {
        let route = getVersionModelRoute(machineName, versionKey);
        return fs.readFileSync(repositoryPath + "/" + route).toString('utf8');
    }

    /**
     * Update the version model.scxml file using a String
     * @method setVersionSCXML
     * @param {String} model The model
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {boolean} withCommit If true commits the changes to the repository
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise} If withCommit is true, the function returns a Promise
     */
    function setVersionSCXML(machineName, versionKey, model, withCommit, message) {

        let route = getVersionInfoRoute(machineName, versionKey);
        let previousInfo = jsonfile.readFileSync(repositoryPath + "/" + route);
        if(previousInfo.isSealed) {
            throw new Error("Cannot change the version SCXML because the version is sealed.")
        }
        let modelRoute = getVersionModelRoute(machineName, versionKey);
        fs.writeFileSync(repositoryPath + "/" + modelRoute, model);

        if(withCommit) {
            return _commit(null, [modelRoute],
                "Changed the model.scxml for the " + versionKey + " of the '" + machineName + "' machine");
        }
    }

    /**
     * Validates SCXML markup as a string
     * @method isSCXMLValid
     * @param {String} model A string with the SCXML document to validate
     * @returns {Promise} True if the SCXML is valid false otherwise
     */
    function isSCXMLValid(model){
        return new Promise(function(resolve, reject) {
            if(model === "") {
                reject("Model is empty");
                return;
            }

            validator.validateXML(model, __dirname + '/xmlSchemas/scxml.xsd', function(err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result.valid);
            })
        });
    }

    /**
     * Gets the keys of all of the instances of a version of the machine in the repository
     * @method getInstancesKeys
     * @param {String} machineName The name of the machine to get the instances's keys
     * @param {String} versionKey The key of the version to get the instances's keys
     * @returns {Array} An array with all the instance's keys of the the version
     */
    function getInstancesKeys(machineName, versionKey){

        let manifest = getManifest();

        let machine = manifest.machines[machineName];
        if (!machine) {
            throw new Error("Machine does not exists");
        }

        let version = machine.versions[versionKey];
        if (!version) {
            throw new Error("Version does not exists");
        }

        return Object.keys(version.instances);
    }

    /**
     * Retrieve the instance's directory path
     * @method getInstanceRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @returns {String} The route
     */
    function getInstanceRoute(machineName, versionKey, instanceKey){

        let manifest = getManifest();

        let machine = manifest.machines[machineName];
        if (!machine) {
            throw new Error("Machine does not exists");
        }

        let version = machine.versions[versionKey];
        if (!version) {
            throw new Error("Version does not exists");
        }

        let instance = version.instances[instanceKey];
        if (!instance) {
            throw new Error("Instance does not exists");
        }

        return instance.route;
    }

    /**
     * Retrieve the instance's info.json path
     * @method getInstanceInfoRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @returns {String} The route
     */
    function getInstanceInfoRoute(machineName, versionKey, instanceKey) {
        return getInstanceRoute(machineName, versionKey, instanceKey) + "/info.json";
    }

    /**
     * Retrieve the instance's info.json file as a JavasScript Object
     * @method getInstanceInfo
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @returns {Object} The info Object
     */
    function getInstanceInfo(machineName, versionKey, instanceKey) {
        let route = getInstanceInfoRoute(machineName, versionKey, instanceKey);
        return jsonfile.readFileSync(repositoryPath + "/" + route);
    }

    /**
     * Update the instance's info.json file using a JavasScript Object
     * @method setInstanceInfo
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {Object} info The info Object to save
     * @param {boolean} withCommit If true commits the changes to the repository
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise} If withCommit is true, the function returns a Promise
     */
    function setInstanceInfo(machineName, versionKey, instanceKey, info, withCommit, message) {

        let route = getInstanceInfoRoute(machineName, versionKey, instanceKey);
        jsonfile.writeFileSync(repositoryPath + "/" + route, info, {spaces: 2});

        if(withCommit) {
            return _commit(null, [route],
                message || "Changed the info for the " + instanceKey + " of the " +
                versionKey + " of the '" + machineName + "' machine");
        }

    }

    /**
     * Add a new instance to a version of a machine
     * @method addInstance
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {Promise} The instance key
     */
    function addInstance(machineName, versionKey) {

        return co(function*() {
            debug("Adding a new instance to the " + versionKey + " of the '" + machineName + "' machine");
            let manifest = getManifest();

            let machine = manifest.machines[machineName];
            if (!machine) {
                throw new Error("Machine does not exists");
            }

            let version = machine.versions[versionKey];
            if (!version) {
                throw new Error("Version does not exists");
            }

            let versionInfo = getVersionInfo(machineName,  versionKey);
            if(!versionInfo.isSealed) {
                throw new Error("The version is not sealed yet");
            }

            let newInstanceKey = "instance" + (Object.keys(version.instances).length + 1);
            let instanceDirPath = version.route + "/instances/" + newInstanceKey;
            let instanceSnapshotsDirPath = instanceDirPath + "/snapshots";
            version.instances[newInstanceKey] = {
                "route": instanceDirPath,
                "snapshots": {}
            };

            let infoFile = instanceDirPath + "/info.json";

            debug("Creating the directories");
            fs.mkdirSync(repositoryPath + "/" + instanceDirPath);
            fs.mkdirSync(repositoryPath + "/" + instanceSnapshotsDirPath);

            debug("Creating the instance info.json file");
            let info = {
                "hasStarted": false,
                "hasEnded": false
            };
            jsonfile.writeFileSync(repositoryPath + "/" + infoFile, info);

            debug("Setting the manifest");
            setManifest(manifest);
            yield _commit(null, ["manifest.json", infoFile],
                "Created the "+newInstanceKey+" for the "+versionKey+" of the '" + machineName + "' machine");

            return newInstanceKey;
        });
    }

    /**
     * Gets the keys of all of the snapshots of the instance of a version of the machine in the repository
     * @method getSnapshotsKeys
     * @param {String} machineName The name of the machine to get the snapshots's keys
     * @param {String} versionKey The key of the version to get the snapshots's keys
     * @param {String} instanceKey The key of the instance to get the snapshot's keys
     * @returns {Array} An array with all the snapshot's keys of the instance
     */
    function getSnapshotsKeys(machineName, versionKey, instanceKey){

        let manifest = getManifest();

        let machine = manifest.machines[machineName];
        if (!machine) {
            throw new Error("Machine does not exists");
        }

        let version = machine.versions[versionKey];
        if (!version) {
            throw new Error("Version does not exists");
        }

        let instance = version.instances[instanceKey];
        if (!instance) {
            throw new Error("Instance does not exists");
        }

        return Object.keys(instance.snapshots);
    }

    /**
     * Retrieve the snapshot's directory path
     * @method getSnapshotRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {String} snapshotKey The key of the snapshot
     * @returns {String} The route
     */
    function getSnapshotRoute(machineName, versionKey, instanceKey, snapshotKey){

        let manifest = getManifest();

        let machine = manifest.machines[machineName];
        if (!machine) {
            throw new Error("Machine does not exists");
        }

        let version = machine.versions[versionKey];
        if (!version) {
            throw new Error("Version does not exists");
        }

        let instance = version.instances[instanceKey];
        if (!instance) {
            throw new Error("Instance does not exists");
        }

        let snapshot = instance.snapshots[snapshotKey];
        if (!snapshot) {
            throw new Error("Snapshot does not exists");
        }

        return snapshot.route;
    }

    /**
     * Retrieve the snapshot's info.json path
     * @method getSnapshotInfoRoute
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {String} snapshotKey The key of the snapshot
     * @returns {String} The route
     */
    function getSnapshotInfoRoute(machineName, versionKey, instanceKey, snapshotKey) {
        return getSnapshotRoute(machineName, versionKey, instanceKey, snapshotKey) + "/info.json";
    }

    /**
     * Retrieve the snapshot's info.json file as a JavasScript Object
     * @method getSnapshotInfo
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {String} snapshotKey The key of the snapshot
     * @returns {Object} The info Object
     */
    function getSnapshotInfo(machineName, versionKey, instanceKey, snapshotKey) {
        let route = getSnapshotInfoRoute(machineName, versionKey, instanceKey, snapshotKey);
        return jsonfile.readFileSync(repositoryPath + "/" + route);
    }

    /**
     * Add a new snapshot to an instance of a version of a machine
     * @method addSnapshot
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {Object} info The info Object
     * @returns {Promise} The instance key
     */
    function addSnapshot(machineName, versionKey, instanceKey, info) {

        return co(function*() {
            debug("Adding a new snapshot to the " + instanceKey + " of the " + versionKey + " of the '" + machineName + "' machine");
            let manifest = getManifest();

            let machine = manifest.machines[machineName];
            if (!machine) {
                throw new Error("Machine does not exists");
            }

            let version = machine.versions[versionKey];
            if (!version) {
                throw new Error("Version does not exists");
            }

            let instance = version.instances[instanceKey];
            if (!instance) {
                throw new Error("Instance does not exists");
            }

            let newSnapshotKey = "snapshot" + (Object.keys(instance.snapshots).length + 1);
            let snapshotDirPath = instance.route + "/snapshots/" + newSnapshotKey;
            instance.snapshots[newSnapshotKey] = {
                "route": snapshotDirPath
            };

            let infoFile = snapshotDirPath + "/info.json";

            debug("Creating the directories");
            fs.mkdirSync(repositoryPath + "/" + snapshotDirPath);

            debug("Creating the snapshot info.json file");
            let info = {

            };
            jsonfile.writeFileSync(repositoryPath + "/" + infoFile, info);

            debug("Setting the manifest");
            setManifest(manifest);
            yield _commit(null, ["manifest.json", infoFile],
                "Created the "+newSnapshotKey+" for the "+instanceKey+" of the "+
                versionKey+" of the '" + machineName + "' machine");

            return newSnapshotKey;
        });
    }

    return {
        init                  :init,
        //////////////////////////////
        getRepositoryPath     :getRepositoryPath,
        getManifest           :getManifest,
        getConfig             :getConfig,
        setConfig             :setConfig,
        //////////////////////////////
        getMachinesNames       :getMachinesNames,
        addMachine            :addMachine,
        removeMachine         :removeMachine,
        //////////////////////////////
        getVersionsKeys       :getVersionsKeys,
        getVersionRoute       :getVersionRoute,
        getVersionInfoRoute   :getVersionInfoRoute,
        getVersionModelRoute  :getVersionModelRoute,
        getVersionInfo        :getVersionInfo,
        setVersionInfo        :setVersionInfo,
        addVersion            :addVersion,
        sealVersion           :sealVersion,
        isSCXMLValid          :isSCXMLValid,
        getVersionSCXML       :getVersionSCXML,
        setVersionSCXML       :setVersionSCXML,
        //////////////////////////////
        getInstancesKeys      :getInstancesKeys,
        getInstanceRoute      :getInstanceRoute,
        getInstanceInfoRoute  :getInstanceInfoRoute,
        getInstanceInfo       :getInstanceInfo,
        setInstanceInfo       :setInstanceInfo,
        addInstance           :addInstance,
        //////////////////////////////
        getSnapshotsKeys      :getSnapshotsKeys,
        getSnapshotRoute      :getSnapshotRoute,
        getSnapshotInfoRoute  :getSnapshotInfoRoute,
        getSnapshotInfo       :getSnapshotInfo,
        addSnapshot           :addSnapshot
    };
};
