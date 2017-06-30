import expectations from 'expectations';
let path = require("path");
let co = require('co');
let chai = require('chai');
let assert = chai.assert;    // Using Assert style
let expect = chai.expect;    // Using Expect style
let should = chai.should();  // Using Should style
import {afterEach, before, describe, it} from "mocha";
import rimraf from "rimraf";
import Core from "../src/index";

describe('This suite tests the repository interface', () => {

    before(function(done) {
        rimraf("./test/repo", done);
    });

    afterEach(function(done) {
        // runs after each test in this block
        rimraf("./test/repo", done);
    });

    it('Should be able to add and remove a machine', () => {
        return co(function*() {
            let core = new Core("./test/repo");
            yield core.init();
            yield core.addMachine("foo");
            let machinesNames = yield core.getMachinesNames();
            expect(machinesNames.length).to.equal(1);
            expect(machinesNames).to.be.an('array').that.includes("foo");
            yield core.removeMachine("foo");
            machinesNames = yield core.getMachinesNames();
            expect(machinesNames).to.be.an('array').that.is.empty;
        });
    });

    it('Should be able to seal a version', () => {
        return co(function*() {
            let core = new Core("./test/repo");
            yield core.init();
            yield core.addMachine("foo");
            let versionsKeys = yield core.getVersionsKeys("foo");
            expect(versionsKeys).to.be.an('array').that.includes("version1");
            expect(versionsKeys.length).to.equal(1);
            yield core.sealVersion("foo", "version1");
            let versionInfo = yield core.getVersionInfo("foo", "version1");
            expect(versionInfo.isSealed).to.be.true;
            let machinesNames = yield core.getMachinesNames();
            expect(machinesNames).to.be.an('array');
            expect(machinesNames.length).to.equal(1);
        });
    });

    it('Should be able to create an instance', () => {
        return co(function*() {
            let core = new Core("./test/repo");
            yield core.init();
            yield core.addMachine("foo");
            let versionsKeys = yield core.getVersionsKeys("foo");
            expect(versionsKeys).to.be.an('array').that.includes("version1");
            expect(versionsKeys.length).to.equal(1);
            yield core.sealVersion("foo", "version1");
            yield core.addInstance("foo", "version1");
            let instancesKeys = yield core.getInstancesKeys("foo", "version1");
            expect(instancesKeys).to.be.an('array').that.includes("instance1");
            expect(instancesKeys.length).to.equal(1);
            let machinesNames = yield core.getMachinesNames();
            expect(machinesNames).to.be.an('array');
            expect(machinesNames.length).to.equal(1);
        });
    });

}).timeout(5000);
