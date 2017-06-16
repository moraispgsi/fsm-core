# fsm-core
[![Build Status](https://travis-ci.org/moraispgsi/fsm-core.svg?branch=master)](https://travis-ci.org/moraispgsi/fsm-core)

## Synopsis

This module creates a very simple repository for SCXML files in a database. 

## Code Example
```javascript
import Core from "fsm-core";
co(function*(){
    try {
        let core = new Core("repository_path");
        yield core.init();
        yield core.addMachine("deadline");
        yield core.addMachine("keynote");
        yield core.removeMachine("deadline");
        yield core.sealVersion("keynote", "version1");
        yield core.addInstance("keynote", "version1");
        yield core.addSnapshot("keynote", "version1", "instance1", {});
        yield core.addVersion("keynote");
        yield core.removeMachine("keynote");
    } catch (err) {
        console.log(err);
    }

}).then();

```
## Motivation

This module is extended to the fsm-engine module, which consumes the repository.

## Installation

link the git repository in the dependencies of the package.json file
npm install  

## API Reference



## Tests
npm test

run the tests using npm test  

## Contributors

## License

MIT

