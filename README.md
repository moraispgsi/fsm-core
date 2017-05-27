# fsm-core

## Synopsis

This module creates a very simple repository for SCXML files in a database. It uses the library sequelize.js in order to provide support for several database servers like MySQL, PostgreSQL and others. The module also provides a very simple linear version system for realtime environments. 

The repository created is composed of two database tables:
- FsmCoreFsm //Each row is a finite-state machine model
- FsmCoreVersion //Each row is a finite-state machine model version

## Code Example
```javascript
require('index')('mysql', 'host', 'user', 'password', 'mydatabase', {logging: false}).then(function (meta) {
    let co = require("co");
    co(function*(){
        let data = yield meta.createFSM("myfsm");
        let version = data.version;
        let scxml = "<scxml></scxml>";
        yield meta.setScxml(version.id, scxml);
        yield meta.seal(version.id);
    }).catch((err)=>{
        console.log(err);
    });

}).catch((err)=>{
    console.log(err);
});
```
## Motivation

This module is extended to the fsm-engine module, which consumes the repository and expand its database.

## Installation

git clone the repository  
npm install  
Uses the sequelize library to connect to a database using the information given, a database library as to be installed and its type should be sent as the dialect  

  One of the following libraries will suffice:  
$ npm install --save pg pg-hstore  
$ npm install --save mysql2  
$ npm install --save sqlite3  
$ npm install --save tedious // MSSQL  

## API Reference

- Verifies if a version is sealed
  - isVersionSealed (versionID)
- Gets a finite-state machine by its name
  - getFsmByName(name)
- Finds a finite-state machine by ID
  - getFsmById(fsmID)
- Finds a version by ID
  - getVersionById(versionID)
- Returns the latest sealed finite-state machine version
  - getLatestSealedFsmVersion(fsmID)
- Returns the latest finite-state machine version
  - getLatestFsmVersion(fsmID)
- Gets all the versions of a finite-state machine
  - getFsmVersions(fsmID)
- Gets all the versions that are sealed of a finite-state machine
  - getFsmSealedVersions(fsmID)
- Creates a new Finite-state machine model.
  - createFSM(name)
- Removes a finite-State machine model if there is only one version and that version is not sealed
  - removeFSM(fsmID)
- Removes a finite-State machine model version if the version is not sealed
  - removeFSMVersion(versionID)
- Sets the current SCXML for a FSM model version
  - setScxml(versionID, scxml)
- Seals a FSM model version if it is not already sealed and the SCXML of the version is valid
  - seal(versionID)
- Creates a new version of a finite-state machine. The new version will reference the old one. The latest version must be sealed
  - newVersion(fsmID)
- Validates a SCXML string
  - validateSCXML(scxml)


## Tests

## Contributors

## License

MIT
