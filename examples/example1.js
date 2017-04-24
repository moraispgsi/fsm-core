/**
 * Created by Ricardo Morais on 27/03/2017.
 */
let core =  require('./../index')('mysql', 'localhost', 'root', 'root', 'mydatabase');
let ioCore = core.dependencies.ioCore;

// core.sequelize.sync({force: true}).then(function() {
//    console.log("done");
//    ioCore.command.createAction("action1", [{name: 'log', type: 'string'}])
//         .then(()=>{ ioCore.model.action.findAll().then((data)=> {
//             console.log(data);
//     })});
//
// });

//
// let builder = require('./configuration-builder');
// let x = builder
//     .addstate("state1")
//     .setinitialstate("state1")
//     .addstate("state2")
//     .onenter("state1", "log(\"text\")")
//     .addtransition("state1", "state2", "generate")
//     .build({
//         pretty: true,
//         indent: '  ',
//         newline: '\n',
//         allowempty: false
//     });
// console.log(x);
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
            yield core.action.setInitialState(initialState.dataValues.id, version.dataValues.id);
            let action = yield ioCore.action.createAction('log', [{
                name: "title",
                type: "string"
            }, {
                name: "text",
                type: "string"
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
                title: "Test",
                text: "My text"
            });
            yield core.action.onEnter(actionCall.dataValues.id, initialState.dataValues.id);
            yield core.action.seal(version.dataValues.id);
        } catch(error){
            console.log(error);
        }
    })
});

