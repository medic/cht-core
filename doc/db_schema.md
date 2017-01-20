#Database schema for v2

Dec 16, 2015 : estelle@, mandric@, marc@. Second update : Jan 2017, estelle@, stefan@, mandric@.

We use CouchDB to store data, which is noSQL, so it’s schemaless. This document aims to describe the different types of documents we store.

##Take a look!
Look inside a couchdb using Futon/Fauxton at <serverurl>/_utils.

E.g. http://localhost:5984/_utils/ or https://alpha.dev.medicmobile.org/_utils

Walk yourself through a couchdb tutorial if you’re unfamiliar with it.

##Types
Each doc should have a `type` field.

##Places
There are **4 levels of place types** : `national_office`, `district_hospital`, `health_center` and `clinic`. Most projects only use the **3 levels : `district_hospital`, `health_center` and `clinic`**.
(At this point the names don’t really make any sense (they are legacy), and ultimately we want to allow an arbitrary number of place types in the hierarchy.  In the future they might get replaced with `place-level-n` where n is a number that starts at 0 for the top level.)

The 4 levels are used differently depending on project configuration and translations.
 - Projects whose CHWs are on SMS (‘SMS projects’) usually use the 3 lower levels as as District > Health Center > CHW area/Catchment area/Area.
 - Projects whose CHWs are on android (‘android projects’) usually use the 3 lower levels as Branch > CHW Area > Family/Household (which means CHWs can sort their patients in families/households, which the SMS users can’t do)

![DB docs representing places](https://cdn.rawgit.com/medic/medic-webapp/master/doc/places.png)

Each (non-top-level) place doc has a **`parent` field**, which stores a whole copy of the parent doc.

![A place doc in Futon with its parent field](https://cdn.rawgit.com/medic/medic-webapp/master/doc/places_parents.png)


Note : the parent field doesn’t get updated when the parent doc gets updated. We will move away from this in 2017.
E.g. After creation of the `clinic` above, if you edit its parent `health_center`, the `clinic` will not get updated with the change, and will continue storing an outdated version in the `parent` field.

##Persons
Docs of `type: person` represent, well, **people**. E.g. Patients, CHWs, Branch Managers, ...

They **always belong to a place**. They have a `parent` field which stores a full copy of their parent doc.

Each place doc can have multiple `type:person` docs belonging to it.
E.g. A family has multiple family members.

![DB docs representing persons](https://cdn.rawgit.com/medic/medic-webapp/master/doc/persons.png)



Some `person`s are primary contacts for their place. The corresponding place doc has a **`contact` field**, which stores a full copy of a `type: person` doc.
The contact field is displayed as the Primary Contact for the place in the UI
E.g. the branch manager for the branch, the CHW for the CHW Area, …

Note: the term “contact” can also be used for `place || person`. That’s a legacy term. Sorry.

##Users
Users are different from `type:person` docs. They represent
 - **people who can log into the webapp or android app**. E.g. branch manager, CHW, …
 - or **computers that need to access the webapp** for specific tasks.

![User types, in UI for editing/creating users](https://cdn.rawgit.com/medic/medic-webapp/master/doc/user_types.png)

###People users
Note: not all people interacting with Medic Mobile can log into the app!
E.g. in an SMS project, CHWs are SMS-only and never log into the app. There is no user associated to them. In an android project, they do log into the android app, so they have an associated user.

Most People users are **associated with a place** (in the UI: “Restricted to their place” users). They can only access docs within that place.
E.g. a CHW is restricted to their CHW area, and can only see Family members belonging to their area, and the reports from these family members.

![DB docs representing persons](https://cdn.rawgit.com/medic/medic-webapp/master/doc/persons.png)


Users are represented by a **set of 3 docs** : a `type:person`, a `type:user-settings` and a `type:user`. The `type: user` doc is not in the main `medic` db, it’s in the `_users` db (check out couchdb documentation about `_users` db)

The user doc and the user-settings doc share the same `_id` field : `org.couchdb.user:<username>`.
There is similar information in both.
The `_user` doc holds the couchdb credentials. It lives on the couch server only.
The `user-settings` doc is replicated to the clients, who can edit it (so can’t be relied on for auth).

###Computer users
They have a doc in the `_users` db and a `type: user-settings` doc in the `medic` db, but no associated `person` or place.

##Forms
A form that users can submit as part of their workflow. Only XML forms are database objects. (JSON forms are part of the design doc.)
E.g. `pregnancy` form for CHWs to signal a new pregnancy, `assessment` form to assess the health of a patient,

Form id : `form:<formname>`

The `type: form` doc has an attachment, the xml form.

Forms have a `context`, which makes them displayed or not in various parts of the UI. ([documentation](http://medicmobile.cloud.answerhub.com/questions/72/what-determines-how-we-set-the-context-json-file-f.html))

![DB docs representing forms](https://cdn.rawgit.com/medic/medic-webapp/master/doc/forms.png)


##Reports
When a user submits a form, it produces a `type: data_record` doc.  When a user submits a message it also gets parsed and creates reports.

The word “report” is typically used for a form that is submitted.  We use “record” when referring to the doc in the database.  But sometimes these words are used interchangeably.

There are two supported ways to parse reports, depending on how the form needs to be  submitted and app is configured. SMS uses a JSON form and the ODK API uses XML. Either way, at the time of record creation in the database a form is parsed and a record is created.  The parsed form fields are saved under the property name `fields` and there are a few other fields that are part of a standard record.

Example of record that gets created from an SMS message, after a message is submitted and form is parsed:

```
{
  "_id": "3d9c7c94",
  "_rev": "5-f49f0dbc",
  "type": "data_record",
  "from": "+9779988777766",
  "form": "P",
  "errors": [],
  "tasks": [],
  "reported_date": 1484308744000,
  "sms_message": {
    "secret": "",
    "from": "+9779988777766",
    "message": "P 15 लछुता",
    "sent_timestamp": "1484308744000",
    "message_id": "6de6bb42",
    "type": "sms_message",
    "form": "P",
    "locale": "ne"
  },
  fields: {
    "last_menstrual_period": 15,
    "patient_name": "लछुता",
  }
}
```

For SMS reports, after the report is initially saved other processes will come and modify it, typically the next thing that happens is medic-sentinel will populate the `place` and `contact` properties.  This requires a database query so is done as a separate process from the initial creation.
SMS form definitions are part of application settings, on the design doc; so it can be used to parse data during initial record creation.

For XML reports, the actual xml data is also saved in attachments to the doc. (*Legacy: The actual xml data is saved in doc, in `content` field.*)

Data_record has the internalId of the form it comes from, in `form`.
Data_record has a copy of the `type: person` doc that submitted it, in `contact` (SMS-generated reports may not have a contact)
If sent by SMS, it can also have details of the SMS message, and the `scheduled_tasks` triggered by the form submission.

##Meta

`type: meta` : for keeping track of which migrations have been run by `medic-api`. See migrations.js.

##Feedback

`type: feedback` : created when used clicks “Report bug”

##Usage stats

`type: usage_stats`: ?

##Audit db
Any time a doc is modified, that action is saved in `medic-audit` db.
*Legacy: audit docs of type `audit_record` are saved in `medic` db.*







