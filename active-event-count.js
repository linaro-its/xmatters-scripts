// For the specified component, find the active events affecting it
// and output the count so that this can be fed into the step that
// updates Status.io when the last event is dealt with.

/* globals http, input, output */

// Get all of the active xMatters events and add up the ones that refer
// to this component.
var request = http.request({ 
    "endpoint": "xMatters",
    "path": "/api/xm/1/events?status=ACTIVE&embed=properties&propertyName=AffectedComponent%23en&propertyValue="+encodeURIComponent(input["Affected Component"]),
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
        foundEvents += json.count;
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
