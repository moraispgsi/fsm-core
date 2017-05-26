/**
 * Created by Ricardo Morais on 17/04/2017.
 */


require('./../index')('mysql', '127.0.0.1', 'root', 'root', 'mydatabase', {logging: false}).then(function (meta) {
    let co = require("co");
    co(function*(){

        let data = yield meta.createFSM("deadline");
        let version = data.version;

        let scxml = `
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript"
    xmlns:ddm="https://insticc.org/DDM"
    initial="idle">
    <datamodel>
        <data id="data" expr="null"/>
    </datamodel>
        <state id="idle">
            <onentry>
                <assign location="data" expr="{id: 1, information: 'Lorem'}"/>
                <ddm:foo exprData="data" info="teste"/>
            </onentry>
           <!-- if an extension event is receive, save the extension date -->
           <transition event="extension">
           </transition>
       </state>
     <final id="final">
        <onentry>
            <ddm:bar foo="2" />
        </onentry>
    </final>
</scxml>
`;

        yield meta.setScxml(version.id, scxml);
        yield meta.seal(version.id);
        console.log("DONE");

    }).catch((err)=>{
        console.log(err);
    });

}).catch((err)=>{
    console.log(err);
});

