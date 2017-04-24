//let data = yield meta.action.createFSM("myfsm");
        // let version = data.version;

let xml_valid = `
            <scxml xmlns="http://www.w3.org/2005/07/scxml"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xmlns:ddm="http://INSTICC.org/DDM"
            datamodel="ecmascript"
            version="1.0">
    <state id="Main">   
        <!-- its initial state is Test1 -->
        <initial>  
            <transition target="Test1"/>      
        </initial>    
        
        <!-- Really simple state showing the basic syntax. -->
        <state id="Test1"> 
            <initial>
                <transition target="Test1Sub1"/>
            </initial>
            <!-- Runs before we go into the substate -->
            <onentry> 
                <log expr="'Inside Test1'"/>
            </onentry>     
             <ddm:logg/>
            <!-- Here is our first substate -->
            <state id="Test1Sub1"> 
                <onentry>   
                    <ddm:logme3 label="gdgs" expr="gdsg"/>
                    <ddm:logme label="gdgs" expr="gdsg"/>   
                </onentry>
                <onexit>
                    <log expr="'Leaving Test1Sub1'"/>
                </onexit> 
                <!-- Go to Sub2 on Event1 --> 
                <transition event="Event1" target="Test1Sub2"/> 
            </state>
            
            <!-- Here is the second substate 
           It is final, so Test1 is done when we get here -->
            <final id="Test1Sub2"/>
            
            <!-- We get this event when we reach Test1Sub2. --> 
      
            
            <!-- We run this on the way out of Test1 -->
            <onexit>
                <log expr="'Leaving Test1...'"/>
            </onexit>
        </state>
        
        <!-- End of Main > -->
    </state>
            </scxml>`;
let scxml = `
                <?xml version="1.0" encoding="us-ascii"?>
                <scxml xmlns="http://www.w3.org/2005/07/scxml"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xmlns:ddm="http://INSTICC.org/ddm"
                    version="1.0"
                    initial="Main" 
                    datamodel="ecmascript"> 
                    <state id="Main">   
                        <!-- its initial state is Test1 -->
                        <initial>  
                            <transition target="Test1"/>      
                        </initial>    
                        
                        <!-- Really simple state showing the basic syntax. -->
                        <state id="Test1"> 
                            <initial>
                                <transition target="Test1Sub1"/>
                            </initial>
                            <!-- Runs before we go into the substate -->
                            <onentry> 
                                <log expr="'Inside Test1'"/>
                            </onentry>     
                             <ddm:logg/>
                            <!-- Here is our first substate -->
                            <state id="Test1Sub1"> 
                                <onentry>   
                                    <ddm:logme3 label="gdgs" expr="gdsg"/> 
                                    <ddm:logme label="gdgs" expr="gdsg"/>   
                                </onentry>
                                <onexit>
                                    <log expr="'Leaving Test1Sub1'"/>
                                </onexit> 
                                <!-- Go to Sub2 on Event1 --> 
                                <transition event="Event1" target="Test1Sub2"/> 
                            </state>
                            
                            <!-- Here is the second substate 
                           It is final, so Test1 is done when we get here -->
                            <final id="Test1Sub2"/>
                            
                            <!-- We get this event when we reach Test1Sub2. --> 
                      
                            
                            <!-- We run this on the way out of Test1 -->
                            <onexit>
                                <log expr="'Leaving Test1...'"/>
                            </onexit>
                        </state>
                        
                        <!-- End of Main > -->
                    </state>
                </scxml>`;
let libxml = require("libxmljs");
let assert = require("assert");

const fs = require('fs');
let xsdFiles = [];
var xmlxsd = fs.readFileSync('xmlSchemas/xml.xsd','utf8')
var scxmlxsd = fs.readFileSync('xmlSchemas/scxml.xsd','utf8')
xsdFiles.push(xmlxsd);
xsdFiles.push(scxmlxsd);
  let xmllint = require('xmllint');

    let Module = {
        xml: xml_valid,
        schema: xsdFiles,
    };

    let errors = xmllint.validateXML(Module).errors;
    console.log(errors);






//https://github.com/kripken/xml.js/issues/8


//yield meta.action.setScxml(version.dataValues.id, scxml);
//yield meta.action.seal(version.dataValues.id);

