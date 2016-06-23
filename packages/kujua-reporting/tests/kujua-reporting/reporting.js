var utils = require('kujua-reporting/utils'),
    moment = require('moment');

var db = require('db').current().guessCurrent();
var getBaseURL = function(url) {
    return '/'+db.db+'/_design/'+db.design_doc+'/_rewrite/'+url;
};

/****************************
 * utils.dateToMonthStr
 */
exports['utils.dateToMonthStr - return non-zero indexed string.'] = function(test) {
    test.expect(1);
    var date = new Date(2011, 9);
    test.strictEqual(utils.dateToMonthStr(date), '2011-10');
    test.done();
};

exports['utils.dateToMonthStr - accepts moment or Date'] = function(test) {
    test.expect(2);
    var date = moment(new Date(2011, 9));
    test.strictEqual(utils.dateToMonthStr(date), '2011-10');
    date = new Date(2011, 9);
    test.strictEqual(utils.dateToMonthStr(date), '2011-10');
    test.done();
};

exports['utils.dateToWeekStr - accepts moment or Date'] = function(test) {
    //todo
    test.expect(0);
    test.done();
};

/****************************
 * utils.getDates
 *
 * Check list property on dates object.  It should have a list of dates
 * that corresponds to the records we are querying for. The list begins with
 * the previous/last month.
 */
exports['getDates list - no query params'] = function (test) {
    var q = {};
    var now = moment();
    var copy = moment(new Date(now.year(), now.month(), 2));
    var dates = utils.getDates(q);
    var expected = [
        copy.clone().subtract('months',1),
        copy.clone().subtract('months',2),
        copy.clone().subtract('months',3)
    ];
    test.expect(4);
    test.strictEqual(dates.list.length, 3);
    test.same(dates.list[0].valueOf(), expected[0].valueOf());
    test.same(dates.list[1].valueOf(), expected[1].valueOf());
    test.same(dates.list[2].valueOf(), expected[2].valueOf());
    test.done();
};

/*
 *  reporting_freq: weekly
 *  query string: {}
 */
exports['getDates returns reporting_freq of week given weekly param'] = function (test) {
    var dates = utils.getDates({}, 'weekly');
    test.equal(dates.reporting_freq, 'week');
    test.done();
};

/*
 *  reporting_freq: undefined
 *  query string: {}
 */
exports['getDates returns reporting_freq of month given undefined param'] = function (test) {
    var dates = utils.getDates({});
    test.equal(dates.reporting_freq, 'month');
    test.done();
};


/*
 *  reporting_freq: month
 *  query string: {startmonth:'2011-8', quantity:3}
 */
exports['getDates list - month/startmonth/quantity:3'] = function (test){
    var q = {startmonth:'2011-8', quantity:3};
    var dates = utils.getDates(q);
    test.expect(4);
    test.strictEqual(dates.list.length, 3);
    //js date months are zero-indexed
    test.same(dates.list[0].valueOf(), new Date(2011,6,2).valueOf());
    test.same(dates.list[1].valueOf(), new Date(2011,5,2).valueOf());
    test.same(dates.list[2].valueOf(), new Date(2011,4,2).valueOf());
    test.done()
};

/*
 *  reporting_freq: month
 *  query string: {startmonth:'2011-8', quantity:12}
 */
exports['getDates list - month/startmonth/quantity:12'] = function (test){
    var q = {startmonth:'2011-8', quantity:12};
    var dates = utils.getDates(q);
    test.expect(3);
    test.strictEqual(dates.list.length, 12);
    test.same(dates.list[0].valueOf(), new Date(2011,6,2).valueOf());
    test.same(dates.list[11].valueOf(), new Date(2010,7,2).valueOf());
    test.done()
};

/*
 *  reporting_freq: week
 *  query string: {time_unit: 'week'}
 */
exports['getDates - week/week'] = function (test) {
    test.expect(3);
    var dates = utils.getDates({time_unit: 'week'}, 'week');
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'week');
    test.equal(dates.reporting_freq, 'week');
    test.done();
}

/*
 *  reporting_freq: week
 *  query string: {time_unit: 'month'}
 */
exports['getDates - week/month'] = function (test) {
    test.expect(3);
    var now = new Date();
    var date = moment(new Date(now.getFullYear(), now.getMonth(), 2));
    var dates = utils.getDates({time_unit: 'month'}, 'week');
    test.equal(dates.list.length, 13);
    test.equal(dates.list[0].valueOf(), date.valueOf());
    test.equal(dates.list[12].valueOf(), date.subtract('weeks', 12).valueOf());
    test.done();
}

/*
 *  reporting_freq: week
 *  query string: {time_unit: 'month', startmonth: '2011-4'}
 */
exports['getDates - week/month/startmonth'] = function (test) {
    test.expect(3);
    var date = moment(new Date(2011, 3, 2));
    var q = {time_unit: 'month', startmonth: '2011-4'};
    var dates = utils.getDates(q, 'week');
    test.equal(dates.list.length, 13);
    test.equal(dates.list[0].valueOf(), date.valueOf());
    test.equal(dates.list[12].valueOf(), date.subtract('weeks', 12).valueOf());
    test.done();
}

/*
 *  reporting_freq: week
 *  query string: {time_unit: 'quarter'}
 */
exports['getDates - week/quarter'] = function (test) {
    test.expect(1);
    var now = new Date();
    var dates = utils.getDates({time_unit: 'quarter'}, 'week');
    test.equal(dates.list.length, 26);
    test.done();
}

/*
 *  reporting_freq: week
 *  query string: {time_unit: 'year'}
 */
exports['getDates - week/year'] = function (test) {
    test.expect(1);
    var now = new Date();
    var dates = utils.getDates({time_unit: 'year'}, 'week');
    test.equal(dates.list.length, 104);
    test.done();
}

/*
 *  query string: {time_unit: 'week'}
 *  week time units can't be represented with monthly reports
 */
exports['getDates - time_unit:week'] = function (test) {
    test.expect(2);
    var now = new Date();
    var dates = utils.getDates({time_unit: 'week'});
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'month');
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {time_unit: 'week'}
 *  week time units can't be represented with monthly reports
 */
exports['getDates - month/time_unit:week'] = function (test) {
    test.expect(2);
    var now = new Date();
    var dates = utils.getDates({time_unit: 'week'}, 'month');
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'month');
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {time_unit: 'month'}
 */
exports['getDates - month/month'] = function (test) {
    test.expect(5);
    var now = moment(new Date());
    var copy = moment(new Date(now.year(), now.month(), 2));
    var dates = utils.getDates({time_unit: 'month'}, 'month');
    test.equal(dates.list.length, 3);
    test.equal(dates.time_unit, 'month');
    test.equal(dates.list[0].valueOf(), copy.clone().subtract('months',1).valueOf());
    test.equal(dates.list[1].valueOf(), copy.clone().subtract('months',2).valueOf());
    test.equal(dates.list[2].valueOf(), copy.clone().subtract('months',3).valueOf());
    test.done();
}

exports['interprets "weekly" reporting_freq as by week'] = function(test) {
    var dates = utils.getDates({
        time_unit: 'month'
    }, 'weekly');

    test.equals(dates.reporting_freq, 'week');
    test.done();
}

exports['interprets "monthly" reporting_freq as by month'] = function(test) {
    var dates = utils.getDates({
        time_unit: 'month'
    }, 'month');

    test.equals(dates.reporting_freq, 'month');
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {time_unit: 'month', quantity: 6}
 */
exports['getDates - month/month/quantity:6'] = function (test) {
    test.expect(1);
    var dates = utils.getDates({time_unit: 'month', quantity: 6}, 'month');
    test.equal(dates.list.length, 6);
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {time_unit: 'quarter'}
 */
exports['getDates - month/quarter'] = function (test) {
    test.expect(1);
    var dates = utils.getDates({time_unit: 'quarter'}, 'month');
    test.equal(dates.list.length, 6);
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {time_unit: 'quarter', quantity: 3}
 */
exports['getDates - month/quarter/quantity:3'] = function (test) {
    test.expect(3);
    // selected/reporting time unit is quarter and reporting freq is month and quarters is 3
    var now = moment(new Date());
    var copy = moment(new Date(now.year(), now.month(), 2));
    var dates = utils.getDates({time_unit: 'quarter', quantity: 3}, 'month');
    test.equal(dates.list.length, 9);
    test.equal(dates.list[0].valueOf(), copy.clone().subtract('months',1).valueOf());
    test.equal(dates.list[8].valueOf(), copy.clone().subtract('months',9).valueOf());
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {time_unit: 'year'}
 */
exports['getDates - time_unit:year'] = function (test) {
    test.expect(1);
    // selected/reporting time unit is year, return 24 months
    var dates = utils.getDates({time_unit: 'year'});
    test.equal(dates.list.length, 24);
    test.done();
}

/*
 *  reporting_freq: month
 *  query string: {}
 */
exports['getDates - month, no reporting freq'] = function (test) {
    test.expect(1);
    var dates = utils.getDates({}, 'month');
    test.equal(dates.list.length, 3);
    test.done();
}

/****************************
 * utils.getReportingViewArgs
 *
 *  query: {quantity: 1}
 *
 *  example view params for Apr 2013:
 *    {
 *      "startkey": [ "TEST", 2013, 4 ],
 *      "endkey": [ "TEST", 2013, 3 ],
 *      "descending": true
 *    }
 *
 *  descending is true so we are fetching latest records first, startkey is not
 *  included in results, results begin with previous or last month. also
 *  remember js is using zero-indexed month and reports/view results are
 *  1-indexed months.
 *
 */
exports['utils.getReportingViewArgs -- no startmonth'] = function(test) {
    test.expect(3);
    var now = moment();
    var end = now.clone().subtract('months',1);
    var expect = {
        startkey: ['TEST', now.year(), now.month()+1, {}],
        endkey: ['TEST', end.year(), end.month()+1, ''],
        descending: true
    };
    var q = {quantity: 1, form: 'TEST'};
    var dates = utils.getDates(q);
    var args = utils.getReportingViewArgs(dates);

    test.same(args.startkey, expect.startkey);
    test.same(args.endkey, expect.endkey);
    test.same(args.descending, expect.descending);
    test.done();
};

exports['utils.getReportingViewArgs -- startmonth is January'] = function(test) {
    test.expect(3);
    var q = {quantity:1, startmonth:'2011-1', form:'TEST'};
    var expect = {
        startkey: ['TEST', 2011, 1, {}],
        endkey: ['TEST', 2010, 12, ''],
        descending: true
    };
    var dates = utils.getDates(q);
    var args = utils.getReportingViewArgs(dates);
    test.same(args.startkey, expect.startkey);
    test.same(args.endkey, expect.endkey);
    test.same(args.descending, expect.descending);
    test.done();
};

exports['utils.getReportingViewArgs -- startmonth is August and 6 months prior'] = function(test) {
    test.expect(3);
    var q = {startmonth:'2011-8', quantity:'6', form:'TEST'};
    var expect = {
        startkey: ['TEST', 2011, 8, {}],
        endkey: ['TEST', 2011, 2, ''],
        descending: true
    };
    var dates = utils.getDates(q);
    var args = utils.getReportingViewArgs(dates);
    test.same(args.startkey, expect.startkey);
    test.same(args.endkey, expect.endkey);
    test.same(args.descending, expect.descending);
    test.done();
};

/****************************
 * reporting.getRows
 */
exports['reporting.getRows - three months'] = function (test) {
    test.expect(8);
    var q = {startmonth:'2011-10', quantity:3, form:'TEST'},
        dates = utils.getDates(q);

    var facilities = [
        {
            "key": [ "325710", "947322", "b3f150", "Zomba", "Chamba", "Example clinic 4" ],
            "value": 1
        },
        {
            "key": [ "325710", "947322", "b3fddd", "Zomba", "Chamba", "Example clinic 5" ],
            "value": 1
        },
        {
            "key": [ "325710", "947322", "b40cd2", "Zomba", "Chamba", "Example clinic 6" ],
            "value": 1
        },
        {
            "key": [ "325710", "947f3d", "b42c21", "Zomba", "Chipini", "Example clinic 9" ],
            "value": 1
        },
        {
            "key": [ "325710", "947f3d", "b42ffc", "Zomba", "Chipini", "Example clinic 10" ],
            "value": 1
        }
    ];

    var reports = [
        {
            "id": "d346ca",
            "key": [ 'TEST', 2011, 7, "325710", "947322", "b3cb78" ],
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
            "key": [ 'TEST', 2011, 7, "325710", "947322", "b3d96d" ],
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
            "key": [ 'TEST', 2011, 7, "325710", "947322", "b3e84e" ],
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

    var expected = [
      {
        "id": "947f3d",
        "name": "Chipini",
        "records": [
          {
            "year": 2011,
            "not_submitted": true,
            "month": 9,
            "name": "September 2011"
          },
          {
            "year": 2011,
            "not_submitted": true,
            "month": 8,
            "name": "August 2011"
          },
          {
            "year": 2011,
            "not_submitted": true,
            "month": 7,
            "name": "July 2011"
          }
        ],
        "clinics": [ "b42c21", "b42ffc" ],
        "valid": 0,
        "valid_percent": 0
      },
      {
        "id": "947322",
        "name": "Chamba",
        "records": [
          {
            "year": 2011,
            "not_submitted": true,
            "month": 9,
            "name": "September 2011"
          },
          {
            "year": 2011,
            "not_submitted": true,
            "month": 8,
            "name": "August 2011"
          },
          {
            "id": "d346ca",
            "clinic": {
              "id": "b3cb78",
              "name": "Example clinic 1"
            },
            "month": 7,
            "month_pp": "July",
            "year": 2011,
            "reporter": "Example reporter",
            "reporting_phone": "0123456789",
            "is_valid": true,
            "name": "July 2011",
            "week_number": undefined
          },
          {
            "id": "d3916d",
            "clinic": {
              "id": "b3d96d",
              "name": "Example clinic 2"
            },
            "month": 7,
            "month_pp": "July",
            "year": 2011,
            "reporter": "Example reporter",
            "reporting_phone": "0123456789",
            "is_valid": true,
            "name": "July 2011",
            "week_number": undefined
          },
          {
            "id": "d3ece6",
            "clinic": {
              "id": "b3e84e",
              "name": "Example clinic 3"
            },
            "month": 7,
            "month_pp": "July",
            "year": 2011,
            "reporter": "Example reporter",
            "reporting_phone": "0123456789",
            "is_valid": true,
            "name": "July 2011",
            "week_number": undefined
          }
        ],
        "clinics": [
          "b3f150",
          "b3fddd",
          "b40cd2"
        ],
        "valid": 3,
        "valid_percent": 33
      }
    ];

    var rows = utils.getRows(facilities, reports, dates);

    test.same(rows.length, expected.length);
    test.same(rows[0], expected[0]);
    test.same(rows[1].records[0], expected[1].records[0]);
    test.same(rows[1].records[1], expected[1].records[1]);
    test.same(rows[1].records[2], expected[1].records[2]);
    test.same(rows[1].records[3], expected[1].records[3]);
    test.same(rows[1].records[4], expected[1].records[4]);
    test.same(rows[1], expected[1]);
    test.done();
};

/****************************
 * reporting.getRowsHC
 */

exports['reporting.getRowsHC - three months'] = function (test) {

    test.expect(59);

    var q = {startmonth:'2011-10', quantity:3, form:'TEST'},
        dates = utils.getDates(q);

    var reports = [
        {
            "id": "d56252",
            "key": [ 'TEST', 2011, 7, "325710", "947f3d", "b42c21" ],
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
            "key": [ 'TEST', 2011, 8, "325710", "947f3d", "b42c21" ],
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
            "key": [ 'TEST', 2011, 8, "325710", "947f3d", "b42ffc" ],
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

/*
 *  query: {startmonth:'2011-10', months:3},
 *  3 records that begin with previous month (9)
 */
exports['reporting.getRowsHC - rows are 1-indexed months'] = function (test) {

    test.expect(3);

    var q = {startmonth:'2011-10', quantity:3},
        dates = utils.getDates(q),
        reports = [];

    var facilities = {
        "rows":[
            {"key":["325710","947f3d","b42c21","Zomba","Chipini","Example clinic 9"],"value":1}
        ]
    };

    var rows = utils.getRowsHC(facilities, reports, dates);

    test.same(rows[0].records[0].month, 9);
    test.same(rows[0].records[1].month, 8);
    test.same(rows[0].records[2].month, 7);
    test.done();
};

exports['reporting.getRowsHC - rows are 1-indexed weeks'] = function (test) {

    test.expect(4);

    var q = {startmonth:'2012-3'},
        dates = utils.getDates(q, 'week'),
        reports = [];

    var facilities = {
        "rows":[
            {"key":["325710","947f3d","b42c21","Zomba","Chipini","Example clinic 9"],"value":1}
        ]
    };

    var rows = utils.getRowsHC(facilities, reports, dates),
        row = rows[0];

    test.equals(row.records.length, 13);
    test.same(row.records[0].week_number, 9);
    test.same(row.records[8].week_number, 1);
    test.same(row.records[9].week_number, 53);
    test.done();
};

/****************************
 * utils.processNotSubmitted
 */
exports['utils.processNotSubmitted -- check january'] = function (test) {
    test.expect(6);

    var q = {startmonth:'2011-1', quantity:3, form:'TEST'},
        dates = utils.getDates(q);

    var rows = [{
        "id": "89436d0828ead00d7745d0ed580d0455",
        "name": "Example clinic 48",
        "records": []
    }];

    utils.processNotSubmitted(rows, dates);

    test.strictEqual(rows[0].records[0].month, 12);
    test.strictEqual(rows[0].records[0].name, "December 2010");

    test.strictEqual(rows[0].records[1].month, 11);
    test.strictEqual(rows[0].records[1].name, "November 2010");

    test.strictEqual(rows[0].records[2].month, 10);
    test.strictEqual(rows[0].records[2].name, "October 2010");
    test.done()
};

exports['utils.processNotSubmitted -- missing two months'] = function (test){

    test.expect(7);

    var q = {startmonth:'2011-10', quantity:3, form:'TEST'};
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
                "month": 9,
                "month_pp": "September 2011",
                "year": 2011,
                "reporter": "Example reporter",
                "reporting_phone": "0123456789"
            }
        ]
    }];

    utils.processNotSubmitted(rows, dates);

    // there should only be a total of three records after processing
    test.strictEqual(rows[0].records.length, 3);

    /* new records should have been added in the right order */
    test.strictEqual(rows[0].records[0].month, 9);
    test.strictEqual(rows[0].records[1].month, 8);
    test.strictEqual(rows[0].records[2].month, 7);

    /*
     * not_submitted property should be set to true on non-existing records and
     * undefined otherwise.  submitted record does not have a not_submitted
     * property
     * */
    test.strictEqual(rows[0].records[0].not_submitted, undefined);
    test.strictEqual(rows[0].records[1].not_submitted, true);
    test.strictEqual(rows[0].records[2].not_submitted, true);

    test.done();
};

/****************************
 * reporting.getTotals
 * combines the above to get reporting rate numbers
 */

/*
 *  query: {startweek:'2012-34', weeks:3, time_unit:'week', form:'TEST'},
 */
exports['reporting.getTotals - weekly time unit and frequency'] = function (test) {
    test.expect(1);
    var q = {startweek:'2012-34', quantity:3, time_unit:'week', form:'TEST'},
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
    var q = {startmonth: '2012-08', quantity: 3, form:'TEST'},
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
    var q = {startmonth:'2011-10', quantity:3, form:'TEST'},
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
            "key": [ 2011, 8, "325710", "947f3d", "b42ffc" ],
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

