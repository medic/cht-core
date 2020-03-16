# medic-api

Node server to support the medic app.

# Table of contents

<!-- To update table of contents run: `npm toc` -->

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
  - [GET /api/v2/export/dhis](#get-apiv2dhis)
  - [GET /api/v2/export/reports](#get-apiv2exportreports)
  - [GET /api/v2/export/messages](#get-apiv2exportmessages)
  - [GET /api/v2/export/feedback](#get-apiv2exportfeedback)
  - [GET /api/v2/export/contacts](#get-apiv2exportcontacts)
- [Forms](#forms)
  - [GET /api/v1/forms](#get-apiv1forms)
  - [GET /api/v1/forms/{{id}}.{{format}}](#get-apiv1formsidformat)
- [Records](#records)
  - [POST /api/v2/records](#post-apiv2records)
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
  - [GET /api/v1/users-info](#get-apiv1users-info)
- [Bulk Operations](#bulk-operations)
  - [POST /api/v1/bulk-delete](#post-apiv1bulk-delete)
- [Monitoring](#monitoring)
  - [GET /api/v1/monitoring](#get-apiv1monitoring)
- [Upgrades](#upgrades)
  - [Example](#example)
- [Hydrate](#hydrate)
  - [Example GET](#get-apiv1hydrate)
  - [Example POST](#post-apiv1hydrate)  

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Development

## Install

Get node deps with `npm ci`.

## Settings

Export a `COUCH_URL` env variable so sentinel knows what database to use. e.g.

```
export COUCH_URL='http://myAdminUser:myAdminPass@localhost:5984/medic'
```

If you are using CouchDB2.0 you need to also provide your node name. e.g.

```
export COUCH_NODE_NAME=couchdb@127.0.0.1 node server.js
```

If you want to allow cross-origin requests, add the flag `--allow-cors` when starting api. E.g.

    node server.js --allow-cors

## Run

`grunt deploy`

or

    node server.js

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
  },
};
```

Place your script in the `/migrations` folder and it will get picked up by medic-api at the next restart.

## Implementation, re-running migrations by hand

See [`migrations.js`](https://github.com/medic/cht-core/tree/master/api/src/migrations).

Importantly, the record of which migrations have been run is stored in the `migrations` array of an arbitrarily named document in CouchDB with the `.type` of `meta`. Because of this it can be a hard document to find, but you can get it using `curl`, and pretty print it with `jq`:

```
curl 'http://myAdminUser:myAdminPass@localhost:5984/medic/_design/medic-client/_view/doc_by_type?key=\["meta"\]&include_docs=true' | jq .rows[].doc
```

So, if you want to re-run a migration, delete its entry in the `migrations` list and re-run api.

## Troubleshooting
Given the error `StatusCodeError: 404 - {"error":"not_found","reason":"no such node: couchdb@localhost"}` or alike - check that the value of your COUCH_NODE_NAME environment variable equals the result of `curl -X GET "http://localhost:5984/_membership" --user user:pwd`.`

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

# Settings

Get and update the app settings.

## GET /api/v1/settings

Returns the settings in JSON format.

## PUT /api/v1/settings

### Query Parameters

| Variable | Description                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------- |
| overwrite  | Whether to replace settings document with input document. If both replace and overwite are set, then it overwites only. Defaults to replace. |
| replace  | Whether to replace existing settings for the given properties or to merge. Defaults to false (merging). |

Returns a JSON object with two fields:

```json
{
  "success": true,
  "upgraded": false
}
```

| Variable | Type | Description                                                                                             |
| -------- | ------|------------------------------------------------------------------------------------------------- |
| success  | Boolean | Always `true`
| upgraded  | Boolean |  Whether the settings doc was updated or not


# Export

Request different types of data in various formats.

Each of the export endpoints except contacts and feedback supports a parameter which returns date formatted in human readable form (ISO 8601). Setting this parameter to false or leaving it out will return dates formatted as an epoch timestamp.

To set this parameter for a GET request use:

```
http://admin:pass@localhost:5988/api/v2/export/messages?options[humanReadable]=true
```

To set this parameter for a POST request submit this as the request body:

```json
{
  "options": {
    "humanReadable": true
  }
}
```

## GET /api/v2/export/dhis

Exports target data formatted as a DHIS2 dataValueSet. The data can be filtered to a specific section of the contact hierarchy or for a given time interval.

Parameter | Description
-- | --
dataSet | A DHIS2 dataSet GUID. Targets associated with this dataSet will have their data aggregated. (required)
date.from | Filter the target data to be aggregated to be within the month of this timestamp. (required)
orgUnit | Filter the target data to only that associated with contacts with attribute `{ dhis: { orgUnit } }`. (optional)

```json
{
  "filters": {
    "dataSet": "VMuFODsyWaO",
    "date": {
      "from": 949392000000,
    },
    "orgUnit": "KbY9DJ8mBkx"
  }
}
```

## GET /api/v2/export/reports

It uses the [search shared library](shared-libs/search) to ensure identical results in the export and the front-end. It also only supports exporting CSV so we can efficiently stream infinitely large exports.

### Query parameters

These are identical to the JS objects passed to the shared library, as if you were using it directly in Javascript.

You may either pass JSON in the request body using `POST`:

```json
POST /api/v2/export/reports
{
  "filters": {
    "forms": {
      "selected": [
        {
          "code": "immunization_visit"
        }
      ]
    }
  }
}
```

Or using form-style parameters as `GET`:

```
GET /api/v2/export/reports?filters[search]=&filters[forms][selected][0][code]=immunization_visit
```

**NB:** this API is bound directly to this library. For more information on what queries you can perform with the search library, see [its documentation](/shared-lib/search).

## GET /api/v2/export/messages

Download messages.

### Output

| Column             | Description                                                                            |
| ------------------ | -------------------------------------------------------------------------------------- |
| Record UUID        | The unique ID for the message in the database.                                         |
| Patient ID         | The generated short patient ID for use in SMS.                                         |
| Reported Date      | The date the message was received or generated.                                        |
| From               | This phone number the message is or will be sent from.                                 |
| Contact Name       | The name of the user this message is assigned to.                                      |
| Message Type       | The type of the message                                                                |
| Message State      | The state of the message at the time this export was generated                         |
| Received Timestamp | The datetime the message was received. Only applies to incoming messages.              |
| Other Timestamps   | The datetime the message transitioned to each state.                                   |
| Sent By            | The phone number the message was sent from. Only applies to incoming messages.         |
| To Phone           | The phone number the message is or will be sent to. Only applies to outgoing messages. |
| Message Body       | The content of the message.                                                            |

### Examples

```
/api/v2/export/messages
```

## GET /api/v2/export/feedback

Export a file containing the user feedback.

### Query Parameters

| Variable        | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| format          | The format of the returned file, either 'csv' or 'xml'. Defaults to 'csv'.                 |
| locale          | Locale for translatable data. Defaults to 'en'.                                            |
| tz              | The timezone to show date values in, as an offset in minutes from GMT, for example '-120'. |
| skip_header_row | 'true' to omit the column headings. Defaults to 'false'.                                   |

## GET /api/v2/export/contacts

Returns a JSON array of contacts.

### Query parameters

These are identical to the JS objects passed to the shared library, as if you were using it directly in Javascript.

You may either pass JSON in the request body using `POST`:

```json
POST /api/v2/export/contacts
{
  "filters": {
    "search": "jim"
  }
}
```

Or using form-style parameters as `GET`:

```
GET /api/v2/export/contacts?filters[search]=jim
```

# Forms

## GET /api/v1/forms

Returns a list of currently installed forms (in all available formats) in JSON format.

### Headers

| Key                | Value | Description                                                                                                                                         |
| ------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-OpenRosa-Version | 1.0   | If this header is specified returns XML formatted forms list. See [OpenRosa FormListAPI](https://bitbucket.org/javarosa/javarosa/wiki/FormListAPI). |

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

| Variable | Description                                     |
| -------- | ----------------------------------------------- |
| id       | Form identifier                                 |
| format   | Format string or file extension. e.g. xml, json |

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

## POST /api/v2/records

Create a new record based on a [JSON form](https://github.com/medic/medic-docs/blob/master/configuration/forms.md#json-forms) that has been configured.

Records can be created one of two ways, parsing the form data yourself and submitting a JSON object or by submitting the raw message string.

### Headers

| Key          | Value                             | Description                                  |
| ------------ | --------------------------------- | -------------------------------------------- |
| Content-Type | application/x-www-form-urlencoded | Processes form parameters.                   |
| Content-Type | application/json                  | Processes form data in request body as JSON. |

Only one variant of the `Content-Type` header may be provided; RFC 2616 does not
allow multiple content types to appear in a single `Content-Type` header.

#### Form Parameters

| Variable      | Description                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| message       | Message string in a supported format like Muvuku or Textforms. Depending if your Medic Mobile instance is configured in forms-only mode or not you might receive an error if the form is not found. |
| from          | Reporting phone number.                                                                                                                                                                             |
| reported_date | Timestamp in MS since Unix Epoch of when the message was received on the gateway. Defaults to now.                                                                                                  |

#### JSON Properties

Special values reside in the property `_meta`, so you can't have a form field named `_meta`. Only strings and numbers are currently support as field values.

All property names will be lowercased.

| Key                  | Description                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| \_meta.form          | The form code.                                                                                     |
| \_meta.from          | Reporting phone number. Optional.                                                                  |
| \_meta.reported_date | Timestamp in MS since Unix Epoch of when the message was received on the gateway. Defaults to now. |
| \_meta.locale        | Optional locale string. Example: 'fr'                                                              |

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

If submitting JSON and corresponding form is not found on the server you will receive an error.

# SMS

## POST /api/sms

Endpoint used by medic-gateway to send sms messages. More documentation in [the medic-gateway repo](https://github.com/medic/medic-gateway/blob/master/README.md).

# People

## Supported Properties

Use JSON in the request body to specify a person's details.

Note: this does not accomodate having a `place` field on your form and will likely be revised soon.

#### Required

| Key  | Description                         |
| ---- | ----------------------------------- |
| name | String used to describe the person. |
| type | ID of the `contact_type` for the new person. Defaults to 'person' for backwards compatibility. |

#### Optional

| Key           | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| place         | String that references a place or object that defines a new place.     |
| reported_date | Timestamp of when the record was reported or created. Defaults to now. |

## POST /api/v1/people

Create new people.

### Permissions

By default any user can create or modify a place. Use these permissions to restrict access:

`can_create_people`, `can_create_places`

### Examples

Create new person and place hierarchy.

```
POST /api/v1/people
Content-Type: application/json

{
  "name": "Hannah",
  "phone": "+2548277210095",
  "type": "contact",
  "contact_type": "patient",
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
 "place": "1d83f2b4a27eceb40df9e9f9ad06d137",
 "type": "contact",
 "contact_type": "chp"
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

| Key    | Description                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| name   | String used to describe the place.                                                                                           |
| type   | Place type                                                                                                                   |
| parent | String that references a place or object that defines a new place. Optional for District Hospital and National Office types. |

#### Optional Properties

| Key           | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| contact       | String identifier for a person or object that defines a new person.    |
| reported_date | Timestamp of when the record was reported or created. Defaults to now. |

#### Place Types

| Key               | Description       |
| ----------------- | ----------------- |
| clinic            | Clinic            |
| health_center     | Health Center     |
| district_hospital | District Hospital |
| national_office   | National Office   |

## POST /api/v1/places

Create a new place and optionally a contact.

### Permissions

By default any user can create new places. Use these permissions to restrict access:

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

By default any user can update a place. Use these permissions to restrict access:

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

Use JSON in the request body to specify user details. Any properties submitted
that are not on the list below will be ignored. Any properties not included
will be undefined.

#### Required

| Key      | Description                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| username | String identifier used for authentication.                                      |
| password | Password string used for authentication. Only allowed to be set, not retrieved. |

#### Conditional

| Key     | Description                                                    | Details                                          |
| ------- | -------------------------------------------------------------- | ------------------------------------------------ |
| roles   | Array of roles.                                                |
| place   | Place identifier string (UUID) or object this user resides in. | Required if your roles contain `district_admin`. |
| contact | A person object based on the form configured in the app.       | Required if your roles contain `district_admin`. |

#### Optional

| Key      | Description                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| fullname | Full name                                                                                                                   |
| email    | Email address                                                                                                               |
| phone    | Phone number                                                                                                                |
| language | Language preference. e.g. "sw" for Swahili                                                                                  |
| known    | Boolean to define if the user has logged in before. Used mainly to determine whether or not to start a tour on first login. |

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
their place. The place is created in the background and automatically linked
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
are supported except for `contact.parent`. Creating or modifying people
through the user is not supported, see People section.

### Permissions

`can_update_users`, `can_update_places`, `can_update_people`

### Updating yourself

You do not need any of the above permissions if the user you are modifying is yourself. However, you are not allowed to modify your `type`, `roles`, `contact` or `place`.

Further more, if you're updating your `password` you must be authenticating via Basic Auth (either the header or in the URL). This is to ensure the password is known at time of request, and no one is hijacking a cookie.

### URL Parameters

| Variable | Description                                |
| -------- | ------------------------------------------ |
| username | String identifier used for authentication. |

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

Delete a user. Does not affect a person or place associated to a user.

### Permissions

`can_delete_users`

### URL Parameters

| Variable | Description                                |
| -------- | ------------------------------------------ |
| username | String identifier used for authentication. |

### Examples

```
DELETE /api/v1/users/mary
```

```
HTTP/1.1 200 OK
```

## GET /api/v1/users-info

Returns the number of documents an offline user would replicate, along with a `warn` flag if this number exceeds the recommended limit (now set at 10 000).

When the authenticated requester has an offline role, it returns the requester doc count.
##### Example
```
GET /api/v1/users-info -H 'Cookie: AuthSession=OFFLINE_USER_SESSION;'
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "total_docs": 5678,
  "warn": false,
  "limit: 10000
}
```

When the requester has an online role, the following query parameters are accepted:

#### Query Parameters

| Variable | Description                                | Required | 
| -------- | ------------------------------------------ | -------- |
| facility_id | String identifier representing the uuid of the user's facility  | true |
| role | String identifier representing the user role - must be configured as an offline role. Accepts valid UTF-8 JSON array for multiple of roles. | true |
| contact_id | String identifier representing the uuid of the user's associated contact | false | 
 
##### Example

```
GET /api/v1/users-info?facility_id={{facility_uuid}}&role={{role}}&contact_id={{contact_uuid}} -H 'Cookie: AuthSession=OFFLINE_USER_SESSION;'
```

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "total_docs": 10265,
  "warn": true,
  "limit: 10000
}
```

In case any of the required query parameters are omitted or the requested role is not configured as an offline role, the request will result in an error:


```
GET /api/v1/users-info?role={{online_role}} -H 'Cookie: AuthSession=OFFLINE_USER_SESSION;'
```

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "code": 400,
  "error": "Missing required query params: role and/or facility_id"
}
```

# Bulk Operations

## POST /api/v1/bulk-delete

Bulk delete endpoint for deleting large numbers of documents. Docs will be batched into groups of 100 and will be sent sequentially to couch (new batch sent after the previous one has returned). The response will be chunked JSON (one batch at a time), so if you wish to get an indication of progress you will need to parse incomplete JSON (with a library such as this one https://github.com/indgov/partial-json-parser).

### Permissions

Only available to online users.

### Parameters

| Parameter | Description                                 |
| --------- | ------------------------------------------- |
| docs      | Array of JSON objects with `_id` properties |

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

# Monitoring

## GET /api/v1/monitoring

Used to retrieve a range of metrics about the instance. While the output is human readable this is intended for automated monitoring allowing for tracking trends over time and alerting about potential issues.

### Permissions

No permissions required.

### Parameters

| Parameter | Description                                 |
| --------- | ------------------------------------------- |
| format    | The desired format of the output, defaults to JSON. The only currently supported value is "openmetrics" which is compatible with the Prometheus monitoring application. |

### Examples

#### JSON format

```
curl http://localhost:5988/api/v1/monitoring

{"version":{"app":"3.9.0","node":"v10.16.0","couchdb":"2.3.1"},"couchdb":{"medic":{"name":"medic","update_sequence":5733,"doc_count":278,"doc_del_count":32,"fragmentation":1.0283517758420173}...
```

#### OpenMetrics format

```
GET /api/v1/monitoring?format=openmetrics

# HELP couchdb_medic_doc_count The number of docs in the medic db
# TYPE couchdb_medic_doc_count gauge
couchdb_medic_doc_count 278

# HELP couchdb_medic_doc_del_count The number of deleted docs in the medic db
# TYPE couchdb_medic_doc_del_count gauge
couchdb_medic_doc_del_count 32

...
```

### Response content

| JSON path | OpenMetrics label | Type | Description |
| --------- | ----------------- | ---- | ----------- |
| `version.app` | _not included_ | String | The version of the webapp. |
| `version.node` | _not included_ | String | The version of NodeJS. |
| `version.couchdb` | _not included_ | String | The version of CouchDB. |
| `couchdb.<dbname>.name` | _not included_ | String | The name of the db, usually one of "medic", "medic-sentinel", "medic-users-meta", "_users". |
| `couchdb.<dbname>.update_sequence` | `couchdb_<dbname>_update_seq` | Number | The number of changes in the db. |
| `couchdb.<dbname>.doc_count` | `couchdb_<dbname>_doc_count` | Number | The number of docs in the db. |
| `couchdb.<dbname>.doc_del_count` | `couchdb_<dbname>_doc_del_count` | Number | The number of deleted docs in the db. |
| `couchdb.<dbname>.fragmentation` | `couchdb_<dbname>_fragmentation` | Number | The fragmentation of the db, lower is better, "1" is no fragmentation. |
| `date.current` | _not included_ | Number | The current server date in millis since the epoch, useful for ensuring the server time is correct. |
| `date.uptime` | _not included_ | Number | How long API has been running. |
| `sentinel.backlog` | `sentinel_backlog` | Number | Number of changes yet to be processed by Sentinel. |
| `messaging.outgoing.due` | `messaging_outgoing{state="due"}` | Number | The number of messages due to be sent. |
| `messaging.outgoing.scheduled` | `messaging_outgoing{state="scheduled"}` | Number | The number of messages scheduled to be sent in the future. |
| `messaging.outgoing.muted` | `messaging_outgoing{state="muted"}` | Number | The number of messages that are muted and therefore will not be sent. |
| `outbound_push.backlog` | `outbound_push_backlog` | Number | Number of changes yet to be processed by Outbound Push. |
| `feedback.count` | `feedback_doc` | Number | Number of feedback docs created usually indicative of client side errors. |
| `conflict.count` | `conflicts` | Number | Number of doc conflicts which need to be resolved manually. |

### Errors

- A metric of `""` (for string values) or `-1` (for numeric values) indicates an error occurred while querying the metric - check the API logs for details.
- If no response or an error response is received the the instance is unreachable. Thus, this API can be used as an uptime monitoring endpoint.

# Upgrades

All of these endpoints require the `can_configure` permission.

All of these endpoints are asynchronous. Progress can be followed by watching the `horti-upgrade` document and looking at the `log` property.

## POST /api/v1/upgrade

Performs a complete upgrade to the provided version. This is equivalent of calling `/api/v1/upgrade/stage` and then `/api/v1/upgrade/complete` once staging has finished.

### Example

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

Calling this endpoint will eventually cause api and sentinel to restart.

It is expected that the caller ensures forwards or backwards compatibility is maintained between deployed versions. This endpoint does not stop you from "upgrading" to an earlier version, or a branch that is incompatible with your current state.

## POST /api/v1/upgrade/stage

Stages an upgrade to the provided version. Does as much of the upgrade as possible without actually swapping versions over and restarting.

Parameters are the same as `/api/v1/upgrade`.

You know that an upgrade has been staged when the `horti-upgrade` document in CouchDB has `"staged": true`.

## POST /api/v1/upgrade/complete

Completes a staged upgrade. Throws a `404` if there is no upgrade in the staged position.

# Hydrate

Accepts a JSON array of document uuids and returns fully hydrated documents, in the same order in which they were requested. 
When documents are not found, an entry with the missing uuid and an error is added instead.  
Supports both GET and POST. 
Only allowed for users with "online" roles. 

## GET api/v1/hydrate

#### Query parameters

| Name | Required | Description |   
| -----  | -------- | ------ | 
| doc_ids | true | A JSON array of document uuids | 


#### Example

```
GET /api/v1/hydrate?doc_ids=["id1","missingId","id3"]
```

```
HTTP/1.1 200 OK
Content-Type: application/json

[
  { "id": "id1", "doc": { <...the hydrated document...> } },
  { "id": "missingId1", "error": "not_found" },
  { "id": "id3", "doc": { <...the hydrated document...> } },
]
```


## POST api/v1/hydrate

#### Parameters

| Name | Required | Description |   
| -----  | -------- | ------ | 
| doc_ids | true | A JSON array of document uuids | 


#### Example

```
POST /api/v1/hydrate
Content-Type: application/json

{
  "doc_ids": ["id1","missingId","id3"]
}

```

```
HTTP/1.1 200 OK
Content-Type: application/json

[
  { "id": "id1", "doc": { <...the hydrated document...> } },
  { "id": "missingId", "error": "not_found" },
  { "id": "id3", "doc": { <...the hydrated document...> } },
]
```
