let co = require('co');
let Core = require("../dist/index");

var nodegit = require("nodegit"),
    path = require("path"),
    repo;

co(function*() {
    let core = new Core(__dirname + "/repo");
    repo = yield core.init();
    yield core.addMachine("deadline");
    yield core.addMachine("keynote");
    yield core.removeMachine("deadline");
    yield core.sealVersion("keynote", "version1");
    yield core.addInstance("keynote", "version1");
    yield core.addSnapshot("keynote", "version1", "instance1", {});
    yield core.addVersion("keynote");
    yield core.getManifest();
    console.log(JSON.stringify(yield core.getMachinesNames()));
    yield core.removeMachine("keynote");

    console.log(yield core.getCommitHistory());


}).then();
