# fsm-core
[![Build Status](https://travis-ci.org/moraispgsi/fsm-core.svg?branch=master)](https://travis-ci.org/moraispgsi/fsm-core)
[![npm version](https://badge.fury.io/js/fsm-core.svg)](https://badge.fury.io/js/fsm-core)
[![GitHub issues](https://img.shields.io/github/issues/moraispgsi/fsm-core.svg)](https://github.com/moraispgsi/fsm-core/issues)
[![GitHub forks](https://img.shields.io/github/forks/moraispgsi/fsm-core.svg)](https://github.com/moraispgsi/fsm-core/network)
[![GitHub stars](https://img.shields.io/github/stars/moraispgsi/fsm-core.svg)](https://github.com/moraispgsi/fsm-core/stargazers)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/moraispgsi/fsm-core/master/LICENSE.txt)

## Synopsis
The fsm-core module provides facilities to persist SCXML files in a git repository. The idea is be able to version control for the repository using git and therefor be able to have a history for the evolution of the repository and a way to revert to a previous point in history. Also it provides a feature to clone from a remote repository using ssh.

## Code Example
```javascript
//using the co library for ease of use
//$ npm install co 
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

This module was intended to be used alongside the fsm-engine module, which operates over the repository.
See more in: https://github.com/moraispgsi/fsm-engine

## Installation
```
npm install fsm-core --save
```
In case you want to use a remote repository, fork the base repository from https://github.com/moraispgsi/fsm-core-repo and initialize the core with ssh with the following script: 
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

