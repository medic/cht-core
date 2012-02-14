var updates = require('lib/updates'),
    querystring = require('querystring'),
    lists = require('lib/lists');

var clinic = {"type":"clinic","name":"Example clinic 1","contact":{"name":"Sam Jones","phone":"+13125551212"},"location":{"_id":"35e3db9fd6828381edd6fd13721651a7","type":"location","name":"Example location","lat":0,"lon":0,"tags":[]},"parent":{"type":"health_center","name":"Chamba","contact":{"name":"Neil Young","phone":"+17084449999"},"location":{"_id":"94719188fd073af8903270a22735d7bf","type":"location","name":"Example location","lat":0,"lon":0,"tags":[]},"parent":{"_id":"94719188fd073af8903270a227325710","type":"district_hospital","name":"Zomba","contact":{"name":"Example contact","phone":"+14151112222"},"location":{"_id":"94719188fd073af8903270a22735ae7e","type":"location","name":"Example location","lat":0,"lon":0,"tags":[]},"parent":{"_id":"94719188fd073af8903270a22706bc6f","type":"national_office","name":"Malawi National Office","contact":{"name":"Example contact","phone":"+18037772222"},"description":"Example national office"}},"_id":"4a6399c98ff78ac7da33b639ed40da36"},"_id":"4a6399c98ff78ac7da33b639ed60f458"};

exports.get_recip_phone = function(test) {
    test.expect(4);

    // Clinic -> Health Center
    var ph1 = lists.getRecipientPhone('MSBR','+13125551212',clinic);
    test.same(ph1, '+17084449999');

    // Health Center -> Clinic
    var ph2 = lists.getRecipientPhone('MSBC','+17084449999',clinic);
    test.same(ph2, '+13125551212');

    // Hospital -> Health Center
    var ph3 = lists.getRecipientPhone('MSBC','+14151112222',clinic);
    test.same(ph3, '+17084449999');

    // Health Center -> Hospital
    var ph4 = lists.getRecipientPhone('MSBB','+17084449999',clinic);
    test.same(ph4, '+14151112222');

    test.done();
};


exports.referralReponses = function (test) {

    var rand = function(from, to) {
        from = from || 10000000000;
        to = to || 99999999999;
        return Math.floor(Math.random() * (to - from + 1) + from);
    };

    // random ref_rc for better test data
    var ref_rc = rand();

    var data = {
        from: '+13125551212', // clinic.contact.phone
        message: '1!MSBR!2012#1#24#' + ref_rc +
                 '#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212',
        message_id: '13579',
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
        "message": "1!MSBR!2012#1#24#46717965675#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        //"sent_timestamp": "1-19-12 18:45",
        "sent_to": "+15551212",
        "message_id": "13579",
        "foo": "bar",
        "type": "sms_message",
        "locale": "en",
        "form": "MSBR"
    });


    // delete volatile properties
    delete resp.callback.data.sms_message.sent_timestamp;

    test.same(resp, {
        "payload": {
            "success": true,
            "task": "send",
            "messages": [
                {
                    "to": "+13125551212",
                    "message": "Merci, votre formulaire a été bien reçu."
                }
            ]
        },
        "callback": {
            "options": {
                "host": "localhost",
                "port": "5984",
                "path": "/kujua/_design/kujua-export/_rewrite/MSBR/tasks_referral/add/%2B13125551212",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json; charset=utf-8"
                }
            },
            "data": {
                "type": "tasks_referral",
                "state": "pending",
                "from": "+13125551212",
                "to": "",
                "refid": "46717965675",
                "sms_message": {
                    "from": "+13125551212",
                    "message": "1!MSBR!2012#1#24#46717965675#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
                    //"sent_timestamp": "1-19-12 18:45",
                    "sent_to": "+15551212",
                    "message_id": "13579",
                    "foo": "bar",
                    "type": "sms_message",
                    "locale": "en",
                    "form": "MSBR"
                },
                "messages": [],
                "form": "MSBR",
                "form_data": {
                    "ref_year": [ "2012", "Année" ],
                    "ref_month": [ "1", "Mois" ],
                    "ref_day": [ 24, "Jour" ],
                    "ref_rc": [ "46717965675", "Code du RC" ],
                    "ref_hour": [ 1111, "Heure de départ" ],
                    "ref_name": [ "bbbbbbbbbbbbbbbbbbbb", "Nom" ],
                    "ref_age": [ 22, "Age" ],
                    "ref_reason": [ "TB dans le rouge", "Motif référence" ],
                    "ref_reason_other": [ "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc", "Si 'autre', précisez motif référence" ]
                },
                "clinic": null,
                "errors": []
            }
        }
    });

    // step 2 of MSBR referral creation, clinic data is added and callback saves it
    // Step 3 The finalized doc is POSTed/saved

    // Step 4 Another request polls the db for tasks_referral documents that are pending.
    // messages get sent

    // Step 5 Bulk db update to update the 'state' field to 'complete'
    // http post to _bulk_docs

    test.done();
};
