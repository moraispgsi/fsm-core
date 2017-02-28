/**
 * Created by Ricardo Morais on 25/02/2017.
 */

module.exports = function(dialect, host, user, password, database) {

    let Sequelize = require('sequelize');
    let ioCore =  require('io-core')(dialect, host, user, password, database);
    let sequelize = ioCore.sequelize;
    let moduleName = 'FSMCore';
    let meta = {
        sequelize: sequelize,
        name: 'fsmcore',
        dependencies: {
            ioCore: ioCore,
        },
        model: {
            FSM: sequelize.define(moduleName + 'Fsm', {
                name: {type: Sequelize.STRING, allowNull: false, unique: true},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
            Version: sequelize.define(moduleName + 'Version', {
                isSealed: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
            State: sequelize.define(moduleName + 'State', {
                name: {type: Sequelize.STRING, allowNull: false, unique: 'stateVersion'},
                versionID: {type: Sequelize.INTEGER, allowNull: false, unique: 'stateVersion'},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
            Transition: sequelize.define(moduleName + 'Transition', {
                fromID: {type: Sequelize.INTEGER, allowNull: false, unique: 'transitionState'},
                toID: {type: Sequelize.INTEGER, allowNull: false, unique: 'transitionState'},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
            TransitionInputBond: sequelize.define(moduleName + 'TransitionInputBond',{
                transitionID: {type: Sequelize.INTEGER, allowNull: false, unique: 'inputTransition'},
                inputID: {type: Sequelize.INTEGER, allowNull: false, unique: 'inputTransition'},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
            TransitionOutputBond: sequelize.define(moduleName + 'TransitionOutputBond', {
                transitionID: {type: Sequelize.INTEGER, allowNull: false, unique: 'outputTransition'},
                outputID: {type: Sequelize.INTEGER, allowNull: false, unique: 'outputTransition'},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
            StateOutputBond: sequelize.define(moduleName + 'StateOutputBond', {
                stateID: {type: Sequelize.INTEGER, allowNull: false, unique: 'outputState'},
                outputID: {type: Sequelize.INTEGER, allowNull: false, unique: 'outputState'},
            }, {
                freezeTableName: true,
                underscoredAll: false
            }),
        },
        query: {
            assert: {
                assertVersionNotSealed: (versionID) => {

                    return new Promise((resolve, reject) => {
                        meta.model.Version.findById(versionID).then((version) => {

                            if (!version) {
                                reject('version not found');
                                return;
                            }

                            if(version.dataValues.isSealed) {
                                reject('version is sealed');
                                return;
                            }

                            resolve(version);

                        });
                    });

                },
                assertVersionSealed: (versionID) => {

                    return new Promise((resolve, reject) => {

                        meta.model.Version.findById(versionID)
                            .then((version) => {

                                if (!version) {
                                    //throw 'version not found';
                                    reject('version not found');
                                    return;
                                }

                                if(!version.dataValues.isSealed) {
                                    //throw 'version is not sealed';
                                    reject('version is not sealed');
                                    return;
                                }

                                resolve(version);

                            });
                    });

                },
                assertStateVersionNotSealed: (stateID) => {
                    return new Promise((resolve, reject)=> {
                        meta.model.State.findById(stateID)
                            .catch(() => reject('state not found'))
                            .then((state) => {
                                meta.query.assert.assertVersionNotSealed(state.dataValues.versionID)
                                    .catch((err) => reject(err))
                                    .then(() => resolve())
                            });
                    });

                },
                assertTransitionVersionNotSealed (transitionID){
                    return new Promise((resolve, reject)=> {
                        meta.model.Transition
                            .findById(transitionID)
                            .catch(() => reject('transition not found'))
                            .then((transition) => {
                                meta.query.assert
                                    .assertStateVersionNotSealed(transition.dataValues.fromID)
                                    .catch((err)=>reject(err))
                                    .then(()=>resolve());
                            });
                    });
                }
            },
            get: {
                isVersionSealed: (versionID) => {
                    return new Promise((resolve, reject) => {
                        meta.model.Version.findById(versionID).then((version) => {

                            if (!version) {
                                reject('version not found');
                                return;
                            }

                            resolve(version.dataValues.isSealed);

                        });
                    });
                },
                versionTransitions: (versionID) => {
                    return new Promise((resolve, reject) => {
                        meta.model.Transition.findAll({
                            where: Sequelize.where(Sequelize.col('transitionFromState.versionID'), versionID),
                            include: [
                                {
                                    model: meta.model.State,
                                    as: 'transitionFromState'
                                },
                                {
                                    model: meta.model.State,
                                    as: 'transitionToState'
                                }
                            ]
                        }).then((transitions) => {
                            resolve(transitions);
                        });
                    });
                },
                versionStateOutputBond: (versionID) => {

                    return new Promise((resolve, reject) => {

                        meta.model.StateOutputBond.findAll({
                            where: Sequelize.where(Sequelize.col('stateFK.versionID'), versionID),
                            include: [
                                {
                                    model: meta.model.State,
                                    as: 'stateFK'
                                }
                            ]
                        }).then((transitions) => {
                            resolve(transitions);
                        });
                    });
                },
                versionTransitionInputBond: (versionID) => {
                    return new Promise((resolve, reject) => {
                        meta.model.TransitionInputBond.findAll({
                            where: Sequelize.where(Sequelize.col('transitionFK.transitionFromState.versionID'), versionID),
                            include: [
                                {
                                    model: meta.model.Transition,
                                    as: 'transitionFK',
                                    include: [{
                                        model: meta.model.State,
                                        as: 'transitionFromState',
                                    }]
                                }
                            ]
                        }).then((transitions) => {
                            resolve(transitions);
                        });
                    });
                },
                versionTransitionOutputBond: (versionID) => {
                    return new Promise((resolve, reject) => {
                        meta.model.TransitionOutputBond.findAll({
                            where: Sequelize.where(Sequelize.col('transitionFK.transitionFromState.versionID'), versionID),
                            include: [
                                {
                                    model: meta.model.Transition,
                                    as: 'transitionFK',
                                    include: [{
                                        model: meta.model.State,
                                        as: 'transitionFromState',
                                    }]
                                }
                            ]
                        }).then((transitions) => {
                            resolve(transitions);
                        });
                    });
                }
            },
            action: {
                createFSM: function(name){
                    //out FSMID, out VersionID
                    //todo: transaction in order to rollback on failure
                    return new Promise((resolve, reject) => {
                        meta.model.FSM.create({
                            name: name
                        }).then((fsm) => {
                            meta.model.Version
                                .create({fsmID: fsm.dataValues.id})
                                .then((version) => {
                                    resolve({
                                        fsm: fsm,
                                        version: version});
                                }).catch(()=>{
                                    reject('version not created')
                                });
                        }).catch(()=>{
                            reject('fsm not created')
                        });
                    });
                },
                createState: function(name, versionID){
                  // out StateID
                    return new Promise((resolve, reject) => {

                        meta.query.assert
                            .assertVersionNotSealed(versionID).catch((err) =>{
                                reject(err);
                            })
                            .then(() => {

                                meta.model.State
                                    .create({
                                        name: name,
                                        versionID: versionID
                                    })
                                    .then((state) => {
                                        resolve(state);
                                    }).catch(()=>{
                                        reject('state not created');
                                    });
                            });
                    });
                },
                createTransition: function(fromID, toID){
                    // out TransitionID
                    return new Promise((resolve, reject) => {

                        meta.model.State.findById(fromID).then((fromState) => {

                            meta.model.State.findById(toID).then((toState) => {

                                if(fromState.dataValues.versionID != toState.dataValues.versionID )
                                    reject('versions do not match');

                                let versionID = fromState.dataValues.versionID;

                                meta.query.assert
                                    .assertVersionNotSealed(versionID)
                                    .catch((err) => {
                                        reject(err);
                                    }).then(() => {

                                        meta.model.Transition
                                            .create({
                                                fromID: fromID,
                                                toID: toID,
                                            }).catch(()=>{
                                                reject('transition not created');
                                            }).then((transition) => {
                                                resolve(transition);
                                        });
                                });
                            });
                        });
                    });
                },
                removeFSMModel: function(fsmID){

                    return new Promise((resolve, reject) => {
                        meta.model.FSM.findById(fsmID).then((fsm) => {

                            if(!fsm){
                                reject('fsm not found');
                                return;
                            }

                            meta.model.Version.findAll({
                                where: {
                                    fsmID: fsm.dataValues.id
                                }
                            }).then((versions)=>{

                                if(versions.length > 1){
                                    reject('fsm has more than one version');
                                    return;
                                }

                                //Fms has at least one version therefor the array has one version

                                let versionID = versions[0].dataValues.id;

                                if(versions[0].dataValues.isSealed){
                                    reject('fsm version is sealed');
                                    return;
                                }

                                //Cascade deletion
                                fsm.destroy();

                            });

                        });
                    });
                },
                removeFSMModelVersion: function(versionID){
                    return new Promise((resolve, reject) => {

                        meta.model.Version.findById(versionID).then((version) => {

                            if(!version){
                                reject('version not found');
                                return;
                            }

                            if(version.dataValues.isSealed){
                                reject('fsm version is sealed');
                                return;
                            }

                            meta.model.FSM.findOne({
                                where: {
                                    id: version.dataValues.fsmID
                                }
                            }).then((fsm)=>{

                                //If the fsm has only one version, the fsm  must be removed
                                meta.model.Version
                                    .findAll({
                                        where: {
                                            id: versionID
                                        },
                                        attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'count']]
                                    })
                                    .then((rows) => {


                                        version.destroy();

                                        //There is only one version and the version is not sealed
                                        if(rows[0].dataValues.count == 1){
                                            fsm.destroy();
                                        }

                                        resolve();
                                        return;

                                    });
                                });
                        });
                    });

                },
                removeState: function(stateID){
                    return new Promise((resolve, reject) => {
                        meta.model.State.findById(stateID).then((state)=>{
                            meta.assert.assertVersionNotSealed(state.dataValues.versionID)
                                .catch((err) => reject(err))
                                .then(()=>{
                                    state.destroy();
                                })
                        });
                    });
                },
                removeTransition: function(transitionID){
                    return new Promise((resolve, reject) => {
                        meta.assert.assertTransitionVersionNotSealed(transitionID)
                                    .catch((err) => reject(err))
                                    .then(()=>{
                                        transition.destroy();
                                    });
                    });
                },
                setInitialState: function(stateID){
                    return new Promise((resolve, reject) => {
                        meta.model.State.findById(stateID).then((state)=>{
                            meta.query.assert.assertVersionNotSealed(state.dataValues.versionID)
                                .catch((err) => reject(err))
                                .then(()=>{

                                    meta.model.Version.update({
                                        initialStateID: stateID,
                                    }, {
                                        where: {
                                            id: state.dataValues.versionID
                                        }
                                    }).catch(()=>reject('could not set initial state'))
                                      .then(()=>resolve());

                                })
                        });
                    });
                },
                unsetInitialState: function(versionID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertVersionNotSealed(versionID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.Version.update({
                                    initialStateID: null,
                                }, {
                                    where: {
                                        id: versionID
                                    }
                                }).catch(()=>reject('could not set initial state'))
                                    .then(()=>resolve());

                            })
                    });
                },
                seal: function(versionID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertVersionNotSealed(versionID)
                            .catch((err) => reject(err))
                            .then((version)=>{

                                if(version.dataValues.initialStateID == null){
                                    reject('version must have a initial state');
                                    return;
                                }

                                meta.model.Version.update({
                                    isSealed: true,
                                }, {
                                    where: {
                                        id: versionID
                                    }
                                }).catch(()=>reject('could not seal the version'))
                                    .then(()=>resolve());
                            });
                    });
                },
                bindInputToTransition: function(inputID, transitionID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertTransitionVersionNotSealed(transitionID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.TransitionInputBond.create({
                                    transitionID: transitionID,
                                    inputID: inputID
                                })  .catch(()=>reject('could not create bond'))
                                    .then((transitionInputBond)=>resolve(transitionInputBond));
                            });
                    });
                },
                bindOutputToTransition: function(outputID, transitionID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertTransitionVersionNotSealed(transitionID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.TransitionOutputBond.create({
                                    transitionID: transitionID,
                                    outputID: outputID
                                })  .catch(()=>reject('could not create bond'))
                                    .then((transitionInputBond)=>resolve(transitionInputBond));
                            });
                    });
                },
                bindOutputToState: function(outputID, stateID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertStateVersionNotSealed(stateID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.StateOutputBond.create({
                                    stateID: stateID,
                                    outputID: outputID
                                })  .catch(()=>reject('could not create bond'))
                                    .then((transitionInputBond)=>resolve(transitionInputBond));
                            });
                    });
                },
                unbindInputToTransition: function(inputID, transitionID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertTransitionVersionNotSealed(transitionID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.TransitionInputBond.findAll({
                                    where: {
                                        transitionID: transitionID,
                                        inputID: inputID
                                    }
                                }).catch(()=>reject('could not find bond')).then((bond)=>{
                                    bond.destroy()
                                        .catch(reject('could not unbind'))
                                        .then(resolve);
                                });
                            });
                    });
                },
                unbindOutputToTransition: function(outputID, transitionID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertTransitionVersionNotSealed(transitionID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.TransitionOutputBond.findAll({
                                    where: {
                                        transitionID: transitionID,
                                        outputID: outputID
                                    }
                                }).catch(()=>reject('could not find bond')).then((bond)=>{
                                    bond.destroy()
                                        .catch(reject('could not unbind'))
                                        .then(resolve);
                                });
                            });
                    });
                },
                unbindOutputToState: function(outputID, stateID){
                    return new Promise((resolve, reject) => {
                        meta.query.assert.assertTransitionVersionNotSealed(transitionID)
                            .catch((err) => reject(err))
                            .then(()=>{
                                meta.model.StateOutputBond.findAll({
                                    where: {
                                        stateID: stateID,
                                        outputID: outputID
                                    }
                                }).catch(()=>reject('could not find bond')).then((bond)=>{
                                    bond.destroy()
                                        .catch(reject('could not unbind'))
                                        .then(resolve);
                                });
                            });
                    });
                },
                cloneFSMModel: function(versionID){
                    // out FSMID, out VersionID
                    return new Promise((resolve, reject) => {
                        //create states
                        //create transitions
                        //create bonds
                    });
                },
                refurbishFSMModelVersion: function(versionID){
                    // out VersionID
                    return new Promise((resolve, reject) => {

                        //check if version is sealed, if the version is sealed copy all
                        let newVersion;
                        meta.query.assert
                            .assertVersionSealed(versionID)
                            .then((version)=> {
                                console.log("HEREEEEE");

                                return meta.model.Version.create({
                                    fsmID: version.dataValues.fsmID,
                                    versionParentForkID: versionID
                                });
                            })
                            .catch((err)=>{
                                return Promise.reject(err);
                            })
                            .then((version)=> {
                                newVersion = version;
                                //create states
                                return meta.model.State.findAll({
                                    where: {
                                        versionID: versionID
                                    }
                                });
                            })
                            .catch((err)=>{
                                return Promise.reject(err);
                            })
                            .then((states)=> {
                                let promises = [];
                                for (let state of states) {
                                    promises
                                        .push(meta.query.action.createState(state.dataValues.name, newVersion.dataValues.id));
                                }
                                return Promise.all(promises).then(() => {
                                    return meta.query.get.versionTransitions(versionID);
                                });
                            })
                            .catch((err)=>{
                                return Promise.reject(err);
                            })
                            .then((transitions)=>{
                                let promises = [];
                                for(let transition of transitions){
                                    promises.push(new Promise((resolve, reject) => {
                                        let fromStateName = transition.dataValues.transitionFromState.dataValues.name;
                                        let toStateName = transition.dataValues.transitionToState.dataValues.name;
                                        let fromState;
                                        let toState;
                                        meta.model.State.findOne({
                                            where: {
                                                versionID: newVersion.dataValues.id,
                                                name: fromStateName
                                            }
                                        }).then((data)=>{
                                            fromState = data;
                                            return meta.model.State.findOne({
                                                where: {
                                                    versionID: newVersion.dataValues.id,
                                                    name: toStateName
                                                }
                                            });
                                        }).then((data)=> {
                                            toState = data;
                                            return meta.query.action
                                                .createTransition(fromState.dataValues.id, toState.dataValues.id);
                                        }).then((transition) => {
                                                resolve(newVersion);
                                            });
                                    }));
                                }
                                Promise.all(promises).then(()=>{
                                    return meta.query.get.versionStateOutputBond(versionID)
                                }).then((rows)=> {
                                    let promises = [];
                                    for(let row of rows) {
                                        promises.push(new Promise((resolve, reject) => {
                                            meta.model.State.findOne({
                                                where: {
                                                    versionID: newVersion.dataValues.id,
                                                    name: row.dataValues
                                                        .stateFK
                                                        .dataValues.name
                                                }
                                            }).then((state)=>{

                                                meta.query.action.bindOutputToState(row.dataValues.outputID, state.dataValues.id)
                                                    .then(()=>resolve());
                                            });
                                        }));
                                    }
                                    return Promise.all(promises);
                                }).then(()=>{
                                    return meta.query.get.versionTransitionInputBond(versionID)
                                }).then((rows)=> {
                                    let promises = [];

                                    for(let row of rows) {
                                        promises.push(new Promise((resolve, reject) => {
                                            let _transition;
                                            let _fromStateName;
                                            let _toStateName;
                                            let _newFromState;
                                            let _newToState;
                                            meta.model.Transition.findById(row.dataValues.transitionID)
                                                .then((transition)=> {
                                                    _transition = transition;
                                                    return meta.model.State.findById(_transition.dataValues.fromID);
                                                }).then((fromState)=> {
                                                    _fromStateName = fromState.dataValues.name;
                                                    return meta.model.State.findById(_transition.dataValues.toID);
                                                }).then((toState)=> {
                                                    _toStateName = toState.dataValues.name;
                                                    return meta.model.State.findOne({
                                                        where: {
                                                            name: _fromStateName,
                                                            versionID: newVersion.dataValues.id
                                                        }
                                                    });
                                                }).then((fromState) => {
                                                    _newFromState = fromState;
                                                    return meta.model.State.findOne({
                                                        where: {
                                                            name: _toStateName,
                                                            versionID: newVersion.dataValues.id
                                                        }
                                                    });
                                                }).then((toState) => {
                                                    _newToState = toState;

                                                    return meta.model.Transition.findOne({
                                                        where: {
                                                            fromID: _newFromState.dataValues.id,
                                                            toID: _newToState.dataValues.id
                                                        }
                                                    });
                                                }).then((transition)=>{
                                                    meta.query
                                                        .action
                                                        .bindInputToTransition(row.dataValues.inputID, transition.dataValues.id)
                                                        .then(()=>resolve());
                                                });
                                        }));

                                    }
                                    return Promise.all(promises);
                                }).then(()=>{

                                    return meta.query.get.versionTransitionOutputBond(versionID);
                                }).then((rows)=> {
                                    let promises = [];
                                    for(let row of rows) {
                                        promises.push(new Promise((resolve, reject) => {
                                            let _transition;
                                            let _fromStateName;
                                            let _toStateName;
                                            let _newFromState;
                                            let _newToState;
                                            meta.model.Transition.findById(row.dataValues.transitionID)
                                                .then((transition)=> {
                                                    _transition = transition;
                                                    return meta.model.State.findById(_transition.dataValues.fromID);
                                                }).then((fromState)=> {
                                                _fromStateName = fromState.dataValues.name;
                                                return meta.model.State.findById(_transition.dataValues.toID);
                                            }).then((toState)=> {
                                                _toStateName = toState.dataValues.name;

                                                return meta.model.State.findOne({
                                                    where: {
                                                        name: _fromStateName,
                                                        versionID: newVersion.dataValues.id
                                                    }
                                                });
                                            }).then((fromState) => {
                                                _newFromState = fromState;

                                                return meta.model.State.findOne({
                                                    where: {
                                                        name: _toStateName,
                                                        versionID: newVersion.dataValues.id
                                                    }
                                                });
                                            }).then((toState) => {
                                                _newToState = toState;
                                                return meta.model.Transition.findOne({
                                                    where: {
                                                        fromID: _newFromState.dataValues.id,
                                                        toID: _newToState.dataValues.id
                                                    }
                                                });
                                            }).then((transition)=>{

                                                meta.query.action
                                                    .bindOutputToTransition(row.dataValues.outputID,transition.dataValues.id)
                                                    .then(()=>resolve());

                                            });
                                        }));
                                    }
                                    return Promise.all(promises);
                                }).then(()=>resolve(newVersion));
                            }).catch((err)=>{
                                reject(err);
                            });
                        });
                }
            }
        }

    };

    meta.model.Version.belongsTo(meta.model.FSM, {foreignKey: 'fsmID', constraints: false, onDelete: 'CASCADE'});
    meta.model.State.belongsTo(meta.model.Version, {foreignKey: 'versionID', constraints: false, onDelete: 'CASCADE'});
    meta.model.Version.belongsTo(meta.model.State, {foreignKey: 'initialStateID', constraints: false});
    meta.model.Version.belongsTo(meta.model.Version, {foreignKey: 'versionParentForkID', constraints: false, onDelete: 'CASCADE'});
    meta.model.Transition.belongsTo(meta.model.State, {as: 'transitionFromState',foreignKey: 'fromID', constraints: false,onDelete: 'CASCADE'});
    meta.model.Transition.belongsTo(meta.model.State, {as: 'transitionToState',foreignKey: 'toID', constraints: false, onDelete: 'CASCADE'});
    meta.model.StateOutputBond.belongsTo(meta.model.State, {
        as: 'stateFK',
        foreignKey: 'stateID',
        constraints: false,
        onDelete: 'CASCADE'
    });
    meta.model.StateOutputBond.belongsTo(ioCore.model.Output, {
        as: 'outputFK',
        foreignKey: 'outputID',
        constraints: false,
        onDelete: 'CASCADE'
    });
    meta.model.TransitionInputBond.belongsTo(meta.model.Transition, {
        as: 'transitionFK',
        foreignKey: 'transitionID',
        constraints: false,
        onDelete: 'CASCADE'
    });
    meta.model.TransitionInputBond.belongsTo(ioCore.model.Input, {
        as: 'inputFK',
        foreignKey: 'inputID',
        constraints: false,
        onDelete: 'CASCADE'
    });
    meta.model.TransitionOutputBond.belongsTo(meta.model.Transition, {
        as: 'transitionFK',
        foreignKey: 'transitionID',
        constraints: false,
        onDelete: 'CASCADE'
    });
    meta.model.TransitionOutputBond.belongsTo(ioCore.model.Output, {
        as: 'outputFK',
        foreignKey: 'outputID',
        constraints: false,
    });

    return meta;

};