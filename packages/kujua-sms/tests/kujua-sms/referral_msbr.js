var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    fakerequest = require('couch-fakerequest');


exports.referral_msbr = function (test) {

    test.expect(10);

    var rand = function(from, to) {
        from = from || 10000000000;
        to = to || 99999999999;
        return Math.floor(Math.random() * (to - from + 1) + from);
    };

    // random ref_rc (Referral ID) for better test data
    var ref_rc = String(rand());

    // Data as passed in from SMSSync, JSON formatted
    var data = {
        from: '+13125551212', // clinic.contact.phone
        message: '1!MSBR!2012#1#24#' + ref_rc +
                 '#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212',
        foo: 'bar' // extra is ok
    };

    // sms_message document
    var sms_message = {
       "from": "+13125551212",
       "message": "1!MSBR!2012#1#24#" + ref_rc +
                  "#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
       "sent_timestamp": "1-19-12 18:45",
       "sent_to": "+15551212",
       "foo": "bar",
       "type": "sms_message",
       "locale": "en",
       "form": "MSBR"
    };

    // parsed sms_message data that includes labels
    var form_data = {
       "ref_year": [
          "2012",
          "Année"
       ],
       "ref_month": [
          "1",
          "Mois"
       ],
       "ref_day": [
          24,
          "Jour"
       ],
       "ref_rc": [
          ref_rc,
          "Code du RC"
       ],
       "ref_hour": [
          1111,
          "Heure de départ"
       ],
       "ref_name": [
          "bbbbbbbbbbbbbbbbbbbb",
          "Nom"
       ],
       "ref_age": [
          22,
          "Age"
       ],
       "ref_reason": [
          "TB dans le rouge",
          "Motif référence"
       ],
       "ref_reason_other": [
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          "Si 'autre', précisez motif référence"
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

    delete doc._id;
    test.same(doc, sms_message);

    // Assert proper outgoing messages for the gateway to process
    test.same(resp.payload, {
        "success": true,
        "task": "send",
        "messages": [
            {
            "to": "+13125551212",
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
        "path": baseURL + "/MSBR/data_record/add/clinic/%2B13125551212",
        "method": "POST",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
     });

    /*
     * Assert we have formed a phase 1 tasks_referral document, not 'to' and
     * 'clinic' fields are null. These get added in the next callback request.
     */
    test.same(resp.callback.data, {
        "type": "tasks_referral",
        "state": "",
        "from": "+13125551212",
        "to": "",
        "refid": ref_rc,
        "sms_message": sms_message,
        "messages": [],
        "form": "MSBR",
        "clinic": null,
        "errors": []
    });

    /*
     * Our clinic mockup for this test. MSBR is Clinic -> Health Center
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
            }
        }
    };

    /*
     * Mockup out view data for lists.tasks_referral
     * Redefines global getRow function, to pass into fakerequest
     */
    var viewdata = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic1
        }
    ]};

    /*
     * Execute step 2 by calling task_referral list function.  This adds clinic
     * data and constructs task document ready to be saved.
     */
    var result2 = fakerequest.list(lists.tasks_referral, viewdata, {
        method: "POST",
        query:{form: 'MSBR'},
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

    /*
     * The task that gets created after step2, includes clinic data and health
     * center phone number is in the to field. Define and assert the task doc.
     */
    var task = {
        "type": "tasks_referral",
        "state": "pending",
        "from": "+13125551212",
        "to": "+17085551212",
        "refid": ref_rc,
        "sms_message": sms_message,
        "messages": [
           {
              "to": "+17085551212",
              "message": "Année: 2012, Mois: 1, Jour: 24, Code du RC: " + ref_rc
                         + ", Heure de départ: 1111, Nom: bbbbbbbbbbbbbbbbbbbb, Age: 22, Motif référence: TB dans le rouge, Si 'autre', précisez motif référence: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
           }
        ],
        "form": "MSBR",
        "clinic": clinic1,
        "errors": [],
    };

    test.same(doc2.callback.data, task);

    // Step 3 tasks_referral doc is saved
    // HTTP POST to CouchDB API (No test needed?)

    /*
     * Step 4 Another request polls the db for tasks_referral documents that
     * are pending. Messages get formatted into the payload for the gateway.
     *
     * Mockup the view data first.
     */
    var viewdata = {rows: [
        {
            "key": [null, ref_rc],
            "value": null,
            "doc": task
        }
    ]};

    /*
     * Call the tasks_pending view.
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
     * out, message includes all the data and goes to the health center.
     */
    var doc3 = JSON.parse(result3.body);
    test.same(doc3.payload, {
        "success": true,
        "task": "send",
        "secret": "",
        "messages": [
            {
                "to": "+17085551212",
                "message": "Année: 2012, Mois: 1, Jour: 24, Code du RC: " + ref_rc 
                           + ", Heure de départ: 1111, Nom: bbbbbbbbbbbbbbbbbbbb, Age: 22, Motif référence: TB dans le rouge, Si 'autre', précisez motif référence: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
            }
        ]
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
    test.same(doc3.callback.data.docs, [{
        "type": "tasks_referral",
        "state": "sent",
        "from": "+13125551212",
        "to": "+17085551212",
        "refid": ref_rc,
        "sms_message": sms_message,
        "messages": [
           {
              "to": "+17085551212",
              "message": "Année: 2012, Mois: 1, Jour: 24, Code du RC: " + ref_rc + ", Heure de départ: 1111, Nom: bbbbbbbbbbbbbbbbbbbb, Age: 22, Motif référence: TB dans le rouge, Si 'autre', précisez motif référence: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
           }
        ],
        "form": "MSBR",
        "clinic": clinic1,
        "errors": []
    }]);

    // Step 5 Bulk db update to update the 'state' field to 'sent'
    // HTTP POST to _bulk_docs CouchDB API (No test)

    test.done();
};
