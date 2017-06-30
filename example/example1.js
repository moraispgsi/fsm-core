let co = require('co');
let Core = require("../dist/index");
console.log(process.env.B);
console.log(process.env.A);
console.log(process.env.C);
co(function*() {
    let core = new Core(__dirname + "/repo");
    yield core.initRemoteGitSSH("git@github.com:moraispgsi/fsm-engine-repo-test.git",
        "C:\\Users\\Ricardo Morais\\.ssh\\id_rsa.pub",
        "C:\\Users\\Ricardo Morais\\.ssh\\id_rsa",
        // process.env.B,
        // process.env.A,//The environmental variable can't hold the entire private key
        process.env.C);
    // yield core.addMachine("deadline");
    // yield core.addMachine("keynote");
    // yield core.removeMachine("deadline");
    // yield core.sealVersion("keynote", "version1");
    yield core.addInstance("conference", "version1");
    // yield core.addSnapshot("keynote", "version1", "instance1", {});
    // yield core.addVersion("keynote");
    // yield core.getManifest();
    // yield core.getMachinesNames();
    // yield core.removeMachine("keynote");
}).then();
