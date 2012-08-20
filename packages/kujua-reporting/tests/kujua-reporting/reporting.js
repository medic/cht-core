var utils = require('kujua-reporting/utils'),
    moment = require('moment').moment;

exports['reporting.getRows - three months'] = function (test) {
    test.expect(1);
    var q = { startmonth: '2011-10', months: 3 },
        dates = utils.getDates(q);

    var facilities = [
        {
            "key": [
                "325710",
                "947322",
                "b3f150",
                "Zomba",
                "Chamba",
                "Example clinic 4"
            ],
            "value": 1
        },
        {
            "key": [
                "325710",
                "947322",
                "b3fddd",
                "Zomba",
                "Chamba",
                "Example clinic 5"
            ],
            "value": 1
        },
        {
            "key": [
                "325710",
                "947322",
                "b40cd2",
                "Zomba",
                "Chamba",
                "Example clinic 6"
            ],
            "value": 1
        },
        {
            "key": [
                "325710",
                "947f3d",
                "b42c21",
                "Zomba",
                "Chipini",
                "Example clinic 9"
            ],
            "value": 1
        },
        {
            "key": [
                "325710",
                "947f3d",
                "b42ffc",
                "Zomba",
                "Chipini",
                "Example clinic 10"
            ],
            "value": 1
        }
    ];

    var reports = [
        {
            "id": "d346ca",
            "key": [
                2011,
                7,
                "325710",
                "947322",
                "b3cb78"
            ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chamba",
                "clinic": "Example clinic 1",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": []
            }
        },
        {
            "id": "d3916d",
            "key": [
                2011,
                7,
                "325710",
                "947322",
                "b3d96d"
            ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chamba",
                "clinic": "Example clinic 2",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": []
            }
        },
        {
            "id": "d3ece6",
            "key": [
                2011,
                7,
                "325710",
                "947322",
                "b3e84e"
            ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chamba",
                "clinic": "Example clinic 3",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": []
            }
        }
    ];
    var rows = utils.getRows(facilities, reports, dates);

    var expected = [
        {
            "id": "b42ffc",
            "name": "Example clinic 10",
            "records": [
                {
                    "month": 9,
                    "month_pp": "October",
                    "year": 2011,
                    "name": "October 2011",
                    "not_submitted": true
                },
                {
                    "month": 8,
                    "month_pp": "September",
                    "year": 2011,
                    "name": "September 2011",
                    "not_submitted": true
                },
                {
                    "month": 7,
                    "month_pp": "August",
                    "year": 2011,
                    "name": "August 2011",
                    "not_submitted": true
                }
            ],
            "valid": 0,
            "valid_percent": 0
        },
        {
            "id": "b42c21",
            "name": "Example clinic 9",
            "records": [
                {
                    "month": 9,
                    "month_pp": "October",
                    "year": 2011,
                    "name": "October 2011",
                    "not_submitted": true
                },
                {
                    "month": 8,
                    "month_pp": "September",
                    "year": 2011,
                    "name": "September 2011",
                    "not_submitted": true
                },
                {
                    "month": 7,
                    "month_pp": "August",
                    "year": 2011,
                    "name": "August 2011",
                    "not_submitted": true
                }
            ],
            "valid": 0,
            "valid_percent": 0
        },
        {
            "id": "b40cd2",
            "name": "Example clinic 6",
            "records": [
                {
                    "month": 9,
                    "month_pp": "October",
                    "year": 2011,
                    "name": "October 2011",
                    "not_submitted": true
                },
                {
                    "month": 8,
                    "month_pp": "September",
                    "year": 2011,
                    "name": "September 2011",
                    "not_submitted": true
                },
                {
                    "month": 7,
                    "month_pp": "August",
                    "year": 2011,
                    "name": "August 2011",
                    "not_submitted": true
                }
            ],
            "valid": 0,
            "valid_percent": 0
        },
        {
            "id": "b3fddd",
            "name": "Example clinic 5",
            "records": [
                {
                    "month": 9,
                    "month_pp": "October",
                    "year": 2011,
                    "name": "October 2011",
                    "not_submitted": true
                },
                {
                    "month": 8,
                    "month_pp": "September",
                    "year": 2011,
                    "name": "September 2011",
                    "not_submitted": true
                },
                {
                    "month": 7,
                    "month_pp": "August",
                    "year": 2011,
                    "name": "August 2011",
                    "not_submitted": true
                }
            ],
            "valid": 0,
            "valid_percent": 0
        },
        {
            "id": "b3f150",
            "name": "Example clinic 4",
            "records": [
                {
                    "month": 9,
                    "month_pp": "October",
                    "year": 2011,
                    "name": "October 2011",
                    "not_submitted": true
                },
                {
                    "month": 8,
                    "month_pp": "September",
                    "year": 2011,
                    "name": "September 2011",
                    "not_submitted": true
                },
                {
                    "month": 7,
                    "month_pp": "August",
                    "year": 2011,
                    "name": "August 2011",
                    "not_submitted": true
                }
            ],
            "valid": 0,
            "valid_percent": 0
        }
    ];

    test.same(rows, expected);
    test.done();
};


exports['reporting.getRowsHC - three months'] = function (test) {

    test.expect(59);

    var q = { startmonth: '2011-10', months: 3 },
        dates = utils.getDates(q);

    var reports = [
        {
            "id": "d56252",
            "key": [ 2011, 7, "325710", "947f3d", "b42c21" ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 9",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": ["doh"]
            }
        },
        {
            "id": "d56884",
            "key": [
                2011,
                8,
                "325710",
                "947f3d",
                "b42c21"
            ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 9",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": ["doh"]
            }
        },
        {
            "id": "d5aeb8",
            "key": [
                2011,
                8,
                "325710",
                "947f3d",
                "b42ffc"
            ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 10",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": ["doh"]
            }
        }
    ];

    var facilities = {"rows":[
        {"key":["325710","947f3d","b42c21","Zomba","Chipini","Example clinic 9"],"value":1},
        {"key":["325710","947f3d","b42ffc","Zomba","Chipini","Example clinic 10"],"value":1},
        {"key":["325710","947f3d","b43333","Zomba","Chipini","Example clinic 11"],"value":1},
        {"key":["325710","947f3d","b433ab","Zomba","Chipini","Example clinic 12"],"value":1}
    ]};

    var rows = utils.getRowsHC(facilities, reports, dates);

    // we should have data on 4 facilities
    test.same(rows.length, 4);

    // Example clinic 12
    test.same(rows[0].name, "Example clinic 12");
    test.same(rows[0].id, "b433ab");
    test.same(rows[0].valid, 0);
    test.same(rows[0].valid_percent, 0);

    test.same(rows[0].records[0].month, 9);
    test.same(rows[0].records[0].year, 2011);
    test.same(rows[0].records[0].not_submitted, true);

    test.same(rows[0].records[1].month, 8);
    test.same(rows[0].records[1].year, 2011);
    test.same(rows[0].records[1].not_submitted, true);

    test.same(rows[0].records[2].month, 7);
    test.same(rows[0].records[2].year, 2011);
    test.same(rows[0].records[2].not_submitted, true);

    // Example clinic 11
    test.same(rows[1].name, "Example clinic 11");
    test.same(rows[1].id, "b43333");
    test.same(rows[1].valid, 0);
    test.same(rows[1].valid_percent, 0);

    test.same(rows[1].records[0].month, 9);
    test.same(rows[1].records[0].year, 2011);
    test.same(rows[1].records[0].not_submitted, true);

    test.same(rows[1].records[1].month, 8);
    test.same(rows[1].records[1].year, 2011);
    test.same(rows[1].records[1].not_submitted, true);

    test.same(rows[1].records[2].month, 7);
    test.same(rows[1].records[2].year, 2011);
    test.same(rows[1].records[2].not_submitted, true);

    // Example clinic 10
    test.same(rows[2].name, "Example clinic 10");
    test.same(rows[2].id, "b42ffc");
    test.same(rows[2].valid, 0);
    test.same(rows[2].valid_percent, 0);

    test.same(rows[2].records[0].month, 9);
    test.same(rows[2].records[0].year, 2011);
    test.same(rows[2].records[0].not_submitted, true);

    test.same(rows[2].records[1].month, 8);
    test.same(rows[2].records[1].year, 2011);
    test.same(rows[2].records[1].not_submitted, undefined);
    test.same(rows[2].records[1].id, "d5aeb8");
    // errors causes is_valid flag to be false
    test.same(rows[2].records[1].is_valid, false);

    test.same(rows[2].records[2].month, 7);
    test.same(rows[2].records[2].year, 2011);
    test.same(rows[2].records[2].not_submitted, true);


    // Example clinic 9
    test.same(rows[3].name, "Example clinic 9");
    test.same(rows[3].id, "b42c21");
    test.same(rows[3].valid, 0);
    test.same(rows[3].valid_percent, 0);

    test.same(rows[3].records[0].month, 9);
    test.same(rows[3].records[0].year, 2011);
    test.same(rows[3].records[0].not_submitted, true);

    // month 8 is submitted for clinic 9
    test.same(rows[3].records[1].month, 8);
    test.same(rows[3].records[1].year, 2011);
    test.same(rows[3].records[1].not_submitted, undefined);
    test.same(rows[3].records[1].id, "d56884");
    // errors causes is_valid flag to be false
    test.same(rows[3].records[1].is_valid, false);

    // month 7 is submitted for clinic 9
    test.same(rows[3].records[2].month, 7);
    test.same(rows[3].records[2].year, 2011);
    test.same(rows[3].records[2].not_submitted, undefined);
    test.same(rows[3].records[2].id, "d56252");
    // errors causes is_valid flag to be false
    test.same(rows[3].records[1].is_valid, false);

    test.done();
};

exports['reporting.getTotals - weekly time unit and frequency'] = function (test) {
    test.expect(1);
    var q = { startweek: '2012-34', weeks: 3, time_unit: 'week' },
        reporting_freq = 'week',
        dates = utils.getDates(q, reporting_freq);

    var reports = [
        {
            "id": "d56252",
            "key": [ 2012, 33, "325710", "947f3d", "b42c21" ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 9",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "is_valid": true,
                "week_number": 33
            }
        }
    ];

    var facilities = {
        "rows":[
            {"key":["325710","947f3d","b42c21","Zomba","Chipini","Example clinic 9"],"value":1},
            {"key":["325710","947f3d","b42ffc","Zomba","Chipini","Example clinic 10"],"value":1}
        ]
    };

    var totals = utils.getTotals(facilities, reports, dates);

    test.same(totals, {
        "clinics": {
            "b42c21": "Example clinic 9",
            "b42ffc": "Example clinic 10"
        },
        "health_centers": {
            "947f3d": "Chipini"
        },
        "district_hospitals": {
            "325710": "Zomba"
        },
        "complete": 1,
        "complete_percent": 17,
        "incomplete": 0,
        "incomplete_percent": 0,
        "not_submitted": 5,
        "not_submitted_percent": 83,
        "expected_reports": 6,
        "submitted": 1
    });
    test.done();
};

exports['reporting.getTotals - months time unit, weekly report frequency'] = function (test) {
    test.expect(1);
    var q = { startmonth: '2012-08', months: 3 },
        reporting_freq = 'week',
        dates = utils.getDates(q, reporting_freq);

    var reports = [
        {
            "id": "d56252",
            "key": [ 2012, 31, "325710", "947f3d", "b42c21" ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 9",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "is_valid": true,
                "week_number": 31
            }
        }
    ];

    var facilities = {
        "rows":[
            {"key":["325710","947f3d","b42c21","Zomba","Chipini","Example clinic 9"],"value":1},
            {"key":["325710","947f3d","b42ffc","Zomba","Chipini","Example clinic 10"],"value":1}
        ]
    };

    var totals = utils.getTotals(facilities, reports, dates);

    test.same(totals, {
        "clinics": {
            "b42c21": "Example clinic 9",
            "b42ffc": "Example clinic 10"
        },
        "health_centers": {
            "947f3d": "Chipini"
        },
        "district_hospitals": {
            "325710": "Zomba"
        },
        "complete": 1,
        "complete_percent": 4,
        "incomplete": 0,
        "incomplete_percent": 0,
        "not_submitted": 25,
        "not_submitted_percent": 96,
        "expected_reports": 26,
        "submitted": 1
    });
    test.done();

};

exports['reporting.getTotals - single health center, three months'] = function (test) {

    test.expect(1);
    var q = { startmonth: '2011-10', months: 3 },
        dates = utils.getDates(q);

    var reports = [
        {
            "id": "d56252",
            "key": [ 2011, 7, "325710", "947f3d", "b42c21" ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 9",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": ["doh"]
            }
        },
        {
            "id": "d56884",
            "key": [ 2011, 8, "325710", "947f3d", "b42c21" ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 9",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": ["doh"]
            }
        },
        {
            "id": "d5aeb8",
            "key": [
                2011,
                8,
                "325710",
                "947f3d",
                "b42ffc"
            ],
            "value": {
                "district_hospital": "Zomba",
                "health_center": "Chipini",
                "clinic": "Example clinic 10",
                "reporter": "Example reporter",
                "reporting_phone": "0123456789",
                "errors": ["doh"]
            }
        }
    ];

    var facilities = {"rows":[
        {"key":["325710","947f3d","b42c21","Zomba","Chipini","Example clinic 9"],"value":1},
        {"key":["325710","947f3d","b42ffc","Zomba","Chipini","Example clinic 10"],"value":1},
        {"key":["325710","947f3d","b43333","Zomba","Chipini","Example clinic 11"],"value":1},
        {"key":["325710","947f3d","b433ab","Zomba","Chipini","Example clinic 12"],"value":1}
    ]};

    var totals = utils.getTotals(facilities, reports, dates);
    test.same(totals, {
        "clinics": {
            "b42c21": "Example clinic 9",
            "b42ffc": "Example clinic 10",
            "b43333": "Example clinic 11",
            "b433ab": "Example clinic 12"
        },
        "health_centers": {
            "947f3d": "Chipini"
        },
        "district_hospitals": {
            "325710": "Zomba"
        },
        "complete": 0,
        "complete_percent": 0,
        "incomplete": 3,
        "incomplete_percent": 25,
        "not_submitted": 9,
        "not_submitted_percent": 75,
        "expected_reports": 12,
        "submitted": 3
    });
    test.done();
};

exports['getDates list - specify startmonth'] = function (test){
    var q = { startmonth: '2011-8', months: 3 };
    var dates = utils.getDates(q);
    test.expect(4);
    test.strictEqual(dates.list.length, 3);
    test.same(dates.list[0].native(), new Date(2011,7,2));
    test.same(dates.list[1].native(), new Date(2011,6,2));
    test.same(dates.list[2].native(), new Date(2011,5,2));
    test.done()
};

exports['getDates list - no params'] = function (test){
    var q = {};
    var now = new Date();
    var dates = utils.getDates(q);
    var expected = [
        new Date(now.getFullYear(), now.getMonth(), 2),
        new Date(now.getFullYear(), now.getMonth()-1, 2),
        new Date(now.getFullYear(), now.getMonth()-2, 2)];
    test.expect(4);
    test.strictEqual(dates.list.length, 3);
    test.same(dates.list[0].native(), expected[0]);
    test.same(dates.list[1].native(), expected[1]);
    test.same(dates.list[2].native(), expected[2]);
    test.done();
};

exports['getDates list - 12 months'] = function (test){
    var q = { startmonth: '2011-8', months: 12 };
    var dates = utils.getDates(q);
    test.expect(13);
    test.strictEqual(dates.list.length, 12);
    test.same(dates.list[0].native(), new Date(2011,7,2));
    test.same(dates.list[1].native(), new Date(2011,6,2));
    test.same(dates.list[2].native(), new Date(2011,5,2));
    test.same(dates.list[3].native(), new Date(2011,4,2));
    test.same(dates.list[4].native(), new Date(2011,3,2));
    test.same(dates.list[5].native(), new Date(2011,2,2));
    test.same(dates.list[6].native(), new Date(2011,1,2));
    test.same(dates.list[7].native(), new Date(2011,0,2));
    test.same(dates.list[8].native(), new Date(2010,11,2));
    test.same(dates.list[9].native(), new Date(2010,10,2));
    test.same(dates.list[10].native(), new Date(2010,9,2));
    test.same(dates.list[11].native(), new Date(2010,8,2));
    test.done()
};

exports['process not submitted records, missing two months'] = function (test){

    // startmonth query param month string is not zero indexed
    var q = { startmonth: '2011-10', months: 3 };
    var dates = utils.getDates(q);

    var rows = [{
        "id": "89436d0828ead00d7745d0ed580d0455",
        "name": "Example clinic 48",
        "records": [
            {
                "id": "89436d0828ead00d7745d0ed58566ad4",
                "clinic": {
                    "id": "89436d0828ead00d7745d0ed580d0455",
                    "name": "Example clinic 48"
                },
                "month": 8, // data record is zero indexed
                "month_pp": "September 2011",
                "year": 2011,
                "reporter": "Example reporter",
                "reporting_phone": "0123456789"
            }
        ]
    }];

    test.expect(7);

    utils.processNotSubmitted(rows, dates);

    // there should only be a total of three records after processing
    test.strictEqual(rows[0].records.length, 3);

    /* new records should have been added in the right order */
    test.strictEqual(rows[0].records[0].month, 9);
    test.strictEqual(rows[0].records[1].month, 8);
    test.strictEqual(rows[0].records[2].month, 7);

    /*
     * not_submitted property should be set to true on non-existing records and
     * undefined otherwise.
     * */
    test.strictEqual(rows[0].records[0].not_submitted, true);
    // submitted record does not have a not_submitted property
    test.strictEqual(rows[0].records[1].not_submitted, undefined);
    test.strictEqual(rows[0].records[2].not_submitted, true);

    test.done();
};

/*
 *  e.g. Aug 2011 with no startmonth:
 *
 *  query string:
 *   ?months=1
 *  view parameters:
 *   ?startkey=[2011,8]&endkey=[2011,7]&descending=true
 */
exports['req.query params to view params with no startmonth'] = function(test) {
    test.expect(3);
    var now = new Date();
    var q = {months: 1};
    var expect = {
        startkey: [now.getFullYear(),now.getMonth()+1],
        endkey: [now.getFullYear(), now.getMonth()],
        descending: true
    };
    var dates = utils.getDates(q);
    var args = utils.getReportingViewArgs(dates);
    test.same(args.startkey, expect.startkey);
    test.same(args.endkey, expect.endkey);
    test.same(args.descending, expect.descending);
    test.done();
};

/* Selecting January:
 *
 *  query string:
 *   ?startmonth=2011-1&months=1
 *  view parameters:
 *   ?startkey=[2011,1]&endkey=[2011,0]&descending=true
 */
exports['req.query params to view params when startmonth is January'] = function(test) {
    test.expect(3);
    var q = {months: 1, startmonth: '2011-1'};
    var expect = {
        startkey: [2011,1],
        endkey: [2011, 0],
        descending: true
    };
    var dates = utils.getDates(q);
    var args = utils.getReportingViewArgs(dates);
    test.same(args.startkey, expect.startkey);
    test.same(args.endkey, expect.endkey);
    test.same(args.descending, expect.descending);
    test.done();
};

/* Selecting August and 6 months prior:
 *
 *  query string:
 *   ?startmonth=2011-8&months=6
 *  view parameters:
 *   ?startkey=[2011,8]&endkey=[2011,2]&descending=true
 */
exports['req.query params to view params when startmonth is August and 6 months prior'] = function(test) {
    test.expect(3);
    var reqQuery = {startmonth:'2011-8', months:'6'};
    var expect = {
        startkey: [2011,8],
        endkey: [2011, 2],
        descending: true
    };
    var dates = utils.getDates(reqQuery);
    var args = utils.getReportingViewArgs(dates);
    test.same(args.startkey, expect.startkey);
    test.same(args.endkey, expect.endkey);
    test.same(args.descending, expect.descending);
    test.done();
};

exports['dateToMonthStr - should return non-zero indexed string.'] = function(test) {
    var date = moment(new Date(2011, 9));
    test.strictEqual(utils.dateToMonthStr(date), '2011-10');
    test.done();
};

exports['getDates'] = function (test) {
    var now, date, dates;

    // selected/reporting time unit and reporting freq is week
    dates = utils.getDates({time_unit: 'week'}, 'week');
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'week');
    test.equal(dates.reporting_freq, 'week');

    // selected/reporting time unit is month and reporting freq is week
    // and startmonth is not given about 13 weeks = 3 months
    now = new Date();
    date = moment(now);
    dates = utils.getDates({time_unit: 'month'}, 'week');
    test.equal(dates.list.length, 13);
    test.equal(dates.list[0].toString(), now.toString());
    test.equal(dates.list[12].toString(), date.subtract('weeks', 12).native().toString());

    // selected/reporting time unit is month and reporting freq is week
    // and startmonth is given
    date = new Date(2011, 3, 2);
    dates = utils.getDates({time_unit: 'month', startmonth: (date.getFullYear() + '-' + (date.getMonth() + 1))}, 'week');
    test.equal(dates.list.length, 13);
    test.equal(dates.list[0].toString(), date.toString());
    test.equal(dates.list[12].toString(), moment(date).subtract('weeks', 12).native().toString());
    
    // selected/reporting time unit is quarter and reporting freq is week
    dates = utils.getDates({time_unit: 'quarter'}, 'week');
    test.equal(dates.list.length, 26);
    
    // selected/reporting time unit is year and reporting freq is week
    dates = utils.getDates({time_unit: 'year'}, 'week');
    test.equal(dates.list.length, 104);
    
    // selected/reporting time unit is week and but reporting freq is not given
    dates = utils.getDates({time_unit: 'week'});
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'month');
    
    // selected/reporting time unit is week and reporting freq is month
    dates = utils.getDates({time_unit: 'week'}, 'month');
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'month');
    
    // selected/reporting time unit is month and reporting freq is month
    now = new Date();
    dates = utils.getDates({time_unit: 'month'}, 'month');
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'month');
    test.equal(dates.list[0].toString(), new Date(now.getFullYear(), now.getMonth(), 2).toString());
    test.equal(dates.list[1].toString(), new Date(now.getFullYear(), now.getMonth() - 1, 2).toString());
    test.equal(dates.list[2].toString(), new Date(now.getFullYear(), now.getMonth() - 2, 2).toString());
    
    // selected/reporting time unit is month and reporting freq is month and months is 6
    dates = utils.getDates({time_unit: 'month', months: 6}, 'month');
    test.equal(dates.list.length, 6);
    
    // selected/reporting time unit is month and reporting freq is month and startmonth is two months ago
    date = new Date(2011, 3, 2);
    dates = utils.getDates({time_unit: 'month', startmonth: (date.getFullYear() + '-' + (date.getMonth() + 1))}, 'month');
    test.equal(dates.list[0].toString(), date.toString());
    
    // selected/reporting time unit is quarter and reporting freq is month
    dates = utils.getDates({time_unit: 'quarter'}, 'month');
    test.equal(dates.list.length, 6);
    
    // selected/reporting time unit is quarter and reporting freq is month and quarters is 3
    now = new Date()
    dates = utils.getDates({time_unit: 'quarter', quarters: 3}, 'month');
    test.equal(dates.list.length, 9);
    test.equal(dates.list[0].toString(), new Date(now.getFullYear(), now.getMonth(), 2).toString());
    test.equal(dates.list[8].toString(), new Date(now.getFullYear(), now.getMonth() - 8, 2).toString());

    // selected/reporting time unit is year, return 24 months
    dates = utils.getDates({time_unit: 'year'});
    test.equal(dates.list.length, 24);

    // selected/reporting time unit is not given and reporting freq is month,
    // return 3 months
    dates = utils.getDates({}, 'month');
    test.equal(dates.list.length, 3);

    test.done();
};
