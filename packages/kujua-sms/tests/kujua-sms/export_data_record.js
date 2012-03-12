var lists = require('kujua-sms/lists'),
    logger = require('kujua-utils').logger,
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


exports.lists_data_record_csv = function(test) {

    logger.debug(lists);
    test.expect(1);

    // the first char is the BOM
    var expected = '\uFEFF"Reported Date","From","Année","Mois","Jour","Code du RC","Type de patient","Nom","Age","Nom de la mère ou de l\'accompagnant","Patient traité pour","Recommandations/Conseils","Précisions pour recommandations","Nom de l\'agent de santé"\n' +
        '"1331503842461","+12229990000","2012","1","16","","","","","","","","",""\n'+
        '"1331503850000","+13331110000","2012","1","16","","","","","","","","",""';

    // mockup the view data from data_records_valid
    var viewdata = {rows: [
        {
            "key": ["MSBC", 1331503842461],
            "value": {
                _id: 'abc123z',
                reported_date: 1331503842461,
                from: '+12229990000',
                cref_year: '2012',
                cref_month: "1",
                cref_day: 16
            }
        },
        {
            "key": ["MSBC", 1331503850000],
            "value": {
                _id: 'ssdk23z',
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

    logger.debug(lists);
    test.expect(1);

    // the first char is the BOM
    var expected = '\uFEFF"Date envoyé";"Envoyé par";"Année";"Mois";"Jour";"Code du RC";"Type de patient";"Nom";"Age";"Nom de la mère ou de l\'accompagnant";"Patient traité pour";"Recommandations/Conseils";"Précisions pour recommandations";"Nom de l\'agent de santé"\n' +
        '"1331503842461";"+12229990000";"2012";"1";"16";"";"";"";"";"";"";"";"";""\n'+
        '"1331503850000";"+13331110000";"2012";"1";"16";"";"";"";"";"";"";"";"";""';

    // mockup the view data from data_records_valid
    var viewdata = {rows: [
        {
            "key": ["MSBC", 1331503842461],
            "value": {
                _id: 'abc123z',
                reported_date: 1331503842461,
                from: '+12229990000',
                cref_year: '2012',
                cref_month: "1",
                cref_day: 16
            }
        },
        {
            "key": ["MSBC", 1331503850000],
            "value": {
                _id: 'ssdk23z',
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
