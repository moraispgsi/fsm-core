# fsm-core
[![Build Status](https://travis-ci.org/moraispgsi/fsm-core.svg?branch=master)](https://travis-ci.org/moraispgsi/fsm-core)

## Synopsis
The fsm-core module provides facilities to persist SCXML files in a git repository. Also it provides a feature to clone a repository.

## Code Example
```javascript
var co = require("co");
var Core = require("fsm-core");
co(function*(){
    try {
        let core = new Core("local_repository_path");
        yield core.init();
        //yield core.initRemoteGitSSH('ssh/git/path', 'publicKey/path', 'privateKey/path', 'passphrase');
        yield core.addMachine("foo");
        yield core.setVersionSCXML("keynote", "version1", "<scxml></scxml>");
        yield core.sealVersion("foo", "version1");
        yield core.addInstance("foo", "version1");
        yield core.addSnapshot("foo", "version1", "instance1", {});
        yield core.addVersion("foo");
        yield core.removeMachine("foo");
    } catch (err) {
        console.log(err);
    }
}).then();

```
## Motivation

This module was initially intended to be used by the fsm-engine module, which consumes the repository.
https://github.com/moraispgsi/fsm-engine

## Installation
```
npm install fsm-core --save
```
In case you want to use a remote repository, fork the base repository https://github.com/moraispgsi/fsm-core-repo and initialize the core with ssh with the following script: 
```
core.initRemoteGitSSH('ssh/git/path', 'publicKey/path', 'privateKey/path', 'passphrase').then();
```
## JSDOC Reference
https://moraispgsi.github.io/fsm-core/out/

## Tests
```
npm test
```
## Contributors

## License

MIT

