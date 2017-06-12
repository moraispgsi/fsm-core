let co = require("co");
let core = require("./repository")();
let debug = require("debug")("test");

co(function*(){
    try {
        let repository = yield core.init();
        yield core.addMachine("deadline");
        yield core.addMachine("keynote");
        yield core.removeMachine("deadline");
        yield core.sealVersion("keynote", "version1");
        yield core.removeMachine("keynote");
        // yield repository.addVersion("keynote");
        debug(core.getManifest());
        debug(core.getMachinesKeys());
        // yield repository.removeMachine("keynote");
        debug(core.getManifest());
        debug(core.getMachinesKeys());
    } catch (err) {
        debug("ERROR %s", err);
    }

}).then();
