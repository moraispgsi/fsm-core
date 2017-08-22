//  .d888
// d88P'
// 888
// 888888.d8888b 88888b.d88b.        .d8888b .d88b. 888d888 .d88b.
// 888   88K     888 '888 '88b      d88P'   d88''88b888P'  d8P  Y8b
// 888   'Y8888b.888  888  888888888888     888  888888    88888888
// 888        X88888  888  888      Y88b.   Y88..88P888    Y8b.
// 888    88888P'888  888  888       'Y8888P 'Y88P' 888     'Y8888

import debugStart from 'debug';
import validator from 'xsd-schema-validator';
import bluebird from 'bluebird';
import redis from 'redis';
import kue from 'kue-scheduler'
import Redlock from 'redlock';

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let debug = debugStart('core');

class Core {

    /**
     * Initializes a redis client
     * @method init
     * @memberOf Core
     */
    init(redisOptions, kueOptions) {

        this.client = redis.createClient(redisOptions);
        this.queue = kue.createQueue({
            prefix: 'q',
            redis: kueOptions
        });
        this.redlock = new Redlock(
            // you should have one client for each redis node
            // in your cluster
            [this.client],
            {
                // the expected clock drift; for more details
                // see http://redis.io/topics/distlock
                driftFactor: 0.01, // time in ms

                // the max number of times Redlock will attempt
                // to lock a resource before erroring
                retryCount:  10,

                // the time in ms between attempts
                retryDelay:  200, // time in ms

                // the max time in ms randomly added to retries
                // to improve performance under high contention
                // see https://www.awsarchitectureblog.com/2015/03/backoff.html
                retryJitter:  200 // time in ms
            }
        );
    }

    disconnect() {
        this.client.quit();
        // this.queue.shutdown();
    }

    async _verifyMachine(machineName) {
        let machineExists = await this.client.sismemberAsync('machineList', machineName);
        if(!machineExists) {
            throw new Error('Machine does not exists');
        }
    }

    async _verifyVersion(machineName, versionKey) {
        await this._verifyMachine(machineName);
        let versionExists = await this.client.zrankAsync(`machine:${machineName}:versionList`, versionKey);
        if(versionExists === null) {
            throw new Error('Version does not exists');
        }
    }

    async _verifyInstance(machineName, versionKey, instanceKey) {
        await this._verifyVersion(machineName, versionKey);
        let instanceExists = await this.client
            .zrankAsync(`machine:${machineName}:version:${versionKey}:instanceList`, instanceKey);
        if(instanceExists === null) {
            throw new Error('Instance does not exists');
        }
    }

    async _verifySnapshot(machineName, versionKey, instanceKey, snapshotKey) {
        await this._verifyInstance(machineName, versionKey, instanceKey);
        let snapshotExists = await this.client
            .zrankAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshotList`, snapshotKey);
        if(snapshotExists === null) {
            throw new Error('Snapshot does not exists');
        }
    }
    /**
     * Retrieve the repository manifest.json file as a JavasScript Object
     * @method getManifest
     * @memberOf Core
     * @returns {Object} The manifest Object
     */
    async getManifest() {
        return await this.client.hgetallAsync("manifest");
    }

    /**
     * Get the names of all of the machines in the repository
     * @method getMachinesNames
     * @memberOf Core
     * @returns {Promise} An array with all the machine's names
     */
    async getMachinesNames() {
        return await this.client.smembersAsync('machineList');
    }

    /**
     * Add a new machine to the repository
     * @method addMachine
     * @memberOf Core
     * @param {String} machineName The name of the new machine
     * @returns {Promise}
     */
    async addMachine(machineName) {
        let machineExists = await this.client.sismemberAsync('machineList', machineName);
        if(machineExists) {
            throw new Error('Machine already exists');
        }
        let baseSCXML = await this.client.getAsync('baseSCXML');
        let info = {
            isSealed: false,
        };

        //lock
        let lock = await this.redlock.lock('lock:machineList', 100);

        await this.client.hmsetAsync(`machine:${machineName}:version:version1`, 'model', baseSCXML, 'info', JSON.stringify(info));
        await this.client.sadd('machineList', machineName);
        await this.client.zaddAsync(`machine:${machineName}:versionList`, 1, 'version1');

        //unlock
        await lock.unlock();

        await this.client.hincrbyAsync('manifest', 'machineCount', 1);
        await this.client.hincrbyAsync('manifest', 'versionCount', 1);

    }

    /**
     * Get the keys of all of the versions of machine in the repository
     * @method getVersionsKeys
     * @memberOf Core
     * @param {String} machineName The name of the machine to get the version's keys
     * @returns {Array} An array with all the version's keys of the machine
     */
    async getVersionsKeys(machineName) {
        await this._verifyMachine(machineName);
        return await this.client.zrangeAsync(`machine:${machineName}:versionList`, 0, -1);
    }
    /**
     * Retrieve the version info.json file as a JavasScript Object
     * @method getVersionInfo
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {Object} The info Object
     */
    async getVersionInfo(machineName, versionKey) {
        await this._verifyVersion(machineName, versionKey);
        let info = await this.client.hgetAsync(`machine:${machineName}:version:version1`, 'info');
        return JSON.parse(info);
    }

    /**
     * Update the version info.json file using a JavasScript Object
     * @method setVersionInfo
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {Object} info The info Object to save
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise}
     */
    async setVersionInfo(machineName, versionKey, info) {
        await this._verifyVersion(machineName, versionKey);
        await this.client.hsetAsync(`machine:${machineName}:version:version1`, 'info', JSON.stringify(info));
    }

    /**
     * Add a new version to a machine
     * @method addVersion
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @returns {Promise} The version key
     */
    async addVersion(machineName) {
        await this._verifyMachine(machineName);

        let baseSCXML = await this.client.getAsync('baseSCXML');

        let info = {
            isSealed: false,
        };

        //lock
        let lock = await this.redlock.lock(`lock:machine:${machineName}:versionList`, 100);

        let count = await this.client.zcountAsync(`machine:${machineName}:versionList`, '-inf', '+inf');
        // check if previous version is sealed
        let previousVersionInfo = await this.getVersionInfo(machineName, `version${count}`);
        if (!previousVersionInfo.isSealed) {
            throw new Error('The last versions is not sealed yet');
        }
        let newVersionNumber = count + 1;
        let newVersionName = `version${newVersionNumber}`;

        await this.client.hmsetAsync(`machine:${machineName}:version:${newVersionName}`,
            'model', baseSCXML, 'info', JSON.stringify(info));
        await this.client.zaddAsync(`machine:${machineName}:versionList`, newVersionNumber, newVersionName);

        //unlock
        await lock.unlock();

        await this.client.hincrbyAsync('manifest', 'versionCount', 1);
        return `version${newVersionNumber}`;
    }

    /**
     * Seal a version of a machine
     * @method addMachine
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {Promise}
     */
    async sealVersion(machineName, versionKey) {
        await this._verifyVersion(machineName, versionKey);

        debug('Attempting to seal the version "%s" of the machine "%s"', versionKey, machineName);
        let info = await this.getVersionInfo(machineName, versionKey);
        if (info.isSealed) {
            throw new Error('Version is already sealed');
        }

        let model = await this.getVersionSCXML(machineName, versionKey);
        let isValid = await this.isSCXMLValid(model);

        if (!isValid) {
            throw new Error('The model is not valid.');
        }

        info.isSealed = true;
        await this.setVersionInfo(machineName, versionKey, info);
        debug('The version "%s" of the machine "%s" was sealed successfully', versionKey, machineName);
    }


    /**
     * Retrieve the version model.scxml file as a String
     * @method getVersionSCXML
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {String} The model
     */
    async getVersionSCXML(machineName, versionKey) {
        await this._verifyVersion(machineName, versionKey);
        return await this.client.hgetAsync(`machine:${machineName}:version:${versionKey}`, 'model');
    }

    /**
     * Update the version model.scxml file using a String
     * @method setVersionSCXML
     * @memberOf Core
     * @param {String} model The model
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise}
     */
    async setVersionSCXML(machineName, versionKey, model) {
        await this._verifyVersion(machineName, versionKey);
        let info = await this.getVersionInfo(machineName, versionKey);
        if (info.isSealed) {
            throw new Error('Cannot change the version SCXML because the version is sealed.')
        }
        this.client.hsetAsync(`machine:${machineName}:version:${versionKey}`, 'model', model);
    }

    /**
     * Validates SCXML markup as a string
     * @method isSCXMLValid
     * @memberOf Core
     * @param {String} model A string with the SCXML document to validate
     * @returns {Promise} True if the SCXML is valid false otherwise
     */
    async isSCXMLValid(model) {
        return await new Promise((resolve, reject) => {
            if (model === '') {
                reject('Model is empty');
                return;
            }

            validator.validateXML(model, __dirname + '/xmlSchemas/scxml.xsd', (err, result) => {
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
     * @memberOf Core
     * @param {String} machineName The name of the machine to get the instances's keys
     * @param {String} versionKey The key of the version to get the instances's keys
     * @returns {Array} An array with all the instance's keys of the the version
     */
    async getInstancesKeys(machineName, versionKey) {
        await this._verifyVersion(machineName, versionKey);
        return await this.client.zrangeAsync(`machine:${machineName}:version:${versionKey}:instanceList`, 0, -1);
    }

    /**
     * Retrieve the instance's info.json file as a JavasScript Object
     * @method getInstanceInfo
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @returns {Object} The info Object
     */
    async getInstanceInfo(machineName, versionKey, instanceKey) {
        await this._verifyInstance(machineName, versionKey, instanceKey);
        let info = await this.client.hgetAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}`, 'info');
        return JSON.parse(info);
    }

    /**
     * Update the instance's info.json file using a JavasScript Object
     * @method setInstanceInfo
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {Object} info The info Object to save
     * @param {String} message If supplied it is used as the message for the commit
     * @returns {Promise}
     */
    async setInstanceInfo(machineName, versionKey, instanceKey, info) {
        await this._verifyInstance(machineName, versionKey, instanceKey);
        await this.client.hsetAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}`,
            'info', JSON.stringify(info));
    }

    /**
     * Add a new instance to a version of a machine
     * @method addInstance
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @returns {Promise} The instance key
     */
    async addInstance(machineName, versionKey) {

        debug('Adding a new instance to the ' + versionKey + ' of the "' + machineName + '" machine');
        await this._verifyVersion(machineName, versionKey);

        let versionInfo = await this.getVersionInfo(machineName, versionKey);
        if (!versionInfo.isSealed) {
            throw new Error('The version is not sealed yet');
        }

        let info = {
            'hasEnded': false
        };

        //lock
        let lock = await this.redlock.lock(`lock:machine:${machineName}:version:${versionKey}:instanceList`, 100);

        let count = await this.client.zcountAsync(`machine:${machineName}:version:${versionKey}:instanceList`, '-inf', '+inf');
        let newInstanceNumber = count + 1;
        let newInstanceName = `instance${newInstanceNumber}`;
        await this.client.hsetAsync(`machine:${machineName}:version:${versionKey}:instance:${newInstanceName}`,
            'info', JSON.stringify(info));
        await this.client.zaddAsync(`machine:${machineName}:version:${versionKey}:instanceList`,newInstanceNumber, newInstanceName);

        await lock.unlock();

        await this.client.hincrbyAsync('manifest', 'instanceCount', 1);

        return newInstanceName;
    }

    /**
     * Gets the keys of all of the snapshots of the instance of a version of the machine in the repository
     * @method getSnapshotsKeys
     * @memberOf Core
     * @param {String} machineName The name of the machine to get the snapshots's keys
     * @param {String} versionKey The key of the version to get the snapshots's keys
     * @param {String} instanceKey The key of the instance to get the snapshot's keys
     * @returns {Array} An array with all the snapshot's keys of the instance
     */
    async getSnapshotsKeys(machineName, versionKey, instanceKey) {
        await this._verifyInstance(machineName, versionKey, instanceKey);
        return await this.client.zrangeAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshotList`, 0, -1);
    }


    /**
     * Retrieve the snapshot's info.json file as a JavasScript Object
     * @method getSnapshotInfo
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {String} snapshotKey The key of the snapshot
     * @returns {Object} The info Object
     */
    async getSnapshotInfo(machineName, versionKey, instanceKey, snapshotKey) {
        await this._verifySnapshot(machineName, versionKey, instanceKey, snapshotKey);
        let snapshot = await this.client.hgetAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshot:${snapshotKey}`, 'info');
        return JSON.parse(snapshot);
    }

    /**
     * Add a new snapshot to an instance of a version of a machine
     * @method addSnapshot
     * @memberOf Core
     * @param {String} machineName The name of the machine
     * @param {String} versionKey The key of the version
     * @param {String} instanceKey The key of the instance
     * @param {Object} info The info Object
     * @returns {Promise} The instance key
     */
    async addSnapshot(machineName, versionKey, instanceKey, info) {
        debug('Adding a new snapshot to the ' + instanceKey + ' of the ' + versionKey + ' of the "' + machineName + '" machine');
        await this._verifyInstance(machineName, versionKey, instanceKey);

        //lock
        let lock = await this.redlock.lock(`lock:machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshotList`, 100);

        let count = await this.client
            .zcountAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshotList`, '-inf', '+inf');
        let newSnapshotNumber = count + 1;
        let newSnapshotName = `snapshot${newSnapshotNumber}`;
        await this.client.hsetAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshot:${newSnapshotName}`,
            'info', JSON.stringify(info));
        await this.client.zaddAsync(`machine:${machineName}:version:${versionKey}:instance:${instanceKey}:snapshotList`, newSnapshotNumber, newSnapshotName);

        await lock.unlock();

        await this.client.hincrbyAsync('manifest', 'snapshotCount', 1);
        return newSnapshotName;
    }

    // QUEUE JOBS



    //This jobs implies start an instance interpreter in the last known state.
    async runInstance(machine, versionKey, instanceKey = null, snapshot = null) {
        let instanceKeySent = instanceKey;
        if(instanceKeySent === null) {
            instanceKeySent = await this.addInstance(machine, versionKey);
        }
        await this._verifyInstance(machine, versionKey, instanceKey);
        return this.queue.create('runInstance', {
            machine,
            versionKey,
            instanceKey,
            snapshot
        }).priority('high').save();
    }

    async stopInstance(machine, versionKey, instanceKey) {
        await this._verifyInstance(machine, versionKey, instanceKey);
        return this.queue.create(`stop:${machine}:${versionKey}:${instanceKey}`, {
            machine,
            versionKey,
            instanceKey,
        }).priority('high').save();
    }

    async sendEvent(machine, versionKey, instanceKey, event, data) {
        await this._verifyInstance(machine, versionKey, instanceKey);
        return this.queue.create(`event:${machine}:${versionKey}:${instanceKey}`, {
            machine,
            versionKey,
            instanceKey,
            event,
            data,
        }).priority('high').save();
    }

    //Processing jobs

    processRunInstance(handler, maxJobs) {
        if(maxJobs) {
            this.queue.process('runInstance', maxJobs, handler);
        } else {
            this.queue.process('runInstance', handler);
        }
    }

    processStopInstance(machineName, versionKey, instanceKey, handler, maxJobs) {
        if(maxJobs) {
            this.queue.process(`stop:${machineName}:${versionKey}:${instanceKey}`, maxJobs, handler);
        } else {
            this.queue.process(`stop:${machineName}:${versionKey}:${instanceKey}`, handler);
        }
    }

    processSendEvent(machineName, versionKey, instanceKey, handler, maxJobs) {
        if(maxJobs) {
            this.queue.process(`event:${machineName}:${versionKey}:${instanceKey}`, maxJobs, handler);
        } else {
            this.queue.process(`event:${machineName}:${versionKey}:${instanceKey}`, handler);
        }
    }

}


export default Core;
