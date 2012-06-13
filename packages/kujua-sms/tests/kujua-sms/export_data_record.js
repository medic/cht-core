var lists = require('kujua-sms/lists'),
    moment = require('moment'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');

exports.lists_data_record_csv = function(test) {

    test.expect(1);

    // the first char is the BOM
    var expected = '\uFEFF"Reported Date","From","Name","Clinic","Health Center","Année","Mois","Jour","Code du RC","Type de patient","Nom","Age","Nom de la mère ou de l\'accompagnant","Patient traité pour","Recommandations/Conseils","Précisions pour recommandations","Nom de l\'agent de santé"\n'
        +'"'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss')
        +'","+12229990000","Paul","Clinic 1","Health Center 1"'
        +',"2012","1","16","","","","","","","","",""\n'
        +'"'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss')
        +'","+13331110000","Sam","Clinic 2",""'
        +',"2012","1","16","","","","","","","","",""\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "key":[
                "68d45afe29fbf23d1cb9ee227345ec08",
                "MSBC",
                "District 1",
                "Form Title"],
            "value": 1,
            "doc": {
                _id: 'abc123z',
                related_entities: {
                    clinic: {
                        name:"Clinic 1",
                        contact: { name:"Paul", phone: ""},
                        parent: {
                            name: "Health Center 1",
                            contact: { name: "" },
                            parent: { name: "District 1" }}}},
                reported_date: 1331503842461,
                from: '+12229990000',
                cref_year: '2012',
                cref_month: "1",
                cref_day: 16
            }
        },
        {
            "key":[
                "fbf23d1cb9ee227345ec0868d45afe29",
                "MSBC",
                "District 2",
                "Form title"],
            "value": 1,
            "doc": {
                _id: 'ssdk23z',
                related_entities: {
                    clinic: {
                        name:"Clinic 2",
                        contact: {name:"Sam", phone: ""},
                        parent: {
                            name: "",
                            contact: { name:""},
                            parent: { name: "District 2" }}}},
                reported_date: 1331503850000,
                from: '+13331110000',
                cref_year: '2012',
                cref_month: "1",
                cref_day: 16}
        }
    ]};

    var req = {
        // locale defaults to english
        query: {form: 'MSBC'},
        method: "GET"
    };

    var resp = fakerequest.list(lists.data_records_csv, viewdata, req);
    test.same(expected, resp.body);

    test.done()
};

exports.lists_data_record_csv_fr = function(test) {

    test.expect(1);

    // the first char is the BOM
    var expected = '\uFEFF"Date envoyé";"Envoyé par";"Nom et Prénoms";"Villages";"Arrondissement";"Année";"Mois";"Jour";"Code du RC";"Type de patient";"Nom";"Age";"Nom de la mère ou de l\'accompagnant";"Patient traité pour";"Recommandations/Conseils";"Précisions pour recommandations";"Nom de l\'agent de santé"\n'
        +'"'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss')
        +'";"+12229990000";"Paul";"Clinic 1";"Health Center 1"'
        +';"2012";"1";"16";"";"";"";"";"";"";"";"";""\n'
        +'"'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss')
        +'";"+13331110000";"Sam";"Clinic 2";""'
        +';"2012";"1";"16";"";"";"";"";"";"";"";"";""\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "key": ["MSBC", 1331503842461],
            "value": 1,
            "doc": {
                _id: 'abc123z',
                related_entities: {
                    clinic: {
                        name:"Clinic 1",
                        contact: { name:"Paul", phone: ""},
                        parent: {
                            name: "Health Center 1",
                            contact: { name: "" },
                            parent: { name: "District 1" }}}},
                reported_date: 1331503842461,
                from: '+12229990000',
                cref_year: '2012',
                cref_month: "1",
                cref_day: 16
            }
        },
        {
            "key": ["MSBC", 1331503850000],
            "value": 1,
            "doc": {
                _id: 'ssdk23z',
                related_entities: {
                    clinic: {
                        name:"Clinic 2",
                        contact: {name:"Sam", phone: ""},
                        parent: {
                            name: "",
                            contact: { name:""},
                            parent: { name: "District 2" }}}},
                reported_date: 1331503850000,
                from: '+13331110000',
                cref_year: '2012',
                cref_month: "1",
                cref_day: 16}
        }
    ]};

    var req = {
        //locale is passed in to request
        query: {form: 'MSBC', locale: 'fr'},
        method: "GET"
    };

    var resp = fakerequest.list(lists.data_records_csv, viewdata, req);

    test.same(expected, resp.body);

    test.done()
};

//
// possibly overkill but trying to chase down a getLabels bug...
//
exports.lists_data_record_csv_msbm = function(test) {

    test.expect(1);

    var example_doc = { "_id": "a9c4aaaffdc6a685a69313583289b7c9", "_rev": "1-7e1409bfdb58eda679e039807183829e", "errors": [], "form": "MSBM", "from": "+22995409314", "med_cta_a": 123, "med_cta_c": 456, "med_ctm_a": 456, "med_ctm_c": 789, "med_day": 16, "med_month": "1", "med_para_a": 123, "med_para_c": 456, "med_rc": "12345678901", "med_sro_a": 123, "med_sro_c": 456, "med_tdr_a": 789, "med_tdr_c": 123, "med_year": "2012", "related_entities": { "clinic": { "_id": "e81ec6fd38724d7938f9400f3112fd1a", "_rev": "2-cd88ca89aebb3a760abba21b62e8d334", "contact": { "name": "Sam", "phone": "+22888402222", "rc_code": "04080402053" }, "name": "Clinic Name", "parent": { "_id": "3582303731d0f604ecc7e93dc9fdd4c7", "contact": { "name": "Paul", "phone": "" }, "name": "Health Center Name", "parent": { "_id": "68d45afe29fbf23d1cb9ee227345ec08", "contact": { "name": "", "phone": "" }, "description": "", "name": "Tchaourou", "parent": { "_id": "e6fe7d644104b9f0dce5866782b7948d", "contact": { "name": "", "phone": "" }, "description": "", "name": "", "type": "national_office" }, "type": "district_hospital" }, "type": "health_center" }, "type": "clinic" } }, "reported_date": 1333246225526, "sms_message": { "form": "MSBM", "from": "+22995409314", "locale": "en", "message": "1!MSBM!2012#1#16#12345678901#123#456#789#123#456#789#123#456#123#456", "message_id": "0", "secret": "", "sent_timestamp": "03-31-12 21:10", "sent_to": "", "type": "sms_message" }, "tasks": [], "type": "data_record" };

    // the first char is the BOM
    var expected = '\uFEFF"Reported Date","From","Name","Clinic","Health Center","Année","Mois","Jour","Code du RC","CTA actuel","CTA commandé","TDR actuel","TDR commandé","CTM 480 actuel","CTM 480 commandé","SRO/Zinc actuel","SRO/Zinc commandé","PARA actuel","PARA commandé"\n'
        +'"'+moment(1333246225526).format('DD, MMM YYYY, HH:mm:ss')
        +'","+22995409314","Sam","Clinic Name","Health Center Name","2012","1","16",'
        +'"12345678901","123","456","789","123","456","789","123","456","123","456"\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "id":"a9c4aaaffdc6a685a69313583289b7c9",
            "key":[
                "68d45afe29fbf23d1cb9ee227345ec08",
                "MSBM",
                "Tchaourou",
                "Alerte besoin médicaments"],
            "value":1,
            "doc": example_doc
        }
    ]};

    //startkey=%5B%2268d45afe29fbf23d1cb9ee227345ec08%22%2C%22MSBM%22%5D&endkey=%5B%2268d45afe29fbf23d1cb9ee227345ec08%22%2C%22MSBM%22%2C%7B%7D%5D&form=MSBM&include_docs=true&reduce=false&dh_name=Tchaourou
    var req = {
        //locale is passed in to request
        query: {
           form: 'MSBM',
           reduce: false,
           include_docs: true,
           startkey: ["68d45afe29fbf23d1cb9ee227345ec08", "MSBM"],
           endkey: ["68d45afe29fbf23d1cb9ee227345ec08", "MSBM", {}],
           dh_name: "Tchaourou"
        },
        method: "GET"
    };

    var resp = fakerequest.list(lists.data_records_csv, viewdata, req);

    test.same(expected, resp.body);

    test.done();

};
