var _ = require('underscore')._,
    duality = require('duality/core'),
    moment = require('moment'),
    utils = require('kujua-utils');

exports.isClinic = function(doc) {
    if (!doc) { return undefined; }
    return doc.type === 'clinic';
}

exports.isHealthCenter = function(doc) {
    if (!doc) { return undefined; }
    return doc.type === 'health_center';
};

exports.isDistrictHospital = function(doc) {
    if (!doc) { return undefined; }
    return doc.type === 'district_hospital';
};

var isValid = function(report) {

    if (typeof report.is_valid !== 'undefined')
        return report.is_valid

    if (!report)
        return false

    if (_.isArray(report.errors) && report.errors.length === 0)
        return true

    // if we have no errors property then assume report is valid
    if (typeof report.errors === 'undefined')
        return true

    return false
};

exports.viewHeading = function (view) {

    if (!view)
        return '';

    switch (view) {
        case 'clinic':
            return 'Clinic';
        case 'health_center':
            return 'Health Center';
        case 'district_hospital':
            return 'District Hospital';
        case 'national_office':
            return 'National Office';
    }

    return utils.capitalize(view.replace(/_/g, ' '));
};

/**
 * Get the name/representation of the datarecord.
 *
 * @name getName(doc)
 * @param {Object} doc
 * @api public
 */
var getName = exports.getName = function(doc) {

    if (doc.week_number)
        return 'Week ' + doc.week_number + ', ' + doc.year;

    if (typeof doc.month !== 'undefined') {
        var m = doc.month_pp ? doc.month_pp : utils.prettyMonth(doc.month, true);
        return m + ' ' + doc.year;
    }
};


// take a moment or date object and return the week number
var getWeek = function(date) {
    if(date._m)
        return Number(date.format('w'));
    return Number(moment(date).format('w'));
};

// take a moment or date object and return the month number
var getMonth = function(date) {
    return moment(date).month();
};

// take a moment or date object and return the full year number
var getYear = function(date) {
    return moment(date).year();
};

/**
 * Takes a monent or Date object and returns a Date object for the first day on
 * the month previous to it
 */
var nextMonth = exports.nextMonth = function(date) {
    return moment(date).add('months', 1);
};

/**
 * Takes a Date object and returns a Date object for the first day on the month
 * previous to it
 */

var prevMonth = exports.prevMonth = function (date) {
    return moment(date).subtract('months', 1).native();
};


/**
 * Converts a moment object to a year-week string, as used in request parameters
 * and human readable.  eg, Date(2011, 2, 1) -> "2011-6"
 */
exports.dateToWeekStr = function (date) {
    return moment(date).year() + '-' + getWeek(date);
};

/**
 * Converts a Date object to a year-month string, as used in request parameters
 * and human readable.  eg, Date(2011, 9) -> "2011-10"
 */
exports.dateToMonthStr = function (date) {
    date = moment(date);
    var month = date.month(); // zero indexed
    if (month === 0) {
        return date.year() + '-1';
    } else if (month === 11) {
        return date.year() + '-12';
    }
    return date.year() + '-' + (date.month()+1);
};

/**
 * Converts a moment object to a year-quarter string, as used in request parameters
 * and human readable.  eg, Date(2011, 9) -> "2011-3"
 */
exports.dateToQuarterStr = function(date) {
    var month = date.month(),
        quarter;

    if(month >= 0 && month <= 2) {
        quarter = 1;
    }
    if(month >= 3 && month <= 5) {
        quarter = 2;
    }
    if(month >= 6 && month <= 8) {
        quarter = 3;
    }
    if(month >= 9 && month <= 11) {
        quarter = 4;
    }
    return date.year() + '-' + quarter;
};


/**
 * Converts a Date object to a year string, as used in request parameters
 * and human readable.  eg, Date(2011, 9) -> "2011"
 */
exports.dateToYearStr = function(date) {
    return moment(date).format('YYYY');
};

/**
 * Accepts the dates object returned from getDates and the current time unit
 * and creates an object representing the date navigation for the reporting
 * pages.
 */
exports.getDateNav = function (dates) {
    var time_unit = dates.time_unit,
        reporting_freq = dates.reporting_freq;

    // we can only select week as reporting time unit
    // if the data record is supplied weekly
    if(time_unit === 'week' && (!reporting_freq || reporting_freq !== 'week')) {
        time_unit = 'month';
    }

    var presets = {
        week: [
            {query_params: {time_unit: 'week', startmonth: dates.startweek, weeks: 1}, text: 'Last week'},
            {query_params: {time_unit: 'week', startmonth: dates.startweek, weeks: 3}, text: 'Last 3 weeks'},
            {query_params: {time_unit: 'week', startmonth: dates.startweek, weeks: 6}, text: 'Last 6 weeks'},
            {query_params: {time_unit: 'week', startmonth: dates.startweek, weeks: 12}, text: 'Last 12 weeks'}
        ],
        month: [
            {query_params: {time_unit: 'month', startmonth: dates.startmonth, months: 1}, text: 'Last month'},
            {query_params: {time_unit: 'month', startmonth: dates.startmonth, months: 3}, text: 'Last 3 months'},
            {query_params: {time_unit: 'month', startmonth: dates.startmonth, months: 6}, text: 'Last 6 months'},
            {query_params: {time_unit: 'month', startmonth: dates.startmonth, months: 12}, text: 'Last 12 months'}
        ],
        quarter: [
            {query_params: {time_unit: 'quarter', startquarter: dates.startquarter, quarters: 1}, text: 'Last quarter'},
            {query_params: {time_unit: 'quarter', startquarter: dates.startquarter, quarters: 2}, text: 'Last 2 quarters'},
            {query_params: {time_unit: 'quarter', startquarter: dates.startquarter, quarters: 3}, text: 'Last 3 quarters'},
            {query_params: {time_unit: 'quarter', startquarter: dates.startquarter, quarters: 4}, text: 'Last 4 quarters'}
        ],
        year: [
            {query_params: {time_unit: 'year', startyear: dates.startyear, years: 1}, text: 'Last year'},
            {query_params: {time_unit: 'year', startyear: dates.startyear, years: 2}, text: 'Last 2 years'},
            {query_params: {time_unit: 'year', startyear: dates.startyear, years: 3}, text: 'Last 3 years'},
            {query_params: {time_unit: 'year', startyear: dates.startyear, years: 4}, text: 'Last 4 years'}
        ]
    };

    // select preset for current time unit
    var preset = presets[time_unit || 'month'];

    // mark active
    _.each(preset, function (item) {
        if(item.query_params[time_unit + 's'] === dates[time_unit + 's']) {
            item.active = true;
        }
    });

    // format query params hash as url compatible string
    _.each(preset, function(item) {
        item.query_params = _.reduce(item.query_params, function(str, value, key) {
            return str + key + '=' + value + '&';
        }, '');
        item.query_params = item.query_params.slice(0, -1);
    });

    return preset;
};


/**
 * Parses params from the HTTP request and returns object used throughout
 * reporting rates interface.
 *
 * @param {Object} q - parsed request params.
 * @param {String} reporting_freq - 'week' or 'month' default is month.
 * @api public
 */
exports.getDates = function (q, reporting_freq) {
    var now = moment(),
        selected_time_unit = q.time_unit || 'month',
        dates = {},
        list = [];

    if (typeof reporting_freq === 'undefined')
        reporting_freq = 'month';

    var step = reporting_freq + 's';

    // we can only select week as reporting time unit
    // if the data record is supplied weekly
    if(selected_time_unit === 'week' && reporting_freq !== 'week') {
        selected_time_unit = 'month';
    }

    switch(selected_time_unit) {
        case 'week':
            var weeks = (q.weeks ? parseInt(q.weeks, 10) : 3),
                startweek = q.startweek || exports.dateToWeekStr(now),
                date = now,
                range = _.range(weeks);

            _.each(range, function() {
                list.push(moment(date));
                date.subtract(step, 1);
            });

            _.extend(dates, {
                startweek: startweek,
                weeks: weeks
            });

            break;

        case 'month':
            var months = (q.months ? parseInt(q.months, 10) : 3),
                startmonth = q.startmonth || exports.dateToMonthStr(now),
                yearnum = startmonth.split('-')[0],
                // previous month with zero-indexed js month is -2
                monthnum = startmonth.split('-')[1]-2,
                date = moment(new Date(yearnum, monthnum, 2)),
                range = _.range(months);

            if(reporting_freq === 'week') {
                if(!q.startmonth || q.startmonth === exports.dateToMonthStr(now)) {
                    date = now;
                }
                monthnum = startmonth.split('-')[1]-1,
                date = moment(new Date(yearnum, monthnum, 2)),
                range = _.range(Math.round(months * 4.348))
            }

            _.each(range, function() {
                list.push(moment(date));
                date.subtract(step, 1);
            });

            _.extend(dates, {
                startmonth: startmonth,
                months: months
            });

            break;

        case 'quarter':
            var quarters = (q.quarters ? parseInt(q.quarters, 10) : 2),
                startquarter = q.startquarter || exports.dateToQuarterStr(now),
                startmonth = q.startmonth || exports.dateToMonthStr(now),
                yearnum = startquarter.split('-')[0],
                // previous month with zero-indexed js month is -2
                monthnum = startmonth.split('-')[1]-2,
                date = moment(new Date(yearnum, monthnum, 2)),
                range = _.range(quarters * 3);

            if(reporting_freq === 'week') {
                if(!q.startquarter || q.startquarter === exports.dateToQuarterStr(now)) {
                    date = now;
                }
                range = _.range(Math.round(quarters * 3 * 4.348));
            }

            _.each(range, function() {
                list.push(moment(date));
                date.subtract(step, 1);
            });

            _.extend(dates, {
                startquarter: startquarter,
                quarters: quarters
            });

            break;

        case 'year':
            var years = (q.years ? parseInt(q.years, 10) : 2),
                startmonth = q.startmonth || exports.dateToMonthStr(now),
                // previous month with zero-indexed js month is -2
                monthnum = startmonth.split('-')[1]-2,
                startyear = q.startyear || exports.dateToYearStr(now),
                date = moment(new Date(parseInt(startyear, 10), monthnum, 2)),
                range = _.range(years * 12);

            if(reporting_freq  === 'week') {
                if(!q.startyear || q.startyear === exports.dateToMonthStr(now)) {
                    date = now;
                }
                range = _.range(Math.round(years * 12 * 4.348));
            }

            _.each(range, function() {
                list.push(moment(date));
                date.subtract(step, 1);
            });

            _.extend(dates, {
                startyear: startyear,
                years: years
            });

            break;
    }

    _.extend(dates, {
        form: q.form,
        now: now,
        list: list,
        time_unit: selected_time_unit,
        reporting_freq: reporting_freq
    });

    return dates;
};

var totalReportsDue = function(dates) {

    var startdate = nextMonth(dates.list[0]),
        enddate = dates.list[dates.list.length-1],
        result = 0;

    if(dates.time_unit === 'week') {
        var multiply = { weeks: 1, months: 4.348, quarters: 13, years: 52.17 };
        result = Math.round(dates[dates.time_unit + 's'] * multiply[dates.time_unit + 's']);
    } else {
        var multiply = { months: 1, quarters: 3, years: 12 };
        result = dates[dates.time_unit + 's'] * multiply[dates.time_unit + 's'];
        //var result = getWeek(startdate) + Math.abs((startdate.getFullYear() -
        //    enddate.getFullYear()) * 52) - enddate.getWeek();
        if(dates.reporting_freq === 'week')
            return Math.round(result * 4.348);
    }


    return result;
};

/*
 * Return the query param object used to query the data records view in a date
 * range. Note, startkey is not inclusive, hence the call to nextMonth so the
 * requested date range is included in the view results.
 */
exports.getReportingViewArgs = function (dates) {

    var startdate = dates.list[0],
        enddate = dates.list[dates.list.length-1],
        startkey,
        endkey;

    if(dates.reporting_freq === 'week') {
        startkey = [dates.form, startdate.year(), getWeek(startdate)];
        endkey = [dates.form, enddate.year(), getWeek(enddate)];
    } else {
        startdate = nextMonth(startdate);
        startkey = [dates.form, startdate.year(), startdate.month()+1];
        endkey = [dates.form, enddate.year(), enddate.month()+1];
    }

    return {
        startkey: startkey,
        endkey: endkey,
        descending: true
    };
};

var getReportingUrl = exports.getReportingUrl = function(id, dates) {
    return 'reporting/' + dates.form + '/' + id + '?start' + dates.time_unit
            + '=' + dates['start' + dates.time_unit] + '&' + dates.time_unit
            + 's=' + dates[dates.time_unit + 's'] + '&time_unit='
            + dates.time_unit;
};

/**
 * Return rows array of stats on health centers for a district hospital.
 *
 * facilities and reports are data as returned from couchdb. dates is the
 * structure returned from getDates used to render analytics.
 *
 * facilities is already filtered by shows.getViewChildFacilities to only
 * include child data from the facility we are querying.
 */
exports.getRows = function(facilities, reports, dates) {
    var rows = [],
        reporting_freq = dates.reporting_freq;

    if (facilities.rows)
        facilities = facilities.rows;

    var saved = {};
    _.each(facilities, function(f) {
        var id = f.key[1];
        var name = f.key[1+3]; //name is three elements over

        if(!saved[id]) {
            var url = getReportingUrl(id, dates);

            saved[id] = {
                id: id,
                name: name,
                records: [],
                clinics: [],
                valid: 0,
                valid_percent: 0,
                url: url
            };
        }

        saved[id].clinics.push(f.key[2]);
    });

    // push into array
    _.each(saved, function(r, idx) {
        r.id = idx;
        rows.unshift(r);
    });

    // find the matching facility and populate row.clinic array
    _.each(rows, function(row) {
        _.each(reports, function(report) {
            if (report.key[4] === row.id) {
                var is_valid = isValid(report.value);
                var formatted_record = {
                    id: report.id,
                    clinic: {
                        id: report.key[5],
                        name: report.value.clinic
                    },
                    month: report.key[2],
                    month_pp: utils.prettyMonth(report.key[2], true),
                    year: report.key[1],
                    reporter: report.value.reporter,
                    reporting_phone: report.value.reporting_phone,
                    is_valid: is_valid,
                    week_number: report.value.week_number
                };
                formatted_record.name = getName(formatted_record);
                row.records.unshift(formatted_record);
                row.valid += is_valid ? 1 : 0;
            }
        });

        row.valid_percent = Math.round(
            row.valid/(totalReportsDue(dates) * row.clinics.length) * 100);
    });

    processNotSubmitted(rows, dates);

    return _.sortBy(rows, function (r) { return r.valid_percent; });
};

/*
 * Return rows array of clinic data for use in Health Center reporting rates
 * displays. Very similar to getRows, main difference being this
 * function collects data record or report data.
 */
exports.getRowsHC = function(facilities, reports, dates) {
    var rows = [];

    // convenience
    if (facilities.rows) { facilities = facilities.rows; }

    var saved = {};
    for (var i in facilities) {
        var f = facilities[i];
        var id = f.key[2];
        var name = f.key[2+3]; //name is three elements over
        var phone = f.key[6];

        if (!saved[id]) { saved[id] = 1; }
        else { continue; }

        row = {
            id: id,
            name: name,
            phone: phone,
            records: [],
            valid: 0,
            valid_percent: 0
        };

        rows.unshift(row);
    };

    // find the matching facility and populate row.records array.
    _.each(rows, function(row) {
        _.each(reports, function(report) {
            if (report.key[5] === row.id) {
                var is_valid = isValid(report.value);
                var formatted_record = {
                    id: report.id,
                    clinic: {
                        id: report.key[5],
                        name: report.value.clinic,
                    },
                    month: report.key[2],
                    month_pp: utils.prettyMonth(report.key[2], true),
                    year: report.key[1],
                    reporter: report.value.reporter,
                    reporting_phone: report.value.reporting_phone,
                    is_valid: is_valid,
                    week_number: report.value.week_number
                };
                formatted_record.name = getName(formatted_record);
                row.records.unshift(formatted_record);
                row.valid += is_valid ? 1 : 0;
            }

            row.valid_percent = Math.round(row.valid/totalReportsDue(dates) * 100);
        });
    });

    processNotSubmitted(rows, dates);

    return _.sortBy(rows, function (r) { return r.valid_percent; });
};

/*
 * Create record items for months/weeks not submitted.
 */
var processNotSubmitted = exports.processNotSubmitted = function(rows, dates) {

    // assume monthly by default
    var weekly_reports = (dates.reporting_freq === 'week');

    _.each(rows, function(row) {
        var pat = function(str) {
            if (!str)
                return '';
            if(str.toString().length < 2) {
                return '0' + str;
            } else {
                return str;
            }
        };

        var recordByTime = function(obj) {
            if(obj.week_number) {
                return obj.year + '' + pat(obj.week_number);
            } else {
                return obj.year + '' + pat(obj.month);
            }
        };

        var startdate = dates.list[0],
            enddate = dates.list[dates.list.length-1],
            recorded_time_frames = _.map(row.records, recordByTime),
            date = startdate.clone();

        while (date >= enddate) {

            var extra = {},
                url = duality.getBaseURL() + '/add/data_record?clinic=' + row.id,
                val = weekly_reports ? getWeek(date) : getMonth(date)+1;

            var empty_report = {
                year: getYear(date),
                not_submitted: true
            }

            if (weekly_reports) {
                extra.url = url + '&week_number=' + val;
                extra.week_number = val;
            } else {
                extra.url = url + '&month=' + val;
                extra.month = val;
            }


            if (!_.contains(recorded_time_frames, getYear(date) + '' + pat(val))) {
                _.extend(empty_report, extra);
                empty_report.name = getName(empty_report);
                row.records.push(empty_report);
            }

            if (weekly_reports)
                date.subtract('weeks', 1);
            else
                date.subtract('months', 1);

        };

        row.records = _.sortBy(row.records, recordByTime).reverse();

    });
};


exports.getTotals = function(facilities, reports, dates) {

    var t = {
        clinics: {},
        health_centers: {},
        district_hospitals: {},
        complete: 0,
        complete_percent: 0,
        incomplete: 0,
        incomplete_percent: 0,
        not_submitted: 0,
        not_submitted_percent: 0,
        expected_reports: 0
    };

    if (facilities.rows) { facilities = facilities.rows; }

    for (var i in facilities) {
        var f = facilities[i];
        t.district_hospitals[f.key[0]] = f.key[3];
        t.health_centers[f.key[1]] = f.key[4];
        t.clinics[f.key[2]] = f.key[5];
    };

    for (var i in reports) {
        var r = reports[i];
        if (r.value.is_valid) { t.complete++; }
        else { t.incomplete++; }
    };

    t.submitted = t.complete + t.incomplete;

    // TODO does not account for clinic added dates
    t.expected_reports = Object.keys(t.clinics).length * totalReportsDue(dates);

    t.not_submitted = t.expected_reports - t.submitted;
    t.not_submitted_percent = Math.round(
                                t.not_submitted/t.expected_reports * 100);
    t.incomplete_percent = Math.round(t.incomplete/t.expected_reports * 100);
    t.complete_percent = Math.round(t.complete/t.expected_reports * 100);

    var total_percent = t.incomplete_percent + t.not_submitted_percent +
                        t.complete_percent;

    /*
     * percent total should equal 100 unless all the parts are equal,
     * hacktastic
     */
    if (total_percent !== 100 &&
            t.incomplete_percent !==
            t.not_submitted_percent &&
                t.not_submitted_percent !==
                t.complete_percent &&
                    t.incomplete_percent !==
                    t.complete_percent) {
        var remainder = 100 - total_percent;
        if (t.not_submitted_percent > remainder) {
            t.not_submitted_percent += remainder;
        } else if (t.incomplete_percent > remainder) {
            t.incomplete_percent += remainder;
        } else {
            t.complete_percent += remainder;
        }
    }

    return t;
};
