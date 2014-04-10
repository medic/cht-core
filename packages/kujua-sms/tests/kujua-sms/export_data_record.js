var lists = require('kujua-sms/lists'),
    moment = require('moment'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


exports['lists format date'] = function(test) {
    test.expect(3);
    test.same(
        "11, Mar 2012, 20:10:42 -02:00",
        lists.formatDate(1331503842461, 120)
    );
    test.same(
        "12, Mar 2012, 01:10:42 +03:00",
        lists.formatDate(1331503842461, -180)
    );
    // no tz value argument should retain browser/moment default
    // e.g. in Sao Paulo "11, Mar 2012, 19:10:42 -03:00"
    test.same(
        moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss Z'),
        lists.formatDate(1331503842461)
    );
    test.done();
}

exports['requesting data records export fails if user does not have perms'] = function(test) {
    test.expect(2);
    var req = {
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC'
        },
        method: "GET",
        userCtx: {
            roles: ['just_some_dude']
        }
    };

    var resp = fakerequest.list(lists.export_data_records, {rows: []}, req);
    test.same(403, resp.code);
    test.same(undefined, resp.body);
    test.done();
}

exports['lists export data records csv'] = function(test) {

    test.expect(1);

    var expected = '"Record UUID","Reported Date","Reported From","Clinic Contact Name"'
        +',"Clinic Name","Health Center Contact Name","Health Center Name","District Hospital Name"'
        +',"Année","Mois","Jour","Code du RC","Type de patient","Nom","Age"'
        +',"Nom de la mère ou de l\'accompagnant","Patient traité pour'
        +'","Recommandations/Conseils","Précisions pour recommandations"'
        +',"Nom de l\'agent de santé"\n'
        +'"abc123z","'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss Z')
        +'","+12229990000","Paul","Clinic 1","Eric","Health Center 1","District 1"'
        +',"2012","1","16","","","","","","","","",""\n'
        +'"ssdk23z","'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss Z')
        +'","+13331110000","Sam","Clinic 2","","","District 2","2012","1","16","","","",""'
        +',"","","","",""\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "key":[
                true,
                "MSBC",
                1331503842461],
            "value": 1,
            "doc": {
                _id: 'abc123z',
                form: "MSBC",
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
                true,
                "MSBC",
                1331503850000],
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
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC'
        },
        method: "GET",
        userCtx: {
            roles: ['national_admin']
        }
    };

    var resp = fakerequest.list(lists.export_data_records, viewdata, req);
    test.same(expected, resp.body);

    test.done()
};

exports['lists export data records fr'] = function(test) {

    test.expect(1);

    var expected = '"Record UUID";"Date envoyé";"Envoyé par";"Personne-ressource Clinique"'
        +';"Villages";"Nom de la santé Contact Center";"Nom du centre de santé";"Nom de l\'hôpital de district"'
        +';"Année";"Mois";"Jour";"Code du RC";"Type de patient";"Nom";"Age"'
        +';"Nom de la mère ou de l\'accompagnant";"Patient traité pour"'
        +';"Recommandations/Conseils";"Précisions pour recommandations"'
        +';"Nom de l\'agent de santé"\n'
        +'"abc123z";"'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss Z')+'"'
        +';"+12229990000";"Paul";"Clinic 1";"Eric";"Health Center 1";"District 1"'
        +';"2012";"1";"16";"";"";"";"";"";"";"";"";""\n'
        +'"ssdk23z";"'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss Z')+'"'
        +';"+13331110000";"Sam";"Clinic 2";"";"";"District 2";"2012";"1";"16";"";"";"";""'
        +';"";"";"";"";""\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "key": [true, "MSBC", 1331503842461],
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
            "key": [true, "MSBC", 1331503850000],
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
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC',
            locale: 'fr'
        },
        method: "GET",
        userCtx: {
            roles: ['national_admin']
        }
    };

    var resp = fakerequest.list(lists.export_data_records, viewdata, req);

    test.same(expected, resp.body);

    test.done()
};

exports['lists export data records skip header row'] = function(test) {

    test.expect(1);

    var expected = '"abc123z","'+moment(1331503842461).format('DD, MMM YYYY, HH:mm:ss Z')+'"'
        +',"+12229990000","Paul","Clinic 1","Eric","Health Center 1","District 1"'
        +',"2012","1","16","","","","","","","","",""\n'
        +'"ssdk23z","'+moment(1331503850000).format('DD, MMM YYYY, HH:mm:ss Z')+'"'
        +',"+13331110000","Sam","Clinic 2","","","District 2","2012","1","16","","","",""'
        +',"","","","",""\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "key": [true, "MSBC", 1331503842461],
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
            "key": [true, "MSBC", 1331503850000],
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
        query: {
            form: 'MSBC',
            skip_header_row: '1',
            startkey: 'foo',
            endkey: 'bar'
        },
        method: "GET",
        userCtx: {
            roles: ['national_admin']
        }
    };

    var resp = fakerequest.list(lists.export_data_records, viewdata, req);

    test.same(expected, resp.body);

    test.done()
};

exports['lists export data records with tz'] = function(test) {

    test.expect(1);

    var expected = '"Record UUID","Reported Date","Reported From","Clinic Contact Name"'
        +',"Clinic Name","Health Center Contact Name","Health Center Name","District Hospital Name"'
        +',"Année","Mois","Jour","Code du RC","Type de patient","Nom","Age"'
        +',"Nom de la mère ou de l\'accompagnant","Patient traité pour'
        +'","Recommandations/Conseils","Précisions pour recommandations"'
        +',"Nom de l\'agent de santé"\n'
        +'"abc123z","12, Mar 2012, 03:10:42 +05:00"'
        +',"+12229990000","Paul","Clinic 1","Eric","Health Center 1","District 1"'
        +',"2012","1","16","","","","","","","","",""\n'
        +'"ssdk23z","12, Mar 2012, 03:10:50 +05:00"'
        +',"+13331110000","Sam","Clinic 2","","","District 2","2012","1","16","","","",""'
        +',"","","","",""\n';

    // mockup the view data
    var viewdata = {rows: [
        {
            "key":[
                true,
                "MSBC",
                1331503842461
            ],
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
                true,
                "MSBC",
                1331503850000
            ],
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
        query: {
            startkey: 'foo',
            endkey: 'bar',
            form: 'MSBC',
            tz: "-300"
        },
        method: "GET",
        userCtx: {
            roles: ['national_admin']
        }
    };

    var resp = fakerequest.list(lists.export_data_records, viewdata, req);
    test.same(expected, resp.body);

    test.done()
};
