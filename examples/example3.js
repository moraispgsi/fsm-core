/**
 * Created by Ricardo Morais on 17/04/2017.
 */


require('./../index')('mysql', 'localhost', 'root', 'root', 'mydatabase').then(function (meta) {
    let co = require("co");
    co(function*(){

        let data = yield meta.action.createFSM("deadline");
        let version = data.version;

        let scxml = `
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript"
    initial="main">
    <datamodel>
        <data id="date" expr="null"/>
        <data id="hasExtension" expr="false"/>
        <data id="extensionDate" expr="null"/>
        <data id="deadlineId" expr="-1"/>
        <data id="hideDate" expr="null"/>
    </datamodel>
    <state id="main">
        <transition event="1000MsTick">
            <log label="Now: " expr="globals.now()"/>
            <raise event="tick"/>
        </transition>
        <initial>
            <transition target="uninitilized"/>
        </initial>
        <state id="uninitilized">
            <transition event="init" target="idle">
                <assign location="date" expr="new Date(_event.date)"/>
                <assign location="deadlineId" expr="_event.deadlineId"/>
                <log label="Deadline initialize id: " expr="deadlineId"/>
                <log label="Date" expr="date"/>
            </transition>
        </state>
        <state id="idle">
            <onentry>
                <log label="Status: " expr="'The deadline is idle'"/>
            </onentry>
           <!-- if an extension event is receive, save the extension date -->
           <transition event="extension">
               <assign location="extensionDate" expr="new Date(_event.extensionDate)"/> 
               <assign location="hasExtension" expr="true"/> 
               <log label="Status: " expr="'Added an extension date'"/> 
           </transition>
           <!-- if the deadline receives the event cancel it goes to the state canceled -->
           <transition event="cancel" target="canceled"/>
           
           <transition event="tick">
               <log label="hasExtension: " expr="hasExtension"/>
               <log label="date: " expr="date"/>
               <raise event="tick1"/>
               <raise event="tick2"/>
               <raise event="tick3"/>
               <log label="condition" expr="hasExtension &amp;&amp;(date &lt; globals.now())"/>
           </transition>
           
           <!-- if the the date expires and there isn't an extension date go to expired -->
           <transition event="tick1" cond="!hasExtension &amp;&amp; (date &lt; globals.now())" target="expired"/>
           <!-- if the the date expires and there is an extension date go to extended -->
           <transition event="tick2" cond="hasExtension &amp;&amp; (date &lt; globals.now())" target="extended"/>
       </state>
     <state id="extended">
        <onentry>
            <log label="Status: " expr="'Deadline was extended'"/>
            <changeView id="deadlineId" view="extended"/>
        </onentry>
        <transition event="tick" cond="extensionDate &lt; globals.now()" target="expired"/>
    </state>
    <state id="expired">
        <onentry>
            <log label="Status: " expr="'Deadline has expired'"/>
            <changeView id="deadlineId" view="expired"/>
            <assign location="hideDate" expr="new Date().setDays(globals.now().getDays + 7)"/>
        </onentry>
        <transition event="5000MsTick" cond="hideDate &lt; globals.now()" target="final"/>
    </state>
    <state id="canceled">
        <onentry>
            <log label="Status: " expr="'Deadline was canceled'"/>
            <changeView id="deadlineId" view="canceled"/>
            <assign location="hideDate" expr="new Date().setDays(globals.now().getDays + 7)"/>
        </onentry>
        <transition event="5000MsTick" cond="hideDate &lt; globals.now()" target="final"/>
    </state>
</state>
<final id="final">
    <onentry>
            <log label="Status: " expr="'Deadline as change to invisible'"/>
        <changeView id="deadlineId" view="invisible"/>
    </onentry>
</final>
</scxml>
`;

        yield meta.action.setScxml(version.dataValues.id, scxml);
        yield meta.action.seal(version.dataValues.id);

    });

});
