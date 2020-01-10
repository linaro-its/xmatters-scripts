// Either creates a new incident for the specified component or, if an
// incident already exists, possibly updates it depending on the current
// incident state/status and the new alarm details.

/* global http, input */

function getActiveIncidents() {
    // Get the incidents that are active on status.io
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
        console.log("  returning incident details");
        var json = JSON.parse(response.body);
        // API returns an array but it is only a single incident.
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

function componentInfrastructure(component) {
    console.log("componentInfrastructure");
    var result = [];
    var request = http.request({
        endpoint: 'Status.io',
        method: 'GET',
        path: 'v2/component/list/' + input["Status.io Page ID"],
        headers: {
            'x-api-id': input["Status.io API ID"],
            'x-api-key': input["Status.io API Key"]
        }
    });
    var response = request.write();

    if (response.statusCode == 200) {
        var infra = JSON.parse(response.body).result;
        var index;

        for (index = 0; index < infra.length; index++) {
            if (infra[index].name == component) {
                var containers = infra[index].containers;
                var contIndex;

                for (contIndex = 0; contIndex < containers.length; contIndex++) {
                    result.push(infra[index]._id + '-' + containers[contIndex]._id);
                }
            }
        }
    } else {
        console.log("Got status " + response.statusCode + " while querying component list");
    }

    return result;
}

// See if there is an existing incident before doing anything else.
var componentIncident = findIncident(input["Status.io Component"]);
if (componentIncident !== null) {
    // We've got an existing incident for this component.
    // Possible conditions and actions:
    // If the incident is NOT in the investigation state (100) then
    // we need to put it back into that state because this is a new alarm.
    // If the incident is under investigation and this alarm has a higher
    // status than currently, we need to update that to show the severity.
    var update = true;
    var lastState;
    var messages = componentIncident.messages;
    var index;
    console.log("Got "+messages.length+" messages to check in incident");
    for (index = 0; index < messages.length; index++) {
        lastState = messages[index].state;
        if (messages[index].state == 100) {
            if (messages[index].status > input['Status code']) {
                update = false;
                break;
            }
        }
    }
    if (update || lastState != 100) {
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
            "current_status": parseInt(input['Status code']),
            "current_state": 100
        };

        if (update) {
            updateIncidentBody["incident_details"] = "Increased incident severity";
        } else {
            updateIncidentBody["incident_details"] = "New issue detected to be investigated";
        }

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
        updateIncidentRequest.write(updateIncidentBody);
    }
} else {
    // No incident found for this component so let's create one.
    var newIncidentBody = {
        'statuspage_id': input["Status.io Page ID"],
        'infrastructure_affected': componentInfrastructure(input["Status.io Component"]),
        'incident_name': 'A problem with ' + input["Status.io Component"] + ' is being investigated',
        'incident_details': input['Status description'],
        "notify_email": input['Notify email'],
        "notify_sms": input['Notify SMS'],
        "notify_webhook": input['Notify webhook'],
        "social": input['Notify social'],
        "irc": input['Notify IRC'],
        "hipchat": "0",
        "slack": input['Notify Slack'],
        "current_status": parseInt(input['Status code']),
        'current_state': 100,
        'all_infrastructure_affected': '0'
    };
    var newIncidentRequest = http.request({
        endpoint: 'Status.io',
        method: 'POST',
        path: '/v2/incident/create',
        headers: {
            'Content-Type': 'application/json',
            'x-api-id': input["Status.io API ID"],
            'x-api-key': input["Status.io API Key"]
        }
    });
    newIncidentRequest.write(newIncidentBody);
}
