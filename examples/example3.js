/**
 * Created by Ricardo Morais on 17/04/2017.
 */


require('./../index')('mysql', 'localhost', 'root', 'root', 'mydatabase').then(function (meta) {
    let co = require("co");
    co(function*(){

        let data = yield meta.action.createFSM("myfsm");
        let version = data.version;

        let scxml = `
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript"
    initial="uninitilized"
    >
    <datamodel>
        <data id="date"/>
        <data id="extensionDate"/>
        <data id="deadlineId"/>
    </datamodel>
    <state id="uninitilized">
        <transition event="initialize" target="running">
            <assign location="date" expr="_event.date"/>
            <assign location="deadlineId" expr="_event.deadlineId"/>
        </transition>
    </state>
    <state id="running">
        <transition event="extension" target="extended">
           <assign location="extensionDate" expr="_event.extensionDate"/> 
        </transition>
        <transition event="cancel" target="canceled">
           <cancel sendid="timer"/> 
        </transition>
        <state id="running.start">
            <onentry>
                <log label="Start"/>
                <send id="timer" event="timeout" delay="20s"/>
                <raise event="wait" />
            </onentry>
            <transition event="wait" target="running.waiting"/>
        </state>  
        <state id="running.waiting">
            <onentry>
                <log label="Waiting"/>
            </onentry>
            <transition event="timeout" cond="date &lt; new Date()" target="expired">
                <log label="Timeout received!"/>
            </transition>
            <transition event="timeout" target="running.start">
                <log label="Not the time yet!"/>
            </transition>
        </state>  
    </state>
    <state id="extended">
        <onentry>
            <changeView id="deadlineId" view="expired"/>
        </onentry>
        <state id="extended.start">
            <onentry>
                <log label="Start"/>
                <send id="timer4" event="timeout" delay="20s"/>
                <raise event="wait" />
            </onentry>
            <transition event="wait" target="extended.waiting"/>
        </state>  
        <state id="extended.waiting">
            <onentry>
                <log label="Waiting"/>
            </onentry>
            <transition event="timeout" cond="extensionDate &lt; new Date()" target="expired">
                <log label="Timeout received!"/>
            </transition>
            <transition event="timeout" target="extended.start">
                <log label="Not the time yet!"/>
            </transition>
        </state>  
    </state>
    <state id="expired">
        <onentry>
            <log label="Expired"/>
            <changeView id="deadlineId" view="expired"/>
            <send id="timer1" event="timeout" delay="10s"/>
        </onentry>
        <transition event="timeout" target="final"/>
    </state>
    <state id="canceled">
        <onentry>
            <log label="Canceled"/>
            <changeView id="deadlineId" view="canceled"/>
            <send id="timer2" event="timeout" delay="10s"/>
        </onentry>
        <transition event="timeout" target="final"/>
    </state>
    <final id="final">
        <onentry>
            <log label="Change view to invisible"/>
            <changeView id="deadlineId" view="invisible"/>
        </onentry>
    </final>
</scxml>
`;

        yield meta.action.setScxml(version.dataValues.id, scxml);
        yield meta.action.seal(version.dataValues.id);

    });

});
