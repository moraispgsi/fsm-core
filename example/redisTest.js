
let co = require('co');
let Core = require("../dist/index");

let core = new Core();
core.init();

co(function*(){

    core.processRunInstance((job, done) => {
        console.log('Starting ' + JSON.stringify(job.data));
        setTimeout(done, 1000);
    }, 3);

    let job = yield core.runInstance('machine1', 'version1', 'instance1');
    job = yield core.runInstance('machine1', 'version1', 'instance1');

    // let names = yield core.getMachinesNames();
    // let result = yield core.getVersionInfo('deadline', 'version1');
    // console.log(names);
    // console.log(result);
    // core.setVersionInfo('deadline', 'version1', {isSealed: true});
    // result = yield core.getVersionInfo('deadline', 'version1');
    // console.log(result);
    // let instance1 = yield core.addInstance('deadline', 'version1');
    // console.log(instance1);
    // let instance2 = yield core.addInstance('deadline', 'version1');
    // console.log(instance2);
    // let instance1info = yield core.getInstanceInfo('deadline', 'version1', 'instance1');
    // console.log(instance1info);
    // let snapshot = yield core.addSnapshot('deadline', 'version1', 'instance1', {mysnapshotInfo: 'teste'});
    // console.log(snapshot);
    // let snapshotInfo = yield core.getSnapshotInfo('deadline', 'version1', 'instance1', snapshot);
    // console.log(snapshotInfo);
    // core.disconnect();
}).catch((err)=>{console.log(err);});





// let redis = require('redis');
// let bluebird = require('bluebird');
// bluebird.promisifyAll(redis.RedisClient.prototype);
// bluebird.promisifyAll(redis.Multi.prototype);
//
// let client = redis.createClient();
//  // this.client.sismember(`machineList`,'deadline').then((obj)=>{console.log(obj)});
// // //Get all the machines names
// client.sismemberAsync('machineList', 'deadline').then((obj)=>{console.log(obj)})
// // });
// // console.log(machines);
// // client.hgetall("manifest", function (err, obj) {
// //     console.dir(obj);
// // });
// //
// // let machine = 'keynote';
// //
// // //Get all the versions of the machine
// client.lrangeAsync(`machineList`, 0, -1).then((obj)=>{console.log(obj)});


