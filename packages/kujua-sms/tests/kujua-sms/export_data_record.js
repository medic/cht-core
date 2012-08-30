var lists = require('kujua-sms/lists'),
    moment = require('moment'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


exports.lists_data_record_csv = function(test) {

    test.expect(1);

    // the first char is the BOM
    var expected = '\uFEFF"Reported Date","From","Clinic Contact Name"'
        +',"Clinic Name","Health Center Contact Name","Health Center Name"'
        +',"Année","Mois","Jour","Code du RC","Type de patient","Nom","Age"'
        +',"Nom de la mère ou de l\'accompagnant","Patient traité pour'
        +'","Recommandations/Conseils","Précisions pour recommandations"'
        +',"Nom de l\'agent de santé"\n'
        +'"'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss')
        +'","+12229990000","Paul","Clinic 1","Eric","Health Center 1"'
        +',"2012","1","16","","","","","","","","",""\n'
        +'"'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss')
        +'","+13331110000","Sam","Clinic 2","","","2012","1","16","","","",""'
        +',"","","","",""\n';

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
                            contact: { name: "Eric" },
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
                            contact: { name: "" }, // empty contact name
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
    var expected = '\uFEFF"Date envoyé";"Envoyé par";"Personne-ressource Clinique"'
        +';"Villages";"Nom de la santé Contact Center";"Nom du centre de santé"'
        +';"Année";"Mois";"Jour";"Code du RC";"Type de patient";"Nom";"Age"'
        +';"Nom de la mère ou de l\'accompagnant";"Patient traité pour"'
        +';"Recommandations/Conseils";"Précisions pour recommandations"'
        +';"Nom de l\'agent de santé"\n'
        +'"'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss')+'"'
        +';"+12229990000";"Paul";"Clinic 1";"Eric";"Health Center 1"'
        +';"2012";"1";"16";"";"";"";"";"";"";"";"";""\n'
        +'"'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss')+'"'
        +';"+13331110000";"Sam";"Clinic 2";"";"";"2012";"1";"16";"";"";"";""'
        +';"";"";"";"";""\n';

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
                            contact: { name: "Eric" },
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
