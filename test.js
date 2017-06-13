let co = require("co");
let core = require("./index")();
let debug = require("debug")("test");

co(function*(){
    try {
        let repository = yield core.init();
        yield core.addMachine("deadline");
        yield core.addMachine("keynote");
        yield core.removeMachine("deadline");
        yield core.sealVersion("keynote", "version1");
        yield core.addInstance("keynote", "version1");
        yield core.removeMachine("keynote");
        // yield repository.addVersion("keynote");
        debug(core.getManifest());
        debug(core.getMachinesNames());
        // yield repository.removeMachine("keynote");
        debug(core.getManifest());
        debug(core.getMachinesNames());
    } catch (err) {
        debug("ERROR %s", err);
    }

}).then();
