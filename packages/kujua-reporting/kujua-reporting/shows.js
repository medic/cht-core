var db = require('db'),
    utils = require('./utils'),
    //dust = require('./dust-core'),
    dust = require('./dust-helpers'),
    kutils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    appname = require('settings/root').name,
    charts = require('./ui/charts'),
    session = require('session'),
    appinfo = require('views/lib/appinfo');


var facility_doc,
    dates,
    isAdmin,
    isDistrictAdmin,
    userDistrict;

var getViewReports = function(doc, dates, callback) {
    var args = utils.getReportingViewArgs(dates),
        view = 'data_records_by_form_year_month_facility';

    if (dates.reporting_freq === 'week') {
        view = 'data_records_by_form_year_week_facility';
    }

    db.getView(appname, view, args, function(err, data) {
        if (err) {
            callback(
                'Error: '+ err + '\n' + 'Args: ' + JSON.stringify(args)
            );
            return;
        }
        // additional filtering for this facility
        var saved_data = [];
        var idx = doc.type === 'health_center' ? 4 : 3;
        for (var i in data.rows) {
            if (doc._id === data.rows[i].key[idx]) {
                // keep orig ordering
                saved_data.unshift(data.rows[i]);
            }
        }
        callback(null,saved_data);
    });
};

/*
 * Return data from couch view with some filtering.  Allows you to pass in a
 * facility doc and get related facility data.
 */
var getViewChildFacilities = function(doc, callback) {
    var startkey = [],
        endkey = [],
        view = 'total_clinics_by_facility',
        args = {
            group: true
        };

    if (doc.type === 'district_hospital') {
        // filter on district
        startkey.push(doc._id);
        endkey.push(doc._id, {}); // {} couchdb endkey trick
    } else if (doc.type === 'health_center') {
        // filter on health center
        startkey.push(doc.parent._id, doc._id);
        endkey.push(doc.parent._id, doc._id, {});
    } else {
        throw new Error('Doc not currently supported.');
    }

    args.startkey = startkey;
    args.endkey = endkey;

    db.getView(appname, view, args, function(err, data) {
        if (err) {
            callback(err);
        } else {
            callback(null, data);
        }
    });

};

/*
 *  Given a facility doc exec a callback with view data of doc ids and
 *  names of sibling facilities.
 */
var getViewSiblingFacilities = function(doc, callback) {

    var args = {startkey: [], endkey: []};

    if (!doc.type) {
        throw new Error('Doc without type attribute not supported.');
    }

    args.startkey.push(doc.type, doc.parent._id);
    args.endkey.push(doc.type, doc.parent._id, {}); // {} couchdb endkey trick

    db.getView(appname, 'facilities_by_parent', args, function(err, data) {
        if (err) { return alert(err); }
        callback(data);
    });

};

var renderRelatedFacilities = function(doc, selector) {
    selector = selector || '#facilities_related';
    var related = [];
    var appendRelated = function(d) {
        var p = d.related_entities ? d.related_entities.clinic : d.parent;
        if(p && p.name) {
            related.push({
                title: utils.viewHeading(p.type),
                name: p.name
            });
            if (p.parent) {
                appendRelated(p);
            }
        }
    };
    appendRelated(doc);
    $(selector).html(
        render('kujua-reporting/facilities_related.html', {
            related: related
        })
    );

};

var renderReportingTotals = function(totals, doc) {

    if (doc.type === 'health_center') {
        $('#totals h4').each(function(i,el) {
            switch (i) {
                case 0: $(el).text(Object.keys(totals.clinics).length);
                        break;
                case 1: $(el).text(totals.complete);
                        break;
                case 2: $(el).text(totals.not_submitted);
                        break;
                case 3: $(el).text(totals.incomplete);
                        break;
            }
        });
    } else {
        $('#totals h4').each(function(i,el) {
            switch (i) {
                case 0: $(el).text(Object.keys(totals.health_centers).length);
                        break;
                case 1: $(el).text(Object.keys(totals.clinics).length);
                        break;
                case 2: $(el).text(totals.not_submitted);
                        break;
                case 3: $(el).text(totals.incomplete);
                        break;
            }
        });
    }

    $('#totals .chart .chartwrapper').html('');

    var chart = charts.pie(
        [totals.incomplete, totals.not_submitted, totals.complete],
        {selector: '#totals .chart .chartwrapper',
         cx: 110,
         cy: 150,
         radius: 100,
         labels: [totals.incomplete_percent+'%',
                  totals.not_submitted_percent+'%',
                  totals.complete_percent+'%'],
         fill: ['#CA410B', '#CBCBCB', '#8EB51C']});

    var popup = null;

    var closePopup = function (ev) {
        if (popup) {
            popup.uPopup('destroy', function () {
                popup = null;
            });
        }
    };

    var closePopupIfOutside = function (ev) {
        var toElementIsSvgPath = $(ev.toElement).parents('svg').length > 0;
        var toElementIsPopup = $(ev.toElement).parents('.upopup').length > 0;

        if(!toElementIsSvgPath && !toElementIsPopup) {
            closePopup();
        }
    };

    var drawPopup = function (ev, elt, selector) {
        var inner_elt = $('#popup-' + selector);

        if (popup) {
            popup.uPopup('recalculate', { eventData: ev });
        } else {
            popup = $('#popup-base').uPopup('create', elt, {
                eventData: ev,
                useCorners: false,
                invertPlacement: true,
                cssClasses: 'upopup-square'
            });
        }

        $('.upopup').unbind('mouseout');
        $('.upopup').bind('mouseout', closePopupIfOutside);

        popup.html(inner_elt.clone(true));
        $('.count', popup).html(totals[selector]);

        $('.percent', popup).html(
            $(elt).next('text').find('tspan').text()
        );
    };

    $('body').bind('click', closePopup);
    $('svg').bind('mouseout', closePopupIfOutside);

    $('svg circle').each(function(i, c) {
        $(c).mousemove(function (ev) {
            var selector;
            _.each(['incomplete', 'not_submitted', 'complete'], function(label) {
                if(totals[label] > 0) {
                    selector = label;
                }
            });
            //drawPopup(ev, c, selector);
        });
    });

    $('svg path').each(function(i, s) {
        $(s).mousemove(function (ev) {
            s = $(s);
            var selector;
            switch (s.prevAll('path').length) {
                case 0:
                    selector = 'incomplete';
                    break;
                case 1:
                    selector = 'not_submitted';
                    break;
                case 2:
                    selector = 'complete';
                    break;
            }
            //drawPopup(ev, s, selector);
        });
    });

};

function registerListeners(reporting_freq) {
    charts.initPieChart();
    $('body').on('click', '[data-page=reporting_rates] #date-nav a', function(e) {
        e.preventDefault();
        var link = $(e.target).closest('a');
        dates = utils.getDates({
            form: link.attr('data-form-code'),
            time_unit: link.attr('data-time-unit'),
            quantity: link.attr('data-quantity'),
            startweek: link.attr('data-startweek'),
            startmonth: link.attr('data-startmonth'),
            startquarter: link.attr('data-startquarter'),
            startyear: link.attr('data-startyear')
        }, reporting_freq);
        getViewChildFacilities(facility_doc, renderReports);
    });
};

function getForms() {
    var def, formName;
    var f = [];
    _.each(sms_utils.info['kujua-reporting'], function(form) {
        def = sms_utils.info.getForm(form.code);
        if (def) {
            f.push(_.extend(form, {
                formName: sms_utils.getFormTitle(form.code)
            }));
        }
    });
    return f;
};

function renderDistrictChoice() {

    var config = getForms();

    db.getView(appname, 'facilities_by_type', {
        startkey: ['health_center'],
        endkey: ['health_center', {}],
        reduce: false,
        include_docs: true
    }, function(err, data) {

        var districts = {};
        _.each(data.rows, function(row) {
            var id = row.doc.parent && row.doc.parent._id;
            if (id && (isAdmin || (isDistrictAdmin && id === userDistrict))) {
                if (!districts[id]) {
                    districts[id] = {
                        id: id,
                        name: row.doc.parent.name,
                        children: [row.doc]
                    };
                } else {
                    districts[id]['children'].push(row.doc);
                }
            }

        });

        // make array for template
        var districts_list = [];
        _.each(districts, function(obj, key) {
            districts_list.push(obj);
        });

        districts_list.sort(function(a, b) {
            if (a.name === b.name) {
                return 0;
            } else {
                return a.name < b.name ? -1 : 1;
            }
        });

    });
}

var renderReports = function(err, facilities) {

    //
    // render record details when a row is clicked
    //
    var onRecordClick = function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var $tr = $(ev.target).closest('tr'),
            id = $tr.attr('rel');;
        // get target el from event context
        var row = $tr.next('.data-record-details'),
            cell = row.children('td'),
            body = cell.html();

        if (body === '') {
            row.show();
            cell.show();
            cell.html('<div class="loading">Loading...</div>');
            db.getDoc(id, function(err, resp) {
                if (err) {
                    var msg = 'Error fetching record with id '+ id +'.  '
                                + 'Try a refresh or check the database connection. '
                                + err;
                    kutils.logger.warn(msg);
                    return alert(msg);
                }
                cell.html(
                    render(
                        "kujua-reporting/data_records_table.html",
                        {data_records: sms_utils.makeDataRecordReadable(resp)}
                    )
                );
            });
        } else {
            row.toggle();
        }
    };

    var doc = facility_doc
        , rows = []
        , template = 'kujua-reporting/facility.html'
        , data_template = 'kujua-reporting/facility_data.html'
        , getReportingData = utils.getRows
        , config = sms_utils.info['kujua-reporting'];

    if (utils.isHealthCenter(doc)) {
        template = 'kujua-reporting/facility_hc.html';
        data_template = 'kujua-reporting/facility_data_hc.html';
        getReportingData = utils.getRowsHC;
    }

    var form_config = _.findWhere(config, {
        code: dates.form
    });
    $('[data-page=reporting_rates] #content').html(
        render(template, {
            doc: doc,
            date_nav: utils.getDateNav(dates, form_config.reporting_freq),
            form: dates.form
        })
    );


    getViewReports(doc, dates, function(err, reports) {
        if (err) {
            kutils.logger.warn(err);
        }
        var totals = utils.getTotals(facilities, reports, dates);
        renderReportingTotals(totals, doc);
        rows = getReportingData(facilities, reports, dates, doc);

        $('#reporting-data').html(
            render(data_template, {
                form: dates.form,
                rows: rows,
                doc: doc
            })
        );

        $('#reporting-data .valid-percent').each(function(i, el) {
            var val = parseInt($(el).text().replace(/%/,''), 10);
            var paper = $(el).children('.mini-pie');
            $(paper).css({'width': '25px', 'height': '25px'});
            var color = Raphael.hsb(val/300, .75, .85);

            if (val === 0) {
                paper.addClass('fa-warning');
            } else if (val == 100) {
                paper.addClass('fa-check');
            } else {
                var chart = charts.pie(
                    [val, 100 - val],
                    {selector: paper.get(0),
                     cx: 12,
                     cy: 12,
                     radius: 12,
                     fill: [color, '#CBCBCB']});
            }
        });

        $('#reporting-data .facility-link').click(function(ev) {
            if ($(ev.target).closest('button').length === 0) {
                ev.preventDefault();
                ev.stopPropagation();
                $(this).toggleClass('expanded')
                    .next('tr')
                    .children('td')
                    .children('div')
                    .slideToggle();
            }
        });


        $('.facility-link:first').addClass('expanded');
        $('.data-records-list div').hide().first().show();

        // bind click on rows that have data
        $('#reporting-data .data-records .data-record[rel]').click(function(e) {
            if ($(e.target).closest('button').length === 0) {
                onRecordClick(e);
            }
        });

        renderRelatedFacilities(doc);

        // only render sibling menu if we are admin and looking at a district
        if (isAdmin || doc.type !== 'district_hospital') {
            // show siblings menu
            $('.nav.facilities').show();

            getViewSiblingFacilities(doc, function(data) {
                $('.nav.facilities .dropdown-menu').html(
                    render('kujua-reporting/siblings-umenu-item.html', {
                        rows: data.rows,
                        form: dates.form
                    })
                );
            });
        }
    });
}

var render = function (name, context) {
    var r = '';
    dust.render(name, context, function (err, result) {
        if (err) {
            throw err;
        }
        r = result;
    });
    return r;
};

var renderFacility = exports.renderFacility = function(form, facility, settings) {

    var reporting_freq;
    _.each(settings['kujua-reporting'], function(conf) {
      if (conf.code === form.code) {
        reporting_freq = conf.reporting_freq;
      };
    });

    // init globals :\
    db = db.current();
    registerListeners(reporting_freq);
    dates = dates || utils.getDates({}, reporting_freq);
    sms_utils.info = appinfo.getAppInfo();

    if (typeof form === 'object') {
        dates.form = form.code;
    } else {
        dates.form = form;
    }
    if (typeof facility === 'object') {
        facility_doc = facility;
        getViewChildFacilities(facility, renderReports);
    } else {
        db.getDoc(facility, function(err, doc) {
            if (err) {
                return console.error(err);
            }
            facility_doc = doc;
            getViewChildFacilities(doc, renderReports);
        });
    }
};
