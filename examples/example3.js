/**
 * Created by Ricardo Morais on 17/04/2017.
 */


require('./../index')('mysql', 'localhost', 'root', 'root', 'mydatabase').then(function (meta) {
    let co = require("co");
    co(function*(){

        let data = yield meta.createFSM("deadline");
        let version = data.version;

        let scxml = `
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript"
    xmlns:ddm="https://insticc.org/DDM"
    initial="uninitialized">
    <datamodel>
        <data id="ddmHost"       expr="'http://be62e844.ngrok.io'"/>
        <data id="date"          expr="null"/>
        <data id="hasExtension"  expr="false"/>
        <data id="extensionDate" expr="null"/>
        <data id="deadlineId"    expr="-1"/>
        <data id="hideDate"      expr="null"/>
        <data id="sevenDays"     expr="1000 * 60 * 60 * 24 * 7"/>
    </datamodel>
        <state id="uninitialized">
            <transition event="init" target="idle">
                <assign location="date" expr="new Date(_event.date)"/>
                <assign location="deadlineId" expr="_event.deadlineId"/>
                <assign location="ddmHost" expr="_event.host ? _event.host : ddmHost"/>
            </transition>
        </state>
        <state id="idle">
            <onentry>
                <assign location="hideDate" expr="new Date(date.getTime() + sevenDays)"/>
            </onentry>
           <!-- if an extension event is receive, save the extension date -->
           <transition event="extension">
               <assign location="extensionDate" expr="new Date(_event.extensionDate)"/> 
               <assign location="hasExtension" expr="true"/> 
           </transition>
           <!-- if the deadline receives the event cancel it goes to the state canceled -->
           <transition event="cancel" target="canceled"/>
           <!-- if the the date expires and there isn't an extension date go to expired -->
           <transition event="1000MsTick" cond="!hasExtension &amp;&amp; (date &lt; globals.now())" target="expired"/>
           <!-- if the the date expires and there is an extension date go to extended -->
           <transition event="1000MsTick" cond="hasExtension &amp;&amp; (date &lt; globals.now())" target="extended"/>
       </state>
     <state id="extended">
        <onentry>
            <ddm:changeView exprId="deadlineId" view="extended" exprhost="ddmHost"/>
            <assign location="hideDate" expr="new Date(extendedDate.getTime() + sevenDays)"/>
        </onentry>
        <transition event="1000MsTick" cond="extensionDate &lt; globals.now()" target="expired"/>
    </state>
    <state id="expired">
        <onentry>
            <ddm:changeView exprId="deadlineId" view="expired" exprhost="ddmHost"/>
        </onentry>
        <transition event="1000MsTick" cond="hideDate &lt; globals.now()" target="final"/>
    </state>
    <state id="canceled">
        <onentry>
            <ddm:changeView exprId="deadlineId" view="canceled" exprhost="ddmHost"/>
            <assign location="hideDate" expr="new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 7)"/>
        </onentry>
        <transition event="1000MsTick" cond="hideDate &lt; globals.now()" target="final"/>
    </state>
<final id="final">
    <onentry>
            <ddm:changeView exprId="deadlineId" view="invisible" exprhost="ddmHost"/>
    </onentry>
</final>
</scxml>
`;

        yield meta.setScxml(version.id, scxml);
        yield meta.seal(version.id);

    }).catch((err)=>{
        console.log(err);
    });

}).catch((err)=>{
        console.log(err);
    });
