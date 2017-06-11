let co = require("co");
let repository = require("./repository")();
let debug = require("debug")("test");

co(function*(){
    try {
        yield repository.init();
        yield repository.addMachine("deadline");
        yield repository.addMachine("keynote");
        yield repository.removeMachine("deadline");
        yield repository.sealVersion("keynote", "version1");
        yield repository.addVersion("keynote");
        debug(repository.getManifest());
        debug(repository.getMachinesKeys());
        yield repository.removeMachine("deadline");
        yield repository.removeMachine("keynote");
        debug(repository.getManifest());
        debug(repository.getMachinesKeys());
    } catch (err) {
        debug("ERROR %s", err);
    }

}).then();
