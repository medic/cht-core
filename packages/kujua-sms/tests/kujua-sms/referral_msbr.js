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

    // random ref_rc for better test data
    var ref_rc = String(rand());

    var data = {
        from: '+13125551212', // clinic.contact.phone
        message: '1!MSBR!2012#1#24#' + ref_rc +
                 '#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212',
        foo: 'bar' // extra is ok
    };

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

    var doc = result[0];
    var resp = JSON.parse(result[1]);

    // delete volatile properties
    delete doc.sent_timestamp;

    test.same(doc, {
        "from": "+13125551212",
        "message": "1!MSBR!2012#1#24#"+ ref_rc +"#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        //"sent_timestamp": "1-19-12 18:45",
        "sent_to": "+15551212",
        "foo": "bar",
        "type": "sms_message",
        "locale": "en",
        "form": "MSBR"
    });


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

    test.same(resp.callback.options, {
        "host": window.location.hostname,
        "port": window.location.port,
        "path": baseURL + "/MSBR/tasks_referral/add/%2B13125551212",
        "method": "POST",
        "headers": {
           "Content-Type": "application/json; charset=utf-8"
        }
     });

    test.same(resp.callback.data, {
        "type": "tasks_referral",
        "state": "",
        "from": "+13125551212",
        "to": "",
        "refid": ref_rc,
        "sms_message": {
           "from": "+13125551212",
           "message": "1!MSBR!2012#1#24#" + ref_rc +
                      "#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
           "sent_timestamp": "1-19-12 18:45",
           "sent_to": "+15551212",
           "foo": "bar",
           "type": "sms_message",
           "locale": "en",
           "form": "MSBR"
        },
        "messages": [],
        "form": "MSBR",
        "form_data": {
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
        },
        "clinic": null,
        "errors": []
    });

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

    // redefine global getRow to mock list function
    var viewdata = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic1,
        }
    ]};

    // step 2 call task_referral list function to add clinic data and construct
    // final callback to save the document.
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

    var task = {
        "type": "tasks_referral",
        "state": "pending",
        "from": "+13125551212",
        "to": "+17085551212",
        "refid": ref_rc,
        "sms_message": {
           "from": "+13125551212",
           "message": "1!MSBR!2012#1#24#"+ ref_rc + "#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
           "sent_timestamp": "1-19-12 18:45",
           "sent_to": "+15551212",
           "foo": "bar",
           "type": "sms_message",
           "locale": "en",
           "form": "MSBR"
        },
        "messages": [
           {
              "to": "+17085551212",
              "message": "Année: 2012, Mois: 1, Jour: 24, Code du RC: " + ref_rc
                         + ", Heure de départ: 1111, Nom: bbbbbbbbbbbbbbbbbbbb, Age: 22, Motif référence: TB dans le rouge, Si 'autre', précisez motif référence: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
           }
        ],
        "form": "MSBR",
        "form_data": {
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
        },
        "clinic": clinic1,
        "errors": [],
    };

    test.same(doc2.callback.data, task);

    // Step 3 tasks_referral doc (callback data) is saved
    // HTTP POST to CouchDB API (No test)

    // Step 4 Another request polls the db for tasks_referral documents that
    // are pending. Messages get formatted into the payload for the gateway.

    var viewdata = {rows: [
        {
            "key": [null, ref_rc],
            "value": null,
            "doc": task
        }
    ]};

    var result3 = fakerequest.list(lists.tasks_pending, viewdata, {
        method: "GET",
        headers:{
            "Content-Type":"application/json; charset=utf-8",
            "Host": window.location.host
        }
    });

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

    test.same(doc3.callback.options, {
       "host": window.location.hostname,
       "port": window.location.port,
       "path": appdb + "/_bulk_docs",
       "method": "POST",
       "headers": {
          "Content-Type": "application/json; charset=utf-8"
       }
    });

    test.same(doc3.callback.data.docs, [{
        "type": "tasks_referral",
        "state": "sent",
        "from": "+13125551212",
        "to": "+17085551212",
        "refid": ref_rc,
        "sms_message": {
           "from": "+13125551212",
           "message": "1!MSBR!2012#1#24#" + ref_rc + "#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
           "sent_timestamp": "1-19-12 18:45",
           "sent_to": "+15551212",
           "foo": "bar",
           "type": "sms_message",
           "locale": "en",
           "form": "MSBR"
        },
        "messages": [
           {
              "to": "+17085551212",
              "message": "Année: 2012, Mois: 1, Jour: 24, Code du RC: " + ref_rc + ", Heure de départ: 1111, Nom: bbbbbbbbbbbbbbbbbbbb, Age: 22, Motif référence: TB dans le rouge, Si 'autre', précisez motif référence: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
           }
        ],
        "form": "MSBR",
        "form_data": {
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
        },
        "clinic": {
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
        },
        "errors": []
    }]);

    // Step 5 Bulk db update to update the 'state' field to 'sent'
    // HTTP POST to _bulk_docs CouchDB API (No test)

    test.done();
};
