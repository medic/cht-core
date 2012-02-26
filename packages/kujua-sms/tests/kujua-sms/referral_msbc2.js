var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest');

/*
 * MSBC test for Hospital -> Health Center counter referral
 */
exports.referral_msbc2 = function (test) {

    test.expect(16);

    var rand = function(from, to) {
        from = from || 10000000000;
        to = to || 99999999999;
        return Math.floor(Math.random() * (to - from + 1) + from);
    };

    // random ref_rc (Referral ID) for better test data
    var ref_rc = String(rand());

    // Data as passed in from SMSSync, JSON formatted
    var data = {
        from: '+14155551212', // hospital.contact.phone
        message: '1!MSBC!2012#1#16#' + ref_rc + '#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212', // gateway address
        // delete volatile properties for test
        //message_id: '13579',
        foo: 'bar' // extra is ok
    };

    // sms_message document
    var sms_message = {
       "from": "+14155551212", // hospital.contact.phone
       "message": '1!MSBC!2012#1#16#' + ref_rc + '#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm',
       "sent_timestamp": "1-19-12 18:45",
       "sent_to": "+15551212",
       "foo": "bar",
       "type": "sms_message",
       "locale": "en",
       "form": "MSBC"
    };

    // parsed sms_message data that includes labels
    var form_data = {
        "cref_year": [
           "2012",
           "Année"
        ],
        "cref_month": [
           "1",
           "Mois"
        ],
        "cref_day": [
           16,
           "Jour"
        ],
        "cref_rc": [
           ref_rc,
           "Code du RC"
        ],
        "cref_ptype": [
           "Autre",
           "Type de patient"
        ],
        "cref_name": [
           "abcdefghijklmnopqrst",
           "Nom"
        ],
        "cref_age": [
           31,
           "Age"
        ],
        "cref_mom": [
           "bcdefghijklmnopqrstu",
           "Nom de la mère ou de l'accompagnant"
        ],
        "cref_treated": [
           "cdefghijklmnopqrstuv",
           "Patient traité pour"
        ],
        "cref_rec": [
           "Référé",
           "Recommandations/Conseils"
        ],
        "cref_reason": [
           "defghijklmnopqrstuvw",
           "Précisions pour recommandations"
        ],
        "cref_agent": [
           "efghijklmnopqrstuvwxyzabcdefghijklm",
           "Nom de l'agent de santé"
        ]
    };

    // run add_sms update
    var result = updates.add_sms(null, {
        method: "POST",
        query:{},
        headers:{
            "Content-Length": querystring.stringify(data).length,
            "Content-Type":"application/x-www-form-urlencoded",
            "Host": window.location.host
        },
        body: querystring.stringify(data),
        form: data,
    });

    // check results of add_sms update run
    var doc = result[0];
    var resp = JSON.parse(result[1]);

    test.same(doc, sms_message);

    /*
     * Assert proper outgoing messages for the gateway to process
     */
    test.same(resp.payload, {
        "success": true,
        "task": "send",
        "messages": [
            {
            "to": "+14155551212",
            "message": "Merci, votre formulaire a été bien reçu."
            }
        ]
    });

    /*
     * Assert proper callback options for the gateway to process the next
     * request.
     */
    test.same(resp.callback.options, {
        "host": window.location.hostname,
        "port": window.location.port,
        "path": baseURL + "/MSBC/data_record/add/refid/" + ref_rc,
        "method": "POST",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
    });

    /*
     * Assert we have formed a phase 1 data_record document, not 'to' and
     * 'clinic' fields are null. These get added in the next callback request.
     */
    test.same(resp.callback.data.sms_message, sms_message);
    test.same(resp.callback.data.form_data, form_data);
    test.same(resp.callback.data, {
        "type": "data_record",
        "from": "+14155551212",
        "refid": ref_rc,
        "sms_message": sms_message,
        "form": "MSBC",
        "form_data": form_data,
        "related_entities": {"clinic": null},
        "errors": [],
        "tasks": []
    });

    /*
     * Our clinic mockup for this test.
     */
    var clinic1 = {
        "_id": "4a6399c98ff78ac7da33b639ed60f458",
        "_rev": "1-0b8990a46b81aa4c5d08c4518add3786",
        "type": "clinic",
        "name": "Example clinic 1",
        "contact": {
            "name": "Sam Jones",
            "phone": "+13125551212"
        },
        "parent": {
            "type": "health_center",
            "contact": {
                "name": "Neal Young",
                "phone": "+17085551212"
            },
            "parent": {
                "type": "district_hospital",
                "contact": {
                    "name": "Bernie Mac",
                    "phone": "+14155551212"
                }
            }
        }
    };

    /*
     * Mockup out view data for lists.data_record
     * Redefines global getRow function, to pass into fakerequest.
     */
    var viewdata = {rows: [
        {
            "key": [ref_rc],
            "value": clinic1
        }
    ]};

    /*
     * Execute step 2 by calling data_record list function.  This adds clinic
     * data and constructs document ready to be saved.
     */
    var result2 = fakerequest.list(lists.data_record, viewdata, {
        method: "POST",
        query:{form: 'MSBC'},
        headers:{
            "Content-Type":"application/json; charset=utf-8",
            "Host": window.location.host
        },
        body: JSON.stringify(resp.callback.data),
        form: {}
    });

    test.same(result2.headers, {
        "Content-Type": "application/json; charset=utf-8"
    });

    /*
     * Assert callback options for creating a document.
     */
    var doc2 = JSON.parse(result2.body);
    test.same(doc2.callback.options, {
        "host": window.location.hostname,
        "port": window.location.port,
        "path": appdb,
        "method": "POST",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
    });

    // delete volatile properties for test
    delete doc2.callback.data.created;

    var messages = [{
        "to": "+17085551212",
        "message": "Année: 2012, Mois: 1, Jour: 16, Code du RC: "+ ref_rc +", Type de patient: Autre, Nom: abcdefghijklmnopqrst, Age: 31, Nom de la mère ou de l'accompagnant: bcdefghijklmnopqrstu, Patient traité pour: cdefghijklmnopqrstuv, Recommandations/Conseils: Référé, Précisions pour recommandations: defghijklmnopqrstuvw, Nom de l'agent de santé: efghijklmnopqrstuvwxyzabcdefghijklm"
    }];

    /*
     * The record  that gets created after step2, includes clinic data and health
     * center phone number is in the to field. Define and assert the record  doc.
     */
    var record  = {
        "type": "data_record",
        "from": "+14155551212",
        "refid": ref_rc,
        "sms_message": sms_message,
        "form": "MSBC",
        "form_data": form_data,
        "related_entities": {"clinic": clinic1},
        "errors": [],
        "tasks": [{
            "type": "referral",
            "state": "pending",
            "to": "+17085551212",
            "messages": messages}]
    };

    // somewhat redundant to test all these but aides debugging
    test.same(doc2.callback.data.messages, record.messages);
    test.same(doc2.callback.data.form_data, record.form_data);
    test.same(doc2.callback.data, record);

    // Step 3 doc is saved
    // HTTP POST to CouchDB API (No test needed?)

    /*
     * Step 4 Another request polls the db for documents that have pending
     * tasks. Messages get formatted into the payload for the gateway.
     *
     * Mockup the view data first.
     */
    var viewdata = {rows: [
        {
            "key": [null, ref_rc],
            "value": null,
            "doc": record
        }
    ]};

    /*
     * Call the tasks_pending list.
     */
    var result3 = fakerequest.list(lists.tasks_pending, viewdata, {
        method: "GET",
        headers:{
            "Content-Type":"application/json; charset=utf-8",
            "Host": window.location.host
        }
    });

    /*
     * Assert the payload includes the message data for the gateway to send
     * out, message includes all the data and goes to the hospital.
     */
    var doc3 = JSON.parse(result3.body);
    test.same(doc3.payload, {
        "success": true,
        "task": "send",
        "secret": "",
        "messages": messages,
    });

    /*
     * Assert the callback to save the document after being processed, a POST
     * to _all_docs is formed to support multiple tasks being processed.
     */
    test.same(doc3.callback.options, {
       "host": window.location.hostname,
       "port": window.location.port,
       "path": appdb + "/_bulk_docs",
       "method": "POST",
       "headers": {
          "Content-Type": "application/json; charset=utf-8"
       }
    });

    /*
     * Assert that docs is an array, and the document includes all the fields.
     * The only real change is the state field is set to 'sent'.
     */
    var docs = [{
        "type": "data_record",
        "from": "+14155551212",
        "refid": ref_rc,
        "sms_message": sms_message,
        "form": "MSBC",
        "form_data": form_data,
        "related_entities": {"clinic": clinic1},
        "errors": [],
        "tasks": [{
            "type": "referral",
            "state": "sent",
            "to": "+17085551212",
            "messages": messages}]
    }];
    // somewhat redundant to test all these but aides debugging
    test.same(doc3.callback.data.docs[0].messages, docs[0].messages);
    test.same(doc3.callback.data.docs[0].form_data, docs[0].form_data);
    test.same(doc3.callback.data.docs, docs);

    // Step 5 Bulk db update to update the 'state' field to 'sent'
    // HTTP POST to _bulk_docs CouchDB API (No test)

    test.done();
};

