medic-api
=========

Node server to support medic-webapp.

Currently supports auditing by proxying requests to CouchDB and updating the
audit history where required.


# Table of contents

<!-- To update table of contents run: `npm run-script updatetoc` -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Development](#development)
  - [Install](#install)
  - [Settings](#settings)
  - [Run](#run)
  - [Test](#test)
  - [Build Status](#build-status)
- [Migrations](#migrations)
  - [Migration script api](#migration-script-api)
  - [Implementation, re-running migrations by hand](#implementation-re-running-migrations-by-hand)
- [API Overview](#api-overview)
  - [Timestamps](#timestamps)
- [Export](#export)
  - [GET /api/v1/export/forms/{formcode}](#get-apiv1exportformsformcode)
  - [GET /api/v1/export/messages](#get-apiv1exportmessages)
  - [GET /api/v1/export/audit](#get-apiv1exportaudit)
  - [GET /api/v1/export/feedback](#get-apiv1exportfeedback)
  - [GET /api/v1/export/contacts](#get-apiv1exportcontacts)
- [Forms](#forms)
  - [GET /api/v1/forms](#get-apiv1forms)
  - [GET /api/v1/forms/{{id}}.{{format}}](#get-apiv1formsidformat)
- [Records](#records)
  - [POST /api/v1/records](#post-apiv1records)
- [Messages](#messages)
  - [GET /api/v1/messages](#get-apiv1messages)
  - [GET /api/v1/messages/{{id}}](#get-apiv1messagesid)
  - [PUT /api/v1/messages/state/{{id}}](#put-apiv1messagesstateid)
- [SMS](#sms)
  - [POST /api/sms](#post-apisms)
- [People](#people)
  - [Supported Properties](#supported-properties)
  - [POST /api/v1/people](#post-apiv1people)
- [Places](#places)
  - [Supported Properties](#supported-properties-1)
  - [POST /api/v1/places](#post-apiv1places)
  - [POST /api/v1/places/{{id}}](#post-apiv1placesid)
- [Users](#users)
  - [Supported Properties](#supported-properties-2)
  - [GET /api/v1/users](#get-apiv1users)
  - [POST /api/v1/users](#post-apiv1users)
  - [POST /api/v1/users/{{username}}](#post-apiv1usersusername)
  - [DELETE /api/v1/users/{{username}}](#delete-apiv1usersusername)
- [Bulk Operations](#bulk)
 - [POST /api/v1/bulk-delete](#post-apiv1bulkdelete)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Development

## Install

Get node deps with  `npm install`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://admin:pass@localhost:5984/medic'
```

If you are using CouchDB2.0 you need to also provide your node name. e.g.

```
export COUCH_NODE_NAME=couchdb@localhost node server.js
```

If you're using couchdb-lucene in any configuration other than the standard (on the same server as CouchDb on port 5985) you can specify it with the `LUCENE_URL` env variable:

```
export LUCENE_URL='http://somewherelse'
```

## Run

`grunt deploy`

## Test

`grunt test`

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/medic-api).

[![Build Status](https://travis-ci.org/medic/medic-api.png?branch=master)](https://travis-ci.org/medic/medic-api/branches)

# Migrations

Migrations are scripts located in the `/migrations` directory, and are automatically by medic-api run before the webserver starts up.

Typically, migrations are used to run a specific edit on all docs in the database (e.g. add a field to all docs of type X), but you can do whatever you like in a migration.

Migrations are only run once, and are run in the order they were created, based on their `created` date. Only one migration is run at a time.

Migrations that error will cause medic-api to stop on an error, and will be attempted again the next time you start medic-api.

## Migration script api
Your migration script should have an export that looks like this:
```js
module.exports = {
  name: 'your-unique-migration-name',
  created: new Date(2016, 10, 20),
  run: function(callback) {
    // If your migrations errors
    return callback(err);
    // Or upon success
    return callback();
  }
}
```

Place your script in the `/migrations` folder and it will get picked up by medic-api at the next restart.


## Implementation, re-running migrations by hand

See [`migrations.js`](https://github.com/medic/medic-api/blob/master/migrations.js).

Importantly, the record of which migrations have been run is stored in the `migrations` array of an arbitrarily named document in CouchDB with the `.type` of `meta`. Because of this it can be a hard document to find, but you can get it using `curl`, and pretty print it with `jq`:

```
curl 'http://admin:pass@localhost:5984/medic/_design/medic-client/_view/doc_by_type?key=\["meta"\]&include_docs=true' | jq .rows[].doc
```

So, if you want to re-run a migration, delete its entry in the `migrations` list and re-run api.

# API Overview

## Timestamps

Various properties throughout this API use a timestamp value, the
following formats are supported:

 - ISO 8601 combined date and time with timezone of the format below where "Z"
   is offset from UTC like "-03", "+1245", or just "Z" which is UTC (0 offset);

        YYYY-MM-DDTHH:mm:ssZ
        YYYY-MM-DDTHH:mm:ss.SSSZ

 - Milliseconds since Unix Epoch

A compatible value can be generated using the `toISOString` or `toValue` method
on a Javascript Date object.

### Examples

  - 2011-10-10T14:48:00-0300
  - 2016-07-01T13:48:24+00:00
  - 2016-07-01T13:48:24Z
  - 1467383343484 (MS since Epoch)

# Export

Request different types of data in various formats.

## GET /api/v1/export/forms/{formcode}

Download reports.

### Query Parameters

| Variable           | Description
| ------------------ | -------------
| format             | The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.
| locale             | Locale for translatable data. Defaults to 'en'.
| tz                 | The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.
| skip_header_row    | 'true' to omit the column headings. Defaults to 'false'.
| columns            | An orderered array of columns to export, eg: ["reported_date","from","related_entities.clinic.name"]

### Output

| Column             | Description
| ------------------ | -------------
| Record UUID        | The unique ID for the report in the database.
| Patient ID         | The generated short patient ID for use in SMS.
| Reported Date      | The date the report was received.
| From               | The phone number the report was sent from.
| Contact Name       | The name of the user this report is assigned to.
| Form               | The form code for this report.


## GET /api/v1/export/messages

Download messages.

### Query Parameters

| Variable           | Description
| ------------------ | -------------
| format             | The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.
| locale             | Locale for translatable data. Defaults to 'en'.
| tz                 | The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.
| skip_header_row    | 'true' to omit the column headings. Defaults to 'false'.
| columns            | An orderered array of columns to export, eg: ["reported_date","from","related_entities.clinic.name"]
| filter_state       | Used in conjunction with the parameters below to only return messages that were in a given state. Possible values are 'received', 'scheduled', 'pending', 'sent', 'cleared', or 'muted'.
| filter_state_from  | The number of days from now to use as a lower bound on the date that the message is in the given state. Defaults to no lower bound. Ignored if filter_state is not provided.
| filter_state_to    | The number of days from now to use as an upper bound on the date that the message is in the given state. Defaults to no upper bound. Ignored if filter_state is not provided.

### Output

| Column             | Description
| ------------------ | -------------
| Record UUID        | The unique ID for the message in the database.
| Patient ID         | The generated short patient ID for use in SMS.
| Reported Date      | The date the message was received or generated.
| From               | This phone number the message is or will be sent from.
| Contact Name       | The name of the user this message is assigned to.
| Message Type       | The type of the message
| Message State      | The state of the message at the time this export was generated
| Received Timestamp | The datetime the message was received. Only applies to incoming messages.
| Other Timestamps   | The datetime the message transitioned to each state.
| Sent By            | The phone number the message was sent from. Only applies to incoming messages.
| To Phone           | The phone number the message is or will be sent to. Only applies to outgoing messages.
| Message Body       | The content of the message.

### Examples

Return only rows that are scheduled to be sent in the next ten days.

```
/export/messages?filter_state=scheduled&filter_state_to=10
```


## GET /api/v1/export/audit

Export a file containing the audit log.

### Query Parameters

| Variable           | Description
| ------------------ | -------------
| format             | The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.
| locale             | Locale for translatable data. Defaults to 'en'.
| tz                 | The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.
| skip_header_row    | 'true' to omit the column headings. Defaults to 'false'.


## GET /api/v1/export/feedback

Export a file containing the user feedback.

### Query Parameters

| Variable           | Description
| ------------------ | -------------
| format             | The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.
| locale             | Locale for translatable data. Defaults to 'en'.
| tz                 | The timezone to show date values in, as an offset in minutes from GMT, for example '-120'.
| skip_header_row    | 'true' to omit the column headings. Defaults to 'false'.


## GET /api/v1/export/contacts

Returns a JSON array of contacts.

### Query Parameters (required)

| Variable           | Description
| ------------------ | -------------
| format             | The desired format of the file. Only 'json' is supported.
| query              | The query parameters in lucene query generator format.

### Examples

Get all contacts

```
GET /api/v1/export/contacts?query={"$operands":[{"type":["person","clinic","health_center","district_hospital"]}]}&format=json
```

```
HTTP/1.1 200
Content-Type: application/json; charset=utf-8

[
  {
    "_rev":"1-e39081e9217eb0d99b8bcc4c64f33905",
    "_id":"a483e2e88487da478c7ad9e2a51bf785",
    "name":"Gareth",
    "type":"person"
  },
  {
    "_rev":"1-e39081e9217eb0d99b8bcc4c64f33905",
    "_id":"a483e2e88487da478c7ad9e2a51bf786",
    "name":"Dunedin",
    "type":"district_hospital"
  }
]
```


# Forms

## GET /api/v1/forms

Returns a list of currently installed forms (in all available formats) in JSON format.

### Headers

| Key         | Value        | Description
| ----------- | ------------ | --------------
| X-OpenRosa-Version | 1.0    | If this header is specified returns XML formatted forms list.  See [OpenRosa FormListAPI](https://bitbucket.org/javarosa/javarosa/wiki/FormListAPI).

### Examples

Get list of forms currently installed.

```
GET /api/v1/forms
```

```
HTTP/1.1 200
Content-Type: application/json; charset=utf-8

["anc_visit.xml","anc_registration.xml","off.xml", "off.json"]
```

Get OpenRosa XForms compatible forms installed in XML format.

```
GET /api/v1/forms
Host: medic.local
X-OpenRosa-Version: 1.0

```

```
HTTP/1.1 200 OK
Content-Type: text/xml; charset=utf-8
X-OpenRosa-Version: 1.0

<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <name>Visit</name>
    <formID>ANCVisit</formID>
    <hash>md5:1f0f096602ed794a264ab67224608cf4</hash>
    <downloadUrl>http://medic.local/api/v1/forms/anc_visit.xml</downloadUrl>
  </xform>
  <xform>
    <name>Registration with LMP</name>
    <formID>PregnancyRegistration</formID>
    <hash>md5:1f0f096602ed794a264ab67224608cf4</hash>
    <downloadUrl>http://medic.local/api/v1/forms/anc_registration.xml</downloadUrl>
  </xform>
  <xform>
    <name>Stop</name>
    <formID>Stop</formID>
    <hash>md5:1f0f096602ed794a264ab67224608cf4</hash>
    <downloadUrl>http://medic.local/api/v1/forms/off.xml</downloadUrl>
  </xform>
</xforms>
```



## GET /api/v1/forms/{{id}}.{{format}}

Return form definition for a given form ID and format.

### Parameters

| Variable | Description       |
| -------- | ----------------- |
| id       | Form identifier   |
| format   | Format string or file extension. e.g. xml, json   |


### Examples

Get latest version of the PregnancyRegistration form in xml (XForms) format.

```
GET /api/v1/forms/pregnancyregistration.xml
```

Get the latest version of the NPYY form in JSON format.

```
GET /api/v1/forms/NPYY.json
```


# Records

## POST /api/v1/records

Create a new record based on a form.  This requires a form definition exists on the server side matching the form code.

Records can be created one of two ways, parsing the form data yourself and submitting a JSON object or by submitting the raw message string.

### Headers

| Key         | Value        | Description
| ----------- | ------------ | --------------
|  Content-Type | application/x-www-form-urlencoded | Processes form parameters.
|  Content-Type | application/json | Processes form data in request body as JSON.

Only one variant of the `Content-Type` header may be provided; RFC 2616 does not
allow multiple content types to appear in a single `Content-Type` header.

#### Form Parameters

| Variable | Description       |
| -------- | ----------------- |
| message  | Message string in a supported format like Muvuku or Textforms.  Depending if your Medic Mobile instance is configured in forms-only mode or not you might recieve an error if the form is not found.  |
| from |   Reporting phone number. |
| reported_date |  Timestamp in MS since Unix Epoch of when the message was received on the gateway. Defaults to now. |
| locale |  Optional locale string. |


#### JSON Properties

Special values reside in the property `_meta`, so you can't have a form field named `_meta`.  Only strings and numbers are currently support as field values.

All property names will be lowercased and any properties beginning with `_` (underscore) will be ignored.


| Key         | Description       |
| ----------- | ----------------- |
| _meta.form  | The form code.    |
| _meta.from  |  Reporting phone number. |
| _meta.reported_date |  Timestamp in MS since Unix Epoch of when the message was received on the gateway. Defaults to now. |
| _meta.locale | Optional locale string.  Example: 'fr' |


### Examples

Creating new record using message field.

```
POST /api/v1/records
Content-Type: application/x-www-form-urlencoded

message=1!YYYZ!Sam#23#2015#ANC&from=+5511943348031&reported_date=1352399720000
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "id": "364c796a843fbe0a73476f9153012733"
}
```

Creating new record with JSON.

```
POST /api/v1/records
Content-Type: application/json

{
  "nurse": "Sam",
  "week": 23,
  "year": 2015,
  "visit": "ANC",
  "_meta": {
    "form": "YYYZ",
    "reported_date": 1352399720000
  }
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "id": "364c796a843fbe0a73476f9153012733"
}
```

### Errors

If required fields are not found return 500.

If invalid JSON return error response 500.

If submitting JSON and correspending form is not found on the server you will receive an error.


# Messages

## GET /api/v1/messages

Returns list of messages, oldest first based on timestamp or due date.

### Query Parameters

| Variable           | Description
| ------------------ | -------------
| state              | Returns only messages that match a given state value. e.g. state=pending
| states             | Array. Returns only messages with state matching one of the states in the array.
| start (todo)       | Returns list of messages, limited to 25 starting at id (uuid).
| descending         | Returns latest messages first.
| limit              | Modifies number of returned messages to specified value, max is 1000.

### Examples

Get oldest pending messages.

```
GET /api/v1/messages?state=pending
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[
  {
    "message": "Thank you for registering Prudence. Their pregnancy ID is 88500, and EDD is Sun, Nov 8th, 2015",
    "to": "+2840915732",
    "id": "4fbc1cb6-1408-4954-b08b-2da33630ae5c",
    "state": "pending",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-04-23T02:24:57.207Z"
      }
    ]
  },
  {
    "message": "Thank you Janet, visit for Prudence (88500) has been recorded.",
    "to": "+2840915732",
    "id": "ef8dbed5-335e-4cdd-bdbe-885a4fd93d11",
    "state": "pending",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-04-23T02:25:04.205Z"
      }
    ]
  }
]
```

Get latest sent messages.

```
GET /api/v1/messages?state=sent&descending
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[
  {
    "message": "[Sample message] Yep, we're all set for Monday afternoon.",
    "to": "+2840915732",
    "id": "c8ca60c6c19d4e253f5d107ac800bdd4",
    "state": "sent",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-04-08T20:09:00.000Z"
      },
      {
        "state": "sent",
        "timestamp": "2015-04-08T20:10:00.000Z"
      }
    ]
  },
  {
    "message": "[Sample message] Of course, I will send some with Charles tomorrow. Let me know when you get it.",
    "to": "+2896503099",
    "id": "c8ca60c6c19d4e253f5d107ac801594e",
    "state": "sent",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-03-08T13:09:00.000Z"
      },
      {
        "state": "sent",
        "timestamp": "2015-03-08T13:10:00.000Z"
      }
    ]
  }
]
```

Get pending and sent messages.

```
GET /api/v1/messages?states%5B0%5D=pending&states%5B1%5D=sent
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[
  {
    "message": "Thank you  for registering Jane. Their ID is 12345.",
    "to": "+2896503099",
    "id": "8dc30e38-bc31-491e-8321-407573b86e0b",
    "state": "pending",
    "state_history": [{
      "state": "pending",
      "timestamp": "2017-04-11T09:01:29.665Z"
    }]
  },
  {
    "message": "[Sample message] Of course, I will send some with Charles tomorrow. Let me know when you get it.",
    "to": "+2896503099",
    "id": "c8ca60c6c19d4e253f5d107ac801594e",
    "state": "sent",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-03-08T13:09:00.000Z"
      },
      {
        "state": "sent",
        "timestamp": "2015-03-08T13:10:00.000Z"
      }
    ]
  }
]
```

## GET /api/v1/messages/{{id}}

Returns message object matching id (uuid).

### Errors

If message is not found return 404.

### Examples

Returns message object.

```
GET /api/v1/messages/364c796a843fbe0a73476f9153012733
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "id": "364c796a843fbe0a73476f9153012733",
  "message": "dinner time",
  "to": "+5511938849332",
  "state": "sent",
  "state_details": "more info about message state"
}
```

## PUT /api/v1/messages/state/{{id}}

Allows client to update a message's state values.  So when a message is sent or
delivered, or otherwise changes state, it can be recorded.

Expects a JSON object in the body of the request with the following properties:

- `state`

  String value: 'sent', 'pending', 'failed', 'scheduled', 'cleared' or 'delivered'.

- `details`

  JSON object or string with more information regarding the state change.

Both properties are saved to the parent object (task) of the message and pushed
into the state history.

### Errors

If invalid JSON return error response 500.

If message is not found return 404.


### Examples

Success response includes id property.

```
PUT /api/v1/messages/state/364c796a843fbe0a73476f9153012733
Content-Type: application/json

{
  "state": "sent",
  "details": {
    "device": "339A"
  }
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "id": "364c796a843fbe0a73476f9153012733"
}
```

Failure includes error.

```
PUT /api/v1/messages/state/364c796a843fbe0a73476f9153012733
Content-Type: application/json; charset=utf-8

{"foo"}
```

```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": "input is not JSON: Expected ':' instead of '}' at line 1, column 7"
}
```

Todo: should updating the state value of a message require the doc's revision?

# SMS

## POST /api/sms

Endpoint used by medic-gateway to send sms messages. More documentation in [the medic-gateway repo](https://github.com/medic/medic-gateway/blob/master/README.md).

# People


## Supported Properties

Use JSON in the request body to specify a person's details.

Note: this does not accomodate having a `place` field on your form and will likely be revised soon.

#### Required

| Key | Description
| -------- | -----------------
| name | String used to describe the person.

#### Optional

| Key | Description
| -------- | -----------------
| place | String that references a place or object that defines a new place.
| reported_date |  Timestamp of when the record was reported or created. Defaults to now.

## POST /api/v1/people

Create new people.



### Permissions

By default any user can create or modify a place.  Use these permissions to restrict access:

`can_create_people`, `can_create_places`

### Examples


Create new person and place hierarchy.

```
POST /api/v1/people
Content-Type: application/json

{
  "name": "Hannah",
  "phone": "+2548277210095",
  "place": {
    "name": "CHP Area One",
    "type": "health_center",
    "parent": {
      "name": "CHP Branch One",
      "type": "district_hospital"
    }
  }
}
```

Create new person and assign existing place.

```
POST /api/v1/people
Content-Type: application/json

{
 "name": "Samuel",
 "place": "1d83f2b4a27eceb40df9e9f9ad06d137"
}
```

Example response:

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "71df9d25ed6732ea3b4435862510d115",
  "rev": "1-a4060843d78f46a60a6f41051e40e3b5"
}
```

# Places

By default any user can create or modify a place.

## Supported Properties

Use JSON in the request body to specify a place's details.

#### Required Properties

| Key | Description
| -------- | -----------------
| name | String used to describe the place.
| type | Place type
| parent | String that references a place or object that defines a new place. Optional for District Hospital and National Office types.

#### Optional Properties

| Key | Description
| -------- | -----------------
| contact | String identifier for a person or object that defines a new person.
| reported_date |  Timestamp of when the record was reported or created. Defaults to now.

#### Place Types

| Key | Description
| -------- | -----------------
| clinic | Clinic
| health_center | Health Center
| district_hospital | District Hospital
| national_office | National Office


## POST /api/v1/places

Create a new place and optionally a contact.

### Permissions

By default any user can create new places.  Use these permissions to restrict access:

`can_create_places`, `can_create_people`

### Examples

Create new place referencing existing parent.

```
POST /api/v1/places
Content-Type: application/json

{
 "name": "Busia Clinic",
 "type": "clinic",
 "parent": "1d83f2b4a27eceb40df9e9f9ad06d137"
}
```


Create child and parent places.

```
POST /api/v1/places
Content-Type: application/json

{
  "name": "CHP Area One",
  "type": "health_center",
  "parent": {
    "name": "CHP Branch One",
    "type": "district_hospital"
  }
}
```


Also creates contact (person).

```
POST /api/v1/places
Content-Type: application/json

{
  "name": "CHP Area One",
  "type": "health_center",
  "parent": {
    "name": "CHP Branch One",
    "type": "district_hospital"
  },
  "contact": {
    "name": "Paul",
    "phone": "+254883720611"
  }
}
```

Or assigns them.

```
POST /api/v1/places
Content-Type: application/json

{
  "name": "CHP Area One",
  "type": "health_center",
  "parent": {
    "name": "CHP Branch One",
    "type": "district_hospital"
  },
  "contact": "71df9d25ed6732ea3b4435862510ef8e"
}
```

Example success response:

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "71df9d25ed6732ea3b4435862510d115",
  "rev": "1-a4060843d78f46a60a6f41051e40e3b5"
}
```

Error response if facility structure is not correct:

```
HTTP/1.1 400 Bad Request
Content-Type: text/plain

Health Centers should have "district_hospital" parent type.
```

## POST /api/v1/places/{{id}}

Update a place and optionally its contact.

### Permissions

By default any user can update a place.  Use these permissions to restrict access:

`can_update_places`

### Examples

Update a place's contact.

```
POST /api/v1/places/1d83f2b4a27eceb40df9e9f9ad06d137
Content-Type: application/json

{
 "contact": "71df9d25ed6732ea3b4435862505f7a9"
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "1d83f2b4a27eceb40df9e9f9ad06d137",
  "rev": "12-a4060843d78f46a60a6f41051e40e3b5"
}
```

# Users

All user related requests are limited to users with admin privileges by default.

## Supported Properties

Use JSON in the request body to specify user details.  Any properties submitted
that are not on the list below will be ignored.  Any properties not included
will be undefined.

#### Required

| Key | Description
| -------- | -----------------
| username | String identifier used for authentication.
| password | Password string used for authentication.  Only allowed to be set, not retrieved.

#### Conditional

| Key | Description | Details
| -------- | ----------------- | ------
| roles    | Array of roles. |
| place    | Place identifier string (UUID) or object this user resides in. | Required if your roles contain `district_admin`.
| contact  | A person object based on the form configured in the app. | Required if your roles contain `district_admin`.

#### Optional

| Key | Description
| -------- | -----------------
| fullname | Full name
| email    | Email address
| phone    | Phone number
| language | Language preference. e.g. "sw" for Swahili
| known    | Boolean to define if the user has logged in before.  Used mainly to determine whether or not to start a tour on first login.

## GET /api/v1/users

Returns a list of users and their profile data in JSON format.

#### Permissions

`can_view_users`

### Examples

Get list of users:

```
GET /api/v1/users
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[
  {
    "id": "org.couchdb.user:admin",
    "rev": "10-6486428924d11781c107ea74de6b63b6",
    "type": "admin",
    "username": "admin",
    "language": {
      "code": "en"
    }
  },
  {
    "id": "org.couchdb.user:demo",
    "rev": "14-8758c8493edcc6dac50366173fc3e24a",
    "type": "district-manager",
    "fullname": "Example User",
    "username": "demo",
    "language": {
      "code": "en"
    },
    "place": {
      "_id": "eeb17d6d-5dde-c2c0-62c4a1a0ca17d38b",
      "type": "district_hospital",
      "name": "Sample District",
      "contact": {
        "_id": "eeb17d6d-5dde-c2c0-62c4a1a0ca17fd17",
        "type": "person",
        "name": "Paul",
        "phone": "+2868917046"
      }
    },
    "contact": {
      "_id": "eeb17d6d-5dde-c2c0-62c4a1a0ca17fd17",
      "type": "person",
      "name": "Paul",
      "phone": "+2868917046"
    }
  }
]
```

## POST /api/v1/users

Create a new user with a place and a contact.

### Permissions

`can_create_users`, `can_create_places`, `can_create_people`


### Examples

Create a new user that can authenticate with a username of "mary" and password
of "secret" that can submit reports and view or modify records associated to
their place.  The place is created in the background and automatically linked
to the contact.

```
POST /api/v1/users
Content-Type: application/json

{
  "password": "secret",
  "username": "mary",
  "type": "district-manager",
  "place": {
    "name": "Mary's Area",
    "type": "health_center",
    "parent": "d14e1c3d557761320b13a77e7806e8f8"
  },
  "contact": {
    "name": "Mary Anyango",
    "phone": "+2868917046"
  }
}
```

```
HTTP/1.1 200
Content-Type: application/json

{
  "contact": {
    "id": "65416b8ceb53ff88ac1847654501aeb3",
    "rev": "1-0b74d219ae13137c1a06f03a0a52e187"
  },
  "user-settings": {
    "id": "org.couchdb.user:mary",
    "rev": "1-6ac1d36b775143835f4af53f9895d7ae"
  },
  "user": {
    "id": "org.couchdb.user:mary",
    "rev": "1-c3b82a0b47cfe68edd9284c89bebbae4"
  }
}

```

### Errors

Response if the username already exists:

```
HTTP/1.1 409 Conflict
Content-Type: text/plain

Document update conflict.
```


## POST /api/v1/users/{{username}}

Allows you to change property values on a user account. Properties listed above
are supported except for `contact.parent`.  Creating or modifying people
through the user is not supported, see People section.

### Permissions

`can_update_users`, `can_update_places`, `can_update_people`

### Updating yourself

You do not need any of the above permissions if the user you are modifying is yourself. However, you are not allowed to modify your `type`, `roles`, `contact` or `place`.

Further more, if you're updating your `password` you must be authenticating via Basic Auth (either the header or in the URL). This is to ensure the password is known at time of request, and no one is hijacking a cookie.

### URL Parameters

| Variable | Description
| -------- | -----------------
| username | String identifier used for authentication.


### Examples


```
POST /api/v1/users/mary
Content-Type: application/json

{
  "password": "secret",
  "place": "eeb17d6d-5dde-c2c0-62c4a1a0ca17e342"
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "user": {
    "id": "org.couchdb.user:mary",
    "rev": "23-858e01fafdfa0d367d798fe5b44751ff"
  },
  "user-settings": {
    "id": "org.couchdb.user:mary",
    "rev": "17-c6d03b86d2d5d70f7270c85e67fea96d"
  }
}
```

## DELETE /api/v1/users/{{username}}

Delete a user.  Does not affect a person or place associated to a user.

### Permissions

`can_delete_users`


### URL Parameters

| Variable | Description
| -------- | -----------------
| username | String identifier used for authentication.

### Examples

```
DELETE /api/v1/users/mary
```

```
HTTP/1.1 200 OK
```

# Bulk Operations

## POST /api/v1/bulk-delete

Bulk delete endpoint for deleting large numbers of documents. Docs will be batched into groups of 100 and will be sent sequentially to couch (new batch sent after the previous one has returned). The response will be chunked JSON (one batch at a time), so if you wish to get an indication of progress you will need to parse incomplete JSON (with a library such as this one https://github.com/indgov/partial-json-parser).

### Permissions

Only available to online users.

### Parameters

| Parameter | Description
| --------- | -----------------
| docs      | Array of JSON objects with `_id` properties

An array of objects each with an `_id` property is required (rather than an array of strings representing ids) to ensure forwards compatibility if we choose to require that any additional document information (such as `_rev`) also be passed in to this endpoint.

### Errors

If an error is encountered part-way through the response (eg on the third batch), it's impossible to send new headers to indicate a 5xx error, so the connection will simply be terminated (as recommended here https://github.com/expressjs/express/issues/2700).

### Examples

```
POST /api/v1/bulk-delete
Content-Type: application/json

{
  "docs": [
    { "_id": "id1" },
    { "_id": "id2" },
    ...
    { "_id": "id150" }
  ]
}
```

```
HTTP/1.1 200 OK
Content-Type: application/json

[
  [
    { "ok": true, "id": "id1", "rev": "1-rev1" },
    { "ok": true, "id": "id2", "rev": "1-rev2" },
    ...
    { "ok": true, "id": "id100", "rev": "1-rev100" }
  ],
  [
    { "ok": true, "id": "id101", "rev": "1-rev101" },
    { "ok": true, "id": "id102", "rev": "1-rev102" },
    ...
    { "ok": true, "id": "id150", "rev": "1-rev150" }
  ]
]
```

# Upgrades

Initiates an upgrade to the provided version. Once this endpoint is called [Horticulturalist](https://github.com/medic/horticulturalist) will take over and complete the installation.

### Permissions

`_admin` (CouchDB Administrator)

## Example

```
POST /api/v1/upgrade
{
  "build": {
    "namespace": "medic",
    "application": "medic",
    "version": "3.0.0-beta.1"
  }
}
```

For potential forwards compatibility, you must pass the `namespace` and `application` as `medic`.

The `version` should correspond to a release, pre-release or branch that has been pushed to our builds server (currently hard-coded to https://staging.dev.medicmobile.org/builds). This happens automatically upon a successful travis run.

Calling this endpoint will potentially restart API.

It is expected that the caller ensures forwards or backwards compatibility is maintained between deployed versions. This endpoing does not stop you from "upgrading" to an earlier version, or a branch that is incompatible with your current state.
