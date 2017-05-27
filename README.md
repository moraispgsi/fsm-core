# fsm-core

This module creates a very simple repository for SCXML files in a database. It uses the library sequelize.js in order to provide support for several database servers like MySQL, MongoDB and others. The module also provides a very simple linear version system for realtime environments. 

The repository created is composed of two database tables:
-FsmCoreFsm //Each row is a finite-state machine model
-FsmCoreVersion //Each row is a finite-state machine model version

API:
* Verifies if a version is sealed
isVersionSealed (versionID)
* Gets a finite-state machine by its name
getFsmByName(name)
* Finds a finite-state machine by ID
getFsmById(fsmID)
* Finds a version by ID
getVersionById(versionID)
* Returns the latest sealed finite-state machine version
getLatestSealedFsmVersion(fsmID)
* Returns the latest finite-state machine version
getLatestFsmVersion(fsmID)
* Gets all the versions of a finite-state machine
getFsmVersions(fsmID)
* Gets all the versions that are sealed of a finite-state machine
getFsmSealedVersions(fsmID)
* Creates a new Finite-state machine model.
createFSM(name)
* Removes a Finite-State machine model if there is only one version and that version is not sealed
removeFSM(fsmID)
* Removes a Finite-State machine model version if the version is not sealed
removeFSMModelVersion(versionID)
* Sets the current scxml for a FSM model version
setScxml(versionID, scxml)
* Seals a FSM model version if it is not already sealed and the scxml of the version is valid
seal(versionID)
* Creates a new version from of a finite-state machine. The new version will reference the old one. The latest version must be sealed
newVersion(fsmID)
* Validates a SCXML string
validateSCXML(scxml)
