var _ = require('underscore'),
    moment = require('moment');

(function () {

    'use strict';

    var isValid = function(report) {

        if (typeof report.isValid !== 'undefined') {
            return report.isValid;
        }

        if (!report) {
            return false;
        }

        if (_.isArray(report.errors) && report.errors.length === 0) {
            return true;
        }

        // if we have no errors property then assume report is valid
        if (typeof report.errors === 'undefined') {
            return true;
        }

        return false;
    };

    var prettyMonth = function (month, full) {
        var months_short = {
            1:'Jan', 2:'Feb', 3:'Mar', 4:'Apr', 5:'May', 6:'Jun', 7:'Jul', 8:'Aug',
            9:'Sep', 10:'Oct', 11:'Nov', 12:'Dec'
        };
        var months_full = {
            1:'January', 2:'February', 3:'March', 4:'April', 5:'May', 6:'June',
            7:'July', 8:'August', 9:'September', 10:'October', 11:'November',
            12:'December'
        };

        if (full) {
            return months_full[month];
        }
        return months_short[month];
    };

    /**
     * Get the name/representation of the datarecord.
     *
     * @name getName(doc)
     * @param {Object} doc
     * @api public
     */
    var getName = function(doc) {

        if (doc.week_number) {
            return 'Week ' + doc.week_number + ', ' + doc.year;
        }

        if (typeof doc.month !== 'undefined') {
            var m = doc.month_pp ? doc.month_pp : prettyMonth(doc.month, true);
            return m + ' ' + doc.year;
        }
    };


    // take a moment or date object and return the iso week number
    var getWeek = function(date) {
        return moment(date).isoWeek();
    };

    // take a moment or date object and return the iso week year
    // to be used with getWeek()
    var getWeekYear = function(date) {
        return moment(date).isoWeekYear();
    };

    // take a moment or date object and return the month number
    var getMonth = function(date) {
        return moment(date).month();
    };

    /**
     * Takes a monent or Date object and returns a Date object for the first day on
     * the month previous to it
     */
    var nextMonth = function(date) {
        return moment(date).add(1, 'months');
    };

    /**
     * Converts a moment object to a year-week string, as used in request parameters
     * and human readable.  eg, Date(2011, 2, 1) -> "2011-5"
     */
    var dateToWeekStr = function (date) {
        return getWeekYear(date) + '-' + getWeek(date);
    };

    /**
     * Converts a Date object to a year-month string, as used in request parameters
     * and human readable.  eg, Date(2011, 9) -> "2011-10"
     */
    var dateToMonthStr = function (date) {
        date = moment(date);
        var month = date.month(); // zero indexed
        if (month === 0) {
            return date.year() + '-1';
        } else if (month === 11) {
            return date.year() + '-12';
        }
        return date.year() + '-' + (date.month() + 1);
    };

    /**
     * Converts a moment object to a year-quarter string, as used in request parameters
     * and human readable.  eg, Date(2011, 9) -> "2011-3"
     */
    var dateToQuarterStr = function(date) {
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
    var dateToYearStr = function(date) {
        return moment(date).format('YYYY');
    };

    /**
     * Parses params from the HTTP request and returns object used throughout
     * reporting rates interface.
     *
     * @param {Object} q - Options
     * @api public
     */
    exports.getDates = function (q) {
        var now = moment(),
            selected_time_unit = q.time_unit || 'month',
            reporting_freq = q.reporting_freq,
            dates = {},
            list = [],
            date,
            range,
            startweek,
            weeks,
            monthnum,
            quarters,
            years,
            months,
            yearnum,
            startmonth,
            startquarter,
            startyear;

        if (typeof reporting_freq === 'undefined') {
            reporting_freq = 'month';
        } else if (reporting_freq === 'monthly') {
            reporting_freq = 'month';
        } else if (reporting_freq === 'weekly') {
            reporting_freq = 'week';
        }

        var step = reporting_freq + 's';

        // we can only select week as reporting time unit
        // if the data record is supplied weekly
        if (selected_time_unit === 'week' && reporting_freq !== 'week') {
            selected_time_unit = 'month';
        }

        switch(selected_time_unit) {
            case 'week':
                date = now.clone().subtract(1, 'weeks'); // get last week
                weeks = (q.quantity ? parseInt(q.quantity, 10) : 3);
                startweek = q.startweek || dateToWeekStr(date);
                range = _.range(weeks);

                _.each(range, function() {
                    list.push(moment(date));
                    date.subtract(1, step);
                });

                _.extend(dates, {
                    startweek: startweek,
                    quantity: weeks
                });

                break;

            case 'month':
                months = (q.quantity ? parseInt(q.quantity, 10) : 3);
                startmonth = q.startmonth || dateToMonthStr(now);
                yearnum = startmonth.split('-')[0];
                // previous month with zero-indexed js month is -2
                monthnum = startmonth.split('-')[1]-2;
                range = _.range(months);

                date = moment(new Date(yearnum, monthnum, 2));
                if(reporting_freq === 'week') {
                    if(!q.startmonth || q.startmonth === dateToMonthStr(now)) {
                        date = now;
                    }
                    monthnum = startmonth.split('-')[1]-1;
                    date = moment(new Date(yearnum, monthnum, 2));
                    range = _.range(Math.round(months * 4.348));
                }

                _.each(range, function() {
                    list.push(moment(date));
                    date.subtract(1, step);
                });

                _.extend(dates, {
                    startmonth: startmonth,
                    quantity: months
                });

                break;

            case 'quarter':
                quarters = (q.quantity ? parseInt(q.quantity, 10) : 2);
                startquarter = q.startquarter || dateToQuarterStr(now);
                startmonth = q.startmonth || dateToMonthStr(now);
                yearnum = startquarter.split('-')[0];
                // previous month with zero-indexed js month is -2
                monthnum = startmonth.split('-')[1]-2;
                range = _.range(quarters * 3);
                date = moment(new Date(yearnum, monthnum, 2));

                if(reporting_freq === 'week') {
                    if(!q.startquarter || q.startquarter === dateToQuarterStr(now)) {
                        date = now;
                    }
                    range = _.range(Math.round(quarters * 3 * 4.348));
                }

                _.each(range, function() {
                    list.push(moment(date));
                    date.subtract(1, step);
                });

                _.extend(dates, {
                    startquarter: startquarter,
                    quantity: quarters
                });

                break;

            case 'year':
                years = (q.quantity ? parseInt(q.quantity, 10) : 2);
                startmonth = q.startmonth || dateToMonthStr(now);
                // previous month with zero-indexed js month is -2
                monthnum = startmonth.split('-')[1]-2;
                startyear = q.startyear || dateToYearStr(now);
                range = _.range(years * 12);
                date = moment(new Date(parseInt(startyear, 10), monthnum, 2));

                if(reporting_freq  === 'week') {
                    if(!q.startyear || q.startyear === dateToMonthStr(now)) {
                        date = now;
                    }
                    range = _.range(Math.round(years * 12 * 4.348));
                }

                _.each(range, function() {
                    list.push(moment(date));
                    date.subtract(1, step);
                });

                _.extend(dates, {
                    startyear: startyear,
                    quantity: years
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

        var multiply,
            result;

        if( dates.time_unit === 'week') {
            multiply = { week: 1, month: 4.348, quarter: 13, year: 52.17 };
            return Math.round(dates.quantity * multiply[dates.time_unit]);
        }
        multiply = { month: 1, quarter: 3, year: 12 };
        result = dates.quantity * multiply[dates.time_unit];
        if (dates.reporting_freq === 'week') {
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
        var startdate = _.first(dates.list),
            enddate = _.last(dates.list),
            startkey = [dates.form],
            endkey = [dates.form];

        if (dates.reporting_freq === 'week') {
            startkey.push(getWeekYear(startdate));
            startkey.push(getWeek(startdate));
            endkey.push(getWeekYear(enddate));
            endkey.push(getWeek(enddate));
        } else {
            startdate = nextMonth(startdate);
            startkey.push(startdate.year());
            startkey.push(startdate.month() + 1);
            endkey.push(enddate.year());
            endkey.push(enddate.month() + 1);
        }
        startkey.push({});
        endkey.push('');

        return {
            startkey: startkey,
            endkey: endkey,
            descending: true
        };
    };

    function countValid(rows, dates, forClinics) {
        _.each(rows, function(row) {
            var seen = {},
                count = totalReportsDue(dates);

            if (forClinics) {
                count *= row.clinics.length;
            }

            row.valid = 0;

            _.each(row.records, function(record) {
                var clinicId = record.clinicId,
                    key = (record.month || record.week_number) + '-' + record.year;

                seen[clinicId] = seen[clinicId] || {};
                if (!seen[clinicId][key]) {
                    seen[clinicId][key] = true;
                    row.valid += record.is_valid ? 1 : 0;
                }
            });

            row.valid_percent = Math.round(row.valid / count * 100);
        });
    }

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
        var rows = [];

        if (facilities.rows) {
            facilities = facilities.rows;
        }

        var saved = {};
        _.each(facilities, function(f) {
            var id = f.key[1];
            var name = f.key[1+3]; //name is three elements over

            if(!saved[id]) {
                saved[id] = {
                    id: id,
                    name: name,
                    records: [],
                    clinics: [],
                    valid: 0,
                    valid_percent: 0
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
                if (report.value.healthCenterId === row.id) {
                    var is_valid = isValid(report.value);
                    var formatted_record = {
                        id: report.id,
                        clinicId: report.value.clinicId,
                        month: report.value.month,
                        month_pp: prettyMonth(report.value.month, true),
                        year: report.key[1],
                        is_valid: is_valid,
                        week_number: report.value.weekNumber
                    };
                    formatted_record.name = getName(formatted_record);
                    row.records.unshift(formatted_record);
                }
            });
        });

        countValid(rows, dates, true);

        processNotSubmitted(rows, dates);

        return _.sortBy(rows, function (r) { 
            return r.valid_percent; 
        });
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
        _.each(facilities, function(f) {
            var id = f.key[2];

            if (!saved[id]) {
                var name = f.key[2+3]; //name is three elements over
                var phone = f.key[6];
                saved[id] = 1; 

                rows.unshift({
                    id: id,
                    name: name,
                    phone: phone,
                    records: [],
                    valid: 0,
                    valid_percent: 0
                });
            }
        });

        // find the matching facility and populate row.records array.
        _.each(rows, function(row) {
            _.each(reports, function(report) {
                if (report.value.clinicId === row.id) {
                    var is_valid = isValid(report.value);
                    var formatted_record = {
                        id: report.id,
                        clinicId: report.value.clinicId,
                        month: report.value.month,
                        month_pp: prettyMonth(report.value.month, true),
                        year: report.key[1],
                        is_valid: is_valid,
                        week_number: report.value.weekNumber
                    };
                    formatted_record.name = getName(formatted_record);
                    row.records.unshift(formatted_record);
                }
            });
        });

        countValid(rows, dates);
        processNotSubmitted(rows, dates);

        return _.sortBy(rows, function (r) { return r.valid_percent; });
    };

    /*
     * Create record items for months/weeks not submitted.
     */
    var processNotSubmitted = function(rows, dates) {

        // assume monthly by default
        var weekly_reports = (dates.reporting_freq === 'week');

        _.each(rows, function(row) {
            var pat = function(str) {
                if (!str) {
                    return '';
                }
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
                    val,
                    year;

                if (weekly_reports) {
                    val = getWeek(date);
                    year = getWeekYear(date);
                    extra.week_number = val;
                } else {
                    val = getMonth(date) + 1;
                    year = date.year();
                    extra.month = val;
                }

                var empty_report = {
                    year: year,
                    not_submitted: true
                };

                if (!_.contains(recorded_time_frames, year + '' + pat(val))) {
                    _.extend(empty_report, extra);
                    empty_report.name = getName(empty_report);
                    row.records.push(empty_report);
                }

                if (weekly_reports) {
                    date.subtract(1, 'weeks');
                } else {
                    date.subtract(1, 'months');
                }
            }

            row.records = _.sortBy(row.records, recordByTime).reverse();

        });
    };


    exports.getTotals = function(facilities, reports, dates) {

        var t = {
            clinics: {},
            health_centers: {},
            district_hospitals: {},
            facilities: 0,
            complete: 0,
            complete_percent: 0,
            incomplete: 0,
            incomplete_percent: 0,
            not_submitted: 0,
            not_submitted_percent: 0,
            expected_reports: 0
        };

        if (facilities.rows) { facilities = facilities.rows; }

        _.each(facilities, function(f) {
            t.district_hospitals[f.key[0]] = f.key[3];
            t.health_centers[f.key[1]] = f.key[4];
            t.clinics[f.key[2]] = f.key[5];
        });

        _.each(reports, function(r) {
            if (r.value.isValid) { t.complete++; }
            else { t.incomplete++; }
        });

        t.submitted = t.complete + t.incomplete;

        // TODO does not account for clinic added dates
        t.health_centers_size = Object.keys(t.health_centers).length;
        t.clinics_size = Object.keys(t.clinics).length;
        t.expected_reports = t.clinics_size * totalReportsDue(dates);

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

}());
