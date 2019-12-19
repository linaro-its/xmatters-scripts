# xmatters-scripts
This repository contains scripts used in Linaro workflows on xMatters.

## create-service-desk-issue
This is derived from the Create Jira Server issue. Service Desk has a slightly different REST API for creating issues and this is used because, depending on the Service Desk project configuration, requests can be created by new customers without prior existence. Jira doesn't do that.

## get-email-address-from-devices
This was created because, in Linaro, we use email addresses as our Jira IDs. xMatters do suggest using a [custom field](https://help.xmatters.com/ondemand/#cshid=customFieldDetailsForm) but, since we have a 1:1 relationship that can be used instead, adding a custom field seemed redundant information.
