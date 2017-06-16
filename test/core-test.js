import expectations from 'expectations';
let path = require("path");
let co = require('co');
import {describe, it} from "mocha";
import rimraf from "rimraf";
import Core from "../src/index";

describe('This suite tests the repository interface', () => {
  it('Should be able to add and remove machines, seal a version, add a version, create an instance and add a snapshot', (done) => {

    co(function*(){
      try {
        let core = new Core("./test/repo");
        yield core.init();
        yield core.addMachine("deadline");
        yield core.addMachine("keynote");
        yield core.removeMachine("deadline");
        yield core.sealVersion("keynote", "version1");
        yield core.addInstance("keynote", "version1");
        yield core.addSnapshot("keynote", "version1", "instance1", {});
        yield core.addVersion("keynote");
        core.getManifest();
        core.getMachinesNames();
        yield core.removeMachine("keynote");

        done();

        yield new Promise((resolve, reject) => {
          rimraf("./test/repo", () => {
            resolve();
          });
        }).then();

      } catch (err) {

        yield new Promise((resolve, reject) => {
          rimraf("./test/repo", () => {
            resolve();
          });
        }).then();

        throw Error(err);
      }

    }).then();
  });

}).timeout(5000);;
