/**
 * Created by Ricardo Morais on 27/03/2017.
 */
require('./../index')('mysql', 'localhost', 'root', 'root', 'mydatabase').then(function (core) {
    let ioCore = core.dependencies.ioCore;
    let co = require("co");
    core.sequelize.sync().then(function() {

        co(function *() {
            try {
                let inputExpired = yield ioCore.action.createInput('expired');
                let data = yield core.action.createFSM("deadline");
                let version = data.version;
                let initialState = yield core.action.createState("initial", version.dataValues.id);
                let generatedState = yield core.action.createState('generated', version.dataValues.id);
                let validatedState = yield core.action.createState('validated', version.dataValues.id);
                let extensionState = yield core.action.createState('extension', version.dataValues.id);
                let expiredState = yield core.action.createState('expired', version.dataValues.id);
                let transitionValidatedToExpired = yield core.action.createTransition(
                    validatedState.dataValues.id,
                    expiredState.dataValues.id);
                let transitionInput1 = yield core.action.bindInputToTransition(
                    inputExpired.dataValues.id,
                    transitionValidatedToExpired.dataValues.id);
                yield core.action.setInitialState(validatedState.dataValues.id, version.dataValues.id);
                let action = yield ioCore.action.createAction('logme', [{
                    name: "title",
                    type: "expr"
                }, {
                    name: "text",
                    type: "expr"
                }]);
                let action2 = yield ioCore.action.createAction('setInstanceProperty', [{
                    name: "propertyName",
                    type: "expr"
                }, {
                    name: "value",
                    type: "expr"
                }]);

                let action3 = yield ioCore.action.createAction('eval', [{
                    name: "script",
                    type: "expr"
                }]);

                let parametersResult = yield ioCore.query.getActionParameters(action.dataValues.id);
                let parameters = [];
                for(let param of parametersResult) {
                    parameters.push({
                        id: param.dataValues.id,
                        name: param.dataValues.name,
                        type: param.dataValues.type
                    });
                }
                let actionCall = yield ioCore.action.createActionCall(action.dataValues.id, {
                    title: "Test1",
                    text: "_event"
                }, null, 1);
                let actionCall1 = yield ioCore.action.createActionCall(action.dataValues.id, {
                    title: "Test2",
                    text: "My text"
                }, null, 2);
                let actionCall2 = yield ioCore.action.createActionCall(action.dataValues.id, {
                    title: "Test2",
                    text: "My text"
               }, actionCall.dataValues.id, 3);

                let actionCall3 = yield ioCore.action.createActionCall(action3.dataValues.id, {
                    script: "this.log(context, {title: \"Number:\", text: (2+5).toString());"
                }, null, 4);
                yield core.action.onTransition(actionCall.dataValues.id, transitionValidatedToExpired.dataValues.id);
                // yield core.action.onEnter(actionCall2.dataValues.id, validatedState.dataValues.id);
                yield core.action.onEnter(actionCall1.dataValues.id, expiredState.dataValues.id);
                yield core.action.seal(version.dataValues.id);
            } catch(error){
                console.log(error);
            }
        })
    });
});
