# Pipedream

Pipedream attempts to make it as easy as possible to stream CSV data into out of
Salesforce.

We use the new Bulk API 2.0 for insert, update, upsert, and delete.
https://developer.salesforce.com/blogs/2017/12/slim-new-bulk-api-v2.html

Export and PK export aren't available in the new Bulk API 2.0, so for that we
use the old.

## Bulk API 2.0

It remains to be seen if Salesforce does a good job at magically getting around
locks and timeouts. They sure talk it up really big.

The primary win for us is no more lookups. The 2.0 API lets you use external
ID fields to link data.

https://developer.salesforce.com/docs/atlas.en-us.api_bulk_v2.meta/api_bulk_v2/datafiles_csv_rel_field_header_row.htm

The max size of a job in the 2.0 API is 100 MB. So while they talk big about
making things easier and not having to break your data into batches, 100 MB
isn't that big. So we have to break large files into multiple jobs anyway.

I had assumed since they give you a URL to put your CSV data to
/services/data/vXX.X/jobs/ingest/JOB ID/batches/ that you could do multiple puts
per job. But that doesn't seem to be the case. Any time I put more than one
batch of data per job, the close job call fails with a 400 error.

The 2.0 API will be awesome if it really solves locking and timeout issues, and
if it can do multiple puts per job and upload as much data as you need to per
job.

## Usage

```shell
sf-export         SF_OBJECT FIELDS WHERE > some.csv
sf-pkexport       SF_OBJECT FIELDS WHERE > some.csv

sf-insert         SF_OBJECT < some.csv
sf-update         SF_OBJECT < some.csv
sf-upsert         SF_OBJECT < some.csv
sf-delete         SF_OBJECT < some.csv
sf-failed         JOB_ID [JOB_ID, ...] > JOB_ID_failed.csv
sf-unprocessed    JOB_ID [JOB_ID, ...] > JOB_ID_unprocessed.csv

sf-info           JOB_ID [JOB_ID, ...]
sf-abort          JOB_ID [JOB_ID, ...]
xxx sf-close          JOB_ID [JOB_ID, ...]
```

## API

b2.uploadJobData
b2.closeJob
b2.abortJob
b2.deleteJob
b2.getJobInfo
b2.getSuccessfulResults
b2.getFailedResults
b2.getUnprocessedResults

## Environment Variables

The following environment variables are required for Bulk2 to work.
Remember they should all be URL encoded.

```
BULK2_URL
BULK2_USERNAME
BULK2_PASSWORD
BULK2_TOKEN
BULK2_API_VERSION
BULK2_CONSUMER_KEY
BULK2_CONSUMER_SECRET
```

## OAUTH

https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_understanding_username_password_oauth_flow.htm

### Get Access Token

```bash
curl -X POST \
  ${BULK2_URL}/services/oauth2/token \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode "grant_type=password" \
  --data-urlencode "client_id=${BULK2_CONSUMER_KEY}" \
  --data-urlencode "client_secret=${BULK2_CONSUMER_SECRET}" \
  --data-urlencode "username=${BULK2_USERNAME}" \
  --data-urlencode "password=${BULK2_PASSWORD}${BULK2_TOKEN}"

{
  "access_token": "***",
  "id": "https://login.salesforce.com/id/00D36000000arMLEAY/00536000000IigRAAS",
  "instance_url": "https://na30.salesforce.com",
  "issued_at": "1511895199410",
  "signature": "mbYmf6mq3OcLltEtSgKLNDiJwZhbmB3S7xPf3GGbqp4=",
  "token_type": "Bearer"
}
```

### Get URL for REST Calls

The following shows how to get the URL for REST calls. Really just need the
https://na30.salesforce.com bit out of one of the URLs below.

```bash
curl -X GET \
  https://login.salesforce.com/id/00D36000000arMLEAY/00536000000IigRAAS \
  -H 'authorization: Bearer ***'

{
    "active": true,
    "addr_city": null,
    "addr_country": "US",
    "addr_state": null,
    "addr_street": null,
    "addr_zip": null,
    "asserted_user": true,
    "display_name": "Pipe Dream",
    "email": "sfadmin@candoris.com",
    "email_verified": true,
    "first_name": "Pipe",
    "id": "https://login.salesforce.com/id/00D36000000arMLEAY/00536000000IigRAAS",
    "is_app_installed": true,
    "is_lightning_login_user": false,
    "language": "en_US",
    "last_modified_date": "2016-12-09T04:02:56.000+0000",
    "last_name": "Dream",
    "locale": "en_US",
    "mobile_phone": null,
    "mobile_phone_verified": false,
    "nick_name": "pipedream1.457990354178172E12",
    "organization_id": "00D36000000arMLEAY",
    "photos": {
        "picture": "https://c.na30.content.force.com/profilephoto/005/F",
        "thumbnail": "https://c.na30.content.force.com/profilephoto/005/T"
    },
    "status": {
        "body": null,
        "created_date": null
    },
    "timezone": "America/Los_Angeles",
    "urls": {
        "enterprise": "https://na30.salesforce.com/services/Soap/c/{version}/00D36000000arML",
        "feed_elements": "https://na30.salesforce.com/services/data/v{version}/chatter/feed-elements",
        "feed_items": "https://na30.salesforce.com/services/data/v{version}/chatter/feed-items",
        "feeds": "https://na30.salesforce.com/services/data/v{version}/chatter/feeds",
        "groups": "https://na30.salesforce.com/services/data/v{version}/chatter/groups",
        "metadata": "https://na30.salesforce.com/services/Soap/m/{version}/00D36000000arML",
        "partner": "https://na30.salesforce.com/services/Soap/u/{version}/00D36000000arML",
        "profile": "https://na30.salesforce.com/00536000000IigRAAS",
        "query": "https://na30.salesforce.com/services/data/v{version}/query/",
        "recent": "https://na30.salesforce.com/services/data/v{version}/recent/",
        "rest": "https://na30.salesforce.com/services/data/v{version}/",
        "search": "https://na30.salesforce.com/services/data/v{version}/search/",
        "sobjects": "https://na30.salesforce.com/services/data/v{version}/sobjects/",
        "tooling_rest": "https://na30.salesforce.com/services/data/v{version}/tooling/",
        "tooling_soap": "https://na30.salesforce.com/services/Soap/T/{version}/00D36000000arML",
        "users": "https://na30.salesforce.com/services/data/v{version}/chatter/users"
    },
    "user_id": "00536000000IigRAAS",
    "user_type": "STANDARD",
    "username": "pipedream@candoris.com",
    "utcOffset": -28800000
}
```

```sh
export PATH=./node_modules/pipedream/bin:$PATH
```

