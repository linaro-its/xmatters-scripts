// For the specified component, find the active events affecting it
// and output the count so that this can be fed into the step that
// updates Status.io when the last event is dealt with.

/* globals http, input, output */

// Get all of the active xMatters events and add up the ones that refer
// to this component.
var request = http.request({ 
    "endpoint": "xMatters",
    "path": "/api/xm/1/events?status=ACTIVE&embed=properties",
    "method": "GET",
    "autoEncodeURI": false
});

var foundEvents = 0;
var looping = true;
do {
    var response = request.write();

    if (response.statusCode == 200 ) {
        var json = JSON.parse(response.body);
        console.log("Retrieved events: " + json.count);
        var index;
        for (index = 0; index < json.count; index++) {
            // At the moment, need to process the CloudWatch Alarm Description
            // the same way as the "Analyze CloudWatch Alarm" step does. This
            // will hopefully be replaced by the ability to retrieve the
            // affected component as a property of the event, thus only needing
            // to divine the affected component once, and not in a step that is
            // tied to the Status.io processes.
            if ("AlarmDescription#en" in json.data[index].properties) {
                var alarmDesc = json.data[index].properties["AlarmDescription#en"];
                console.log("Alarm description: "+alarmDesc);
                var res = alarmDesc.split("|");
                var thisComponent = res[0].trim();
                if (thisComponent == input["Affected Component"]) {
                    console.log("Matched affected component");
                    foundEvents++;
                }
            } else {
                console.log("No alarm description property in event#"+index);
            }
        }

        looping = ("next" in json.links);
        if (looping) {
            request.path = json.links.next;
        }
    } else {
        looping = false;
    }
} while (looping);

console.log("Total matching xMatters events: "+foundEvents);
output["Event Count"] = foundEvents;
