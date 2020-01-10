// If all events for the specified component have been dealt with,
// changes the state of the Status.io incident for this component
// to be the specified value.
//
// Nothing is done if there are still active events.

/* global http, input */

function getActiveIncidents() {
    // Get the incidents that are active on status.io
    console.log("getActiveIncidents");
    var result = [];
    var request = http.request({
        endpoint: 'Status.io',
        method: 'GET',
        path: '/v2/incidents/' + input["Status.io Page ID"],
        headers: {
            'x-api-id': input["Status.io API ID"],
            'x-api-key': input["Status.io API Key"]
        }
    });
    var response = request.write();

    if (response.statusCode == 200) {
        var incidents = JSON.parse(response.body);
        result = incidents.result.active_incidents;
    } else {
        console.log("  got status code "+response.statusCode);
    }

    return result;
}

function getIncident(incidentId) {
    console.log("getIncident "+incidentId);
    // Get the specified incident from status.io
    var request = http.request({
        endpoint: 'Status.io',
        method: 'GET',
        path: '/v2/incident/' + input["Status.io Page ID"] + '/' + incidentId,
        headers: {
            'x-api-id': input["Status.io API ID"],
            'x-api-key': input["Status.io API Key"]
        }
    });
    var response = request.write();

    if (response.statusCode == 200) {
        var json = JSON.parse(response.body);
        // API returns an array but it is only a single incident.
        console.log("  returning incident details");
        return json.result[0];
    }

    console.log("  returning null. Status code was "+response.statusCode);
    return null;
}

function findIncident(component) {
    console.log("findIncident");
    // Try to find an active incident for the specified component
    var activeIncidents = getActiveIncidents();

    if (activeIncidents.length !== 0) {
        console.log("  got "+activeIncidents.length+" active incidents");
        var incidentIndex;

        for (incidentIndex = 0; incidentIndex < activeIncidents.length; incidentIndex++) {
            var incident = getIncident(activeIncidents[incidentIndex]);

            if (incident !== null) {
                // Check the affected components to see if we have a match
                if ("components_affected" in incident) {
                    var affected = incident.components_affected;

                    if (affected.length !== 0) {
                        console.log("  checking affected components");
                        var comp;
    
                        for (comp = 0; comp < affected.length; comp++) {
                            // We have a match
                            if (affected[comp].name == component) {
                                console.log("  matched an active incident");
                                return incident;
                            }
                        }
                    } else {
                        console.log("  incident "+activeIncidents[incidentIndex]+" has no affected components");
                    }
                } else {
                    console.log("  can't find components_affected");
                }
            } else {
                console.log("  failed to get incident "+activeIncidents[incidentIndex]);
            }
        }

        console.log("  didn't match an incident to this component");
    }

    return null;
}

function processIncident(incident) {
    console.log("processIncident");
    if (incident === null) {
        // No incident => nothing to do.
        console.log("  no incident provided. Nothing to do.");
        return;
    }
    // Get the incident's last state from the messages.
    var messages = componentIncident.messages;
    var lastState = messages[messages.length-1].state;
    if (lastState != 100) {
        // Not under investigation => nothing to do.
        console.log("  specified incident is not under investigation. Nothing to do.");
        return;
    }
    // Are we the last active xMatters event for this component?
    var count = parseInt(input['xMatters Event Count']);
    if (count != 1) {
        // Nope
        console.log("  we aren't the last xMatters event for this component. Nothing to do.");
        return;
    }
    // Update the Status.io incident to the desired values.
    var updateIncidentBody = {
        "statuspage_id": input["Status.io Page ID"],
        "incident_id": componentIncident.result._id,
        "notify_email": input['Notify email'],
        "notify_sms": input['Notify SMS'],
        "notify_webhook": input['Notify webhook'],
        "social": input['Notify social'],
        "irc": input['Notify IRC'],
        "hipchat": "0",
        "slack": input['Notify Slack'],
        "current_status": 100,
        "current_state": parseInt(input['New incident state']),
        "incident_details": input['Update message']
    };

    var updateIncidentRequest = http.request({
        endpoint: 'Status.io',
        method: 'POST',
        path: '/v2/incident/update',
        headers: {
            'Content-Type': 'application/json',
            'x-api-id': input["Status.io API ID"],
            'x-api-key': input["Status.io API Key"]
        }
    });
    console.log("Updating the Status.io incident");
    updateIncidentRequest.write(updateIncidentBody);
}

var componentIncident = findIncident(input["Status.io Component"]);
processIncident(componentIncident);
