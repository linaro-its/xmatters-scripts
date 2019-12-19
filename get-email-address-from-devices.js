// Find and return the first active email address.

var apiRequest = http.request({
    'endpoint': 'xMatters',
    'path': '/api/xm/1/people/' + input['Person ID'] + "/devices",
    'method': 'GET'
});

var apiResponse = apiRequest.write();

if (apiResponse.statusCode == 200) {
    var response = JSON.parse(apiResponse.body);

    for (var dev in response.data) {
        if (response.data[dev].deviceType == "EMAIL" && response.data[dev].status == "ACTIVE") {
            output["Email Address"] = response.data[dev].emailAddress;
            break;
        }
    }
}
