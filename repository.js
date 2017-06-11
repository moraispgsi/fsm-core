
module.exports = function(gitRepoPath) {

    let nodegit = require("nodegit");
    let co = require("co");
    let fs = require("fs-extra");
    let jsonfile = require("jsonfile");
    let rimraf = require('rimraf');
    let debug = require("debug")("git");
    let validator = require('xsd-schema-validator');

    let localRepoPath = gitRepoPath || __dirname + "/repo";
    let machinesDirPath = localRepoPath + "/machines";
    let manifestPath = localRepoPath + "/manifest.json";
    let configPath = localRepoPath + "/config.json";

    function init(){

        debug("Checking if there is a repository");
        return co(function*(){
            try {
                yield nodegit.Repository.open(localRepoPath);
            } catch(err) {
                debug("Repository not found.");
                yield createRepository();
            }

            debug("Repository is ready");

        }).then();
    }

    function getFiles(path){
        let files = [];
        fs.readdirSync(path).forEach(function(file){
            let subpath = path + '/' + file;
            if(fs.lstatSync(subpath).isDirectory()){
                let filesReturned = getFiles(subpath);
                files = files.concat(filesReturned);
            } else {
                files.push(path + '/' + file);
            }
        });
        return files;
    }

    function commitFiles(repo, files, message, filesToRemove) {
        return co(function*(){
            repo = repo || (yield nodegit.Repository.open(localRepoPath));
            debug("Adding files to the index");
            let index = yield repo.refreshIndex(localRepoPath + "/.git/index");

            if(filesToRemove && filesToRemove.length && filesToRemove.length > 0) {
                for(let file of filesToRemove) {
                    yield index.removeByPath(file);
                }
                yield index.write();
                yield index.writeTree();
            }

            debug("Creating main files");
            let signature = nodegit.Signature.default(repo);
            debug("Commiting");
            yield repo.createCommitOnHead(files, signature, signature, message || "Automatic initialization");
        });
    }

    function createRepository() {
        return co(function*(){
            try {
                debug("Creating a new one");
                let repo = yield nodegit.Repository.init(localRepoPath, 0);
                debug("Connection established");
                debug("Creating main files");
                yield createManifest(repo);
                yield createConfig(repo);
                fs.mkdirSync(machinesDirPath);
                yield commitFiles(repo, ["manifest.json", "config.json"]);
                debug("Repository was successfully created");
                return repo;
            } catch (err) {
                debug(err);
                debug("Nuking the repository");
                yield new Promise(function(resolve, reject) {
                    rimraf(localRepoPath, function () {
                        resolve();
                    });
                }).then();
                throw new Error(err);
            }
        });
    }

    function createManifest(repo){
        let file = localRepoPath + '/manifest.json';
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

    function createConfig(repo){
        let file = localRepoPath + '/config.json';
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

    function getManifest(){
        return jsonfile.readFileSync(manifestPath);
    }

    function setManifest(manifest){
        return jsonfile.writeFileSync(manifestPath, manifest, {spaces: 2});
    }

    function getConfig(){
        return jsonfile.readFileSync(configPath);
    }

    function setConfig(config){
        return jsonfile.writeFileSync(configPath, config, {spaces: 2});
    }

    function getMachinesKeys() {
        let manifest = getManifest();
        return Object.keys(manifest.machines);
    }

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
                        "instances": { }
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
            fs.mkdirSync(localRepoPath + "/" + machineDirPath);
            fs.mkdirSync(localRepoPath + "/" + machineVersionsDirPath);
            fs.mkdirSync(localRepoPath + "/" + version1DirPath);
            fs.mkdirSync(localRepoPath + "/" + version1InstancesDirPath);

            debug("Creating the base.scxml file");
            fs.copySync(__dirname + '/base.scxml', localRepoPath + "/" + modelFile);

            debug("Creating the version info.json file");
            let infoVersion1 = { "isSealed": false };
            jsonfile.writeFileSync(localRepoPath + "/" + infoFile, infoVersion1);

            debug("Setting the manifest");
            setManifest(manifest);

            yield commitFiles(null, ["manifest.json", modelFile, infoFile], "Added '" + name + "' machine");
            debug("A new machine with the name '%s' was successfully added", name);
        });
    }

    function removeMachine(name) {
        return co(function*(){
            debug("Removing the machine");
            let manifest = getManifest();

            if(!manifest.machines[name]) {
                debug("Machine doesn't exists");
                return;
            }

            let machinePath = machinesDirPath + "/" + name;
            let removedFileNames = getFiles(machinePath).map((f)=>f.substring(localRepoPath.length + 1));

            delete manifest.machines[name];
            yield new Promise(function(resolve, reject) {
                rimraf(machinesDirPath + "/" + name, function () {
                    resolve();
                });
            }).then();

            debug("Setting the manifest");
            setManifest(manifest);

            yield commitFiles(null, ["manifest.json"], "Removed '" +  name + "' machine.", removedFileNames);

            return Object.keys(manifest.machines);

        });
    }

    function getVersionsKeys(machineName) {
        let manifest = getManifest();
        if (!manifest.machines[machineName]) {
            throw new Error("Machine does not exists");
        }
        return Object.keys(manifest.machines[machineName].versions);
    }

    function getVersionInfo(machineName, versionKey) {
        let manifest = getManifest();

        if (!manifest.machines[machineName]) {
            throw new Error("Machine does not exists");
        }

        if (!manifest.machines[machineName].versions[versionKey]) {
            throw new Error("Version does not exists");
        }

        let route = manifest.machines[machineName].versions[versionKey].route;
        let info = jsonfile.readFileSync(localRepoPath + "/" + route + "/info.json");

        return info;
    }

    function setVersionInfo(machineName, versionKey, info) {
        let manifest = getManifest();

        if (!manifest.machines[machineName]) {
            throw new Error("Machine does not exists");
        }

        if (!manifest.machines[machineName].versions[versionKey]) {
            throw new Error("Version does not exists");
        }

        let route = manifest.machines[machineName].versions[versionKey].route;
        jsonfile.writeFileSync(localRepoPath + "/" + route + "/info.json", info);

        return info;
    }

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
            let lastVersionInfo = jsonfile.readFileSync(localRepoPath + "/" + lastVersionInfoFile);
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
            fs.mkdirSync(localRepoPath + "/" + versionDirPath);
            fs.mkdirSync(localRepoPath + "/" + versionInstancesDirPath);

            debug("Copying the previous version's model.scxml");
            fs.copySync(localRepoPath + "/" + lastVersionModelFile, localRepoPath + "/" + modelFile);

            debug("Creating the version info.json file");
            let infoVersion = { "isSealed": false };
            jsonfile.writeFileSync(localRepoPath + "/" + infoFile, infoVersion);

            debug("Setting the manifest");
            setManifest(manifest);
            yield commitFiles(null, ["manifest.json",  modelFile, infoFile],
                "Created the "+newVersionKey+" for the '" + machineName + "' machine");

        });

    }

    function sealVersion(machineName, versionKey) {
        return co(function*(){
            debug("Attempting to seal the version '%s' of the machine '%s'", versionKey, machineName);
            let info = yield getVersionInfo(machineName, versionKey);
            if(info.isSealed) {
                throw new Error("Version it already sealed");
            }

            debug("Getting manifest");
            let manifest = getManifest();
            let route = manifest.machines[machineName].versions[versionKey].route;
            let model = fs.readFileSync(localRepoPath + "/" + route + "/model.scxml");
            let isValid = isSCXMLValid(model);

            if(!isValid) {
                throw new Error("The model is not valid.");
            }

            info.isSealed = true;
            setVersionInfo(machineName, versionKey, info)
            debug("The version '%s' of the machine '%s' was sealed successfully", versionKey, machineName);

        });
    }

    /**
     * Validates SCXML markup as a string
     * @method isSCXMLValid
     * @param {String} scxml A string with the SCXML document to validate
     */
    function isSCXMLValid(scxml){
        return new Promise(function(resolve, reject) {
            if(scxml === "") {
                reject("SCXML is empty");
                return;
            }
            validator.validateXML(scxml, __dirname + '/xmlSchemas/scxml.xsd', function(err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result.valid);
            })
        });
    }

    return {
        init: init,
        createManifest: createManifest,
        createConfig: createConfig,
        getManifest: getManifest,
        getConfig: getConfig,
        getMachinesKeys: getMachinesKeys,
        addMachine: addMachine,
        removeMachine: removeMachine,
        getVersionsKeys: getVersionsKeys,
        getVersionInfo: getVersionInfo,
        setVersionInfo: setVersionInfo,
        addVersion: addVersion,
        sealVersion: sealVersion,
        isSCXMLValid: isSCXMLValid
    };
};
