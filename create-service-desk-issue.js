var postIssue = http.request({
    endpoint: 'Jira Server',
    method: 'POST',
    path: '/rest/servicedeskapi/request'
});

var reporter = input['Reporter Key'];
var payload = {
    serviceDeskId: input['Service Desk ID'],
    requestTypeId: input['Request Type ID'],
    requestFieldValues: {
        summary: input.Summary,
        description: input.Description
    },
    raiseOnBehalfOf: reporter ? reporter : undefined
};

var response = postIssue.write(payload);
var respBody;

if (response.statusCode >= 200 && response.statusCode < 300) {
    try {
        respBody = JSON.parse(response.body);
    } catch (e) {
        console.log(
            'Issue created successfully, but this step will not return any outputs '
            + 'because the following response body cannot be parsed: ' + response.body
        );
    }
    if (respBody) {
        output['Issue ID'] = respBody.issueId;
        output['Issue Key'] = respBody.issueKey;
        if (input.Priority !== undefined) {
            setIssuePriority(respBody.issueKey, input.Priority);
        }
    }
} else {
    var error;
    try {
        respBody = JSON.parse(response.body);
        error = ' messages: ' + (
            respBody.errorMessages.length > 0
                ? respBody.errorMessages.join(' ')
                : bundleErrors(respBody.errors)
        );
    } catch (e) {
        error = ': ' + response.body;
    }
    throw new Error(
        'Failed to create a new issue. '
        + 'Jira Server API returned '
        + '[' + response.statusCode + '] '
        + 'and the following'
        + error
    );
}


function bundleErrors(errors) {
    var errorArray = [];
    for (var key in errors) {
        if (errors.hasOwnProperty(key)) {
            errorArray.push(key + ': ' + errors[key]);
        }
    }
    return errorArray.join(' ');
}

function setIssuePriority(key, priority_name) {
    var editIssue = http.request({
        endpoint: 'Jira Server',
        method: 'PUT',
        path: '/rest/api/2/issue/' + key
    });

    var editIssuePayload = {
        fields: {
            priority: {
                name: priority_name
            }
        }
    };
    var editIssueResponse = editIssue.write(editIssuePayload);
    if (editIssueResponse.statusCode == 204) {
        console.log("Set issue priority successfully")
    } else {
        var editIssueError;
        try {
            respBody = JSON.parse(editIssueResponse.body);
            editIssueError = ' messages: ' + (
                respBody.errorMessages.length > 0
                    ? respBody.errorMessages.join(' ')
                    : bundleErrors(respBody.errors)
            );
        } catch (e) {
            editIssueError = ': ' + editIssueResponse.body;
        }
        throw new Error(
            'Failed to set priority for "' + key + '", '
            + 'Jira Server API returned '
            + '[' + editIssueResponse.statusCode + '] '
            + 'and the following'
            + editIssueError
        );
    }
}
