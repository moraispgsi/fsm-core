# fsm-core
[![Build Status](https://travis-ci.org/moraispgsi/fsm-core.svg?branch=master)](https://travis-ci.org/moraispgsi/fsm-core)
[![npm version](https://badge.fury.io/js/fsm-core.svg)](https://badge.fury.io/js/fsm-core)
[![GitHub issues](https://img.shields.io/github/issues/moraispgsi/fsm-core.svg)](https://github.com/moraispgsi/fsm-core/issues)
[![GitHub forks](https://img.shields.io/github/forks/moraispgsi/fsm-core.svg)](https://github.com/moraispgsi/fsm-core/network)
[![GitHub stars](https://img.shields.io/github/stars/moraispgsi/fsm-core.svg)](https://github.com/moraispgsi/fsm-core/stargazers)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/moraispgsi/fsm-core/master/LICENSE.txt)

## Synopsis
The fsm-core module provides facilities to persist SCXML models and all its related data. The latest version of the fsm-core uses a Redis database to store both the SCXML as well as a priority queue which is managed using a library named kue       https://github.com/Automattic/kue. This is necessary for load balancing in a fsm-engine cluster. For example a 'run instance' job may be requested in the fsm-core by any of the daemons of the fsm-engine cluster and perhaps another daemon may process the job request. Another library that comes with kue is kue-scheduler https://github.com/lykmapipo/kue-scheduler this library allows for the scheduling of a job at a certain point in time. One usage would be to send an event to a machine at a specific point in time, execute an instance at a specific point in time. 

## Code Example

```javascript
/**
 * This is the example1
 * Objective: Allow one machine instance to create a new instance of another machine and start it
 * Actors:
 *  machine1: waits 10 seconds before exiting
 *  machine2: creates and starts an instance of the machine1
 * This example only enqueues the jobs, a fsm-engine cluster must be properly be configured to the redis database to consume the requests
 */

let Core = require("fsm-core");
let co = require("co");

co(function*(){
    let core = new Core();
    core.init({
        host: host,
        port: port,
        password: password
    }, {
        host: host,
        port: port,
        auth: password
    });

    // Waits for 10 seconds and exits
    let scxml1 = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript"
        xmlns:engine="https://INSTICC.org/fsm-engine"
        initial="initial">
    <datamodel>
        <data id="ticks" expr="1"/>
    </datamodel>
    <parallel id="initial">
        <state id="main">
            <onentry>
                <engine:log message="Machine has initialized." />
                <engine:log message="Scheduling exit in 10 seconds." />
                <engine:schedule when="10 seconds from now" raise="exit" />
            </onentry>
            <transition event="exit" target="final" />
        </state>
        <state id="clock">
            <onentry>
               <send event="tick" />
            </onentry>
            <transition event="tick">
                <engine:log message="%s seconds have passed." exprData="[ ticks ]" />
                <engine:schedule when="1 second from now" raise="tick" />
                <assign location="ticks" expr="ticks + 1" />
            </transition>
        </state>
    </parallel>
    <final id="final">
        <onentry>
            <engine:log message="Machine is exiting." />
        </onentry>
    </final>
    </scxml>`;

    // Creates an instance of the machine1/version1
    let scxml2 = `
    <scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript"
        xmlns:engine="https://INSTICC.org/fsm-engine"
        initial="initial">
    <datamodel>
        <data id="machine"     expr="'machine1'" />
        <data id="versionKey"  expr="'version1'" />
        <data id="instanceKey" expr="null" />
    </datamodel>
    <state id="initial">
        <onentry>
            <engine:log message="Machine has initialized." />
            <assign location="instanceKey" expr="_event.instanceKey" />
            <engine:runInstance exprMachine="machine" exprVersionKey="versionKey" exprInstanceKey="instanceKey" raise="instanceStarted" />
        </onentry>
        <transition event="instanceStarted">
            <engine:log message="Instance %s was successfully created." exprData="[ _event.instanceKey ]" />
            <engine:log message="Instance %s was successfully Started." exprData="[ _event.instanceKey ]" />
            <engine:sendEvent event="init" 
                exprEventData="{ seconds: 8, machine: 'machine2', versionKey: 'version1', instanceKey: 'instance1' }"
                exprMachine="machine" exprVersionKey="versionKey" exprInstanceKey="instanceKey" raise="eventSent" />
        </transition>
        <transition event="eventSent">
            <engine:log message="Event was sent" />
        </transition>
        <transition event="done"  target="final">
            <engine:log message="Event was received" />
        </transition>
    </state>
    <final id="final">
        <onentry>
            <engine:log message="Machine is exiting." />
        </onentry>
    </final>
    </scxml>`;

    yield core.addMachine("machine1");
    yield core.addMachine("machine2");

    yield core.setVersionSCXML("machine1", "version1", scxml1);
    yield core.setVersionSCXML("machine2", "version1", scxml2);

    yield core.sealVersion("machine1", "version1");
    yield core.sealVersion("machine2", "version1");

    let info1 = yield core.getVersionInfo('machine1', 'version1');
    let info2 = yield core.getVersionInfo('machine2', 'version1');

    let instanceKey = yield core.addInstance("machine2", "version1");
    yield core.runInstance('machine2', 'version1', instanceKey);

    console.log('Done');

}).catch((err)=>{console.log(err)});

```
## Motivation

This module was intended to be used alongside the fsm-engine module (See more in: https://github.com/moraispgsi/fsm-engine), which operates over the repository. The development of this module went through major changes. It started as an interface to store state machines in a database using a library called sequelize.js, back then we had yet to discover the SCXML standard so we were using a database to store every artifact of the state machines(we did not knew about StateCharts). For example there were tables for the state machine's states, the transitions, the inputs and the outputs. As we progressed, we found out about the SCXML whose models are usually stored in files in the file system. The database stated to be a little bit of a nuisance as it became apparent that we should be using the file system to store the SCXML models instead. Migrating to the file system implied that we would no longer have a record of the transactions done in the repository. This would be problematic in case the repository were to became corrupted. To resolve this issue we decided to use a GIT repository to have version control. For every operation done in the system a GIT commit operation would execute, leaving a message in the GIT repository records, which in turn would allow for the visualization of the progression of the system in time. Using the GIT repository has other advantages, it is easy to change the content of the repository, easy to visualize the changes done and is easy to revert back to a previous commit. Everything was good until we saw the drop in performance. Also new requirements arose, the system would have to be able to manage at least 10000 instances. No longer could we stick with the filesystem and the solution that was until then stable. We decided to try distributed services and after through research we found out about Redis and Process Manager 2. Some time passed and I managed to hook up a prototype of the system working with Redis. It was a graceful experience, the interface established previously by the fsm-core holt rather pleasantly and I was able to achieve the 10000 instances.
 ## Installation
```
npm install fsm-core --save
```
## JSDOC Reference
https://moraispgsi.github.io/fsm-core/out/

## Tests
All test were deprecated since the last update.

```
npm test
```
## Contributors

## License

MIT

