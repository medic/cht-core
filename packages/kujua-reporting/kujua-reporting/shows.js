var db = require('db'),
    utils = require('./utils'),
    kutils = require('kujua-utils'),
    appname = require('settings/root').name,
    duality = require('duality/core'),
    events = require('duality/events'),
    charts = require('./ui/charts'),
    templates = require('duality/templates');

var getViewReports = function(doc, dates, callback) {
    var args = utils.getReportingViewArgs(dates),
        //view = 'data_records_by_year_month_facility';
        view = 'data_records_by_year_week_facility';

    if (dates.time_unit === 'week') {
        view = 'data_records_by_year_week_facility';
    }

    var appdb = db.use(duality.getDBURL());
    appdb.getView(appname, view, args, function(err, data) {
        if (err) {
            return alert(
                'Error: '+ err + '\n' + 'Args: ' + JSON.stringify(args)
            );
        }
        // additional filtering for this facility
        var saved_data = [];
        var idx = doc.type === 'health_center' ? 3 : 2;
        for (var i in data.rows) {
            if (doc._id === data.rows[i].key[idx]) {
                // keep orig ordering
                saved_data.unshift(data.rows[i]);
            }
        }
        callback(saved_data);
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
        args = {group: true};

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

    var appdb = db.use(duality.getDBURL());
    appdb.getView(appname, view, args, function(err, data) {
        if (err) { return alert(err); }
        callback(data);
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

    var appdb = db.use(duality.getDBURL());
    appdb.getView(appname, 'facilities_by_parent', args, function(err, data) {
        if (err) { return alert(err); }
        callback(data);
    });

};

var renderRelatedFacilities = function(req, doc, selector) {
    selector = selector || '#facilities_related';
    var related = [];
    var appendRelated = function(d) {
        var p = d.related_entities ? d.related_entities.clinic : d.parent;
        if(p) {
            related.push({
                title: utils.viewHeading(p.type),
                url: '/facilities/' + [p._id], //TODO fix facility detail links
                name: p.name
            });
            if (p.parent) { appendRelated(p); }
        }
    };
    appendRelated(doc);
    $(selector).html(
        templates.render('kujua-reporting/facilities_related.html', req, {
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
                case 2: $(el).text(totals.incomplete);
                        break;
                case 3: $(el).text(totals.not_submitted);
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

    var chart = charts.pie(
        [totals.incomplete, totals.not_submitted, totals.complete],
        {selector: '#totals .chart',
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



var facilityReporting = function() {
    return function (doc, req) {
        var dates = utils.getDates(req.query),
            facilities = {},
            rows = [],
            reporting_freq,
            template = 'kujua-reporting/facility.html',
            data_template = 'kujua-reporting/facility_data.html',
            getReportingData = utils.getRows;


        if (utils.isHealthCenter(doc)) {
            template = 'kujua-reporting/facility_hc.html';
            data_template = 'kujua-reporting/facility_data_hc.html';
            getReportingData = utils.getRowsHC;
        }

        events.once('afterResponse', function() {

            var appdb = db.use(duality.getDBURL()),
                setup = $.kansoconfig('kujua-reporting', true);

            kutils.updateTopNav('analytics');

            if(!setup) {
                reporting_freq = 'week';
            } else {
                var data_record_type = setup.data_record_type;
                if (types.data_records[data_record_type].fields.week_number) {
                    reporting_freq = 'week';
                } else {
                    reporting_freq = 'month';
                }
            }

            // override for cdc nepal, TODO solve time unit config problem
            reporting_freq = 'week';

            dates = utils.getDates(req.query, reporting_freq);

            if (utils.isHealthCenter(doc)) {
                var parentURL = utils.getReportingUrl(doc.parent._id, dates);
                $('.health_center .back').attr(
                    'href', duality.getBaseURL() + '/' + parentURL
                );
            }

            // render header
            $('.page-header .container').html(
                templates.render('kujua-reporting/page_header_body.html', req, {
                    doc: doc,
                    is_health_center: (doc.type === 'health_center'),
                    parentURL: parentURL
                })
            );

            $('.page-header .container').addClass('reporting');
            $('body > .container .content').filter(':first').attr('class','content-reporting');

            // render date nav
            $('#date-nav .row').html(
                templates.render('kujua-reporting/date_nav.html', req, {
                    date_nav: utils.getDateNav(dates, reporting_freq),
                    _id: doc._id
                })
            );

            getViewChildFacilities(doc, function(facilities) {
                getViewReports(doc, dates, function(reports) {
                    var totals = utils.getTotals(facilities, reports, dates);
                    renderReportingTotals(totals, doc);
                    rows = getReportingData(
                                facilities, reports, dates, doc);

                    $('#reporting-data').html(
                        templates.render(data_template, req, {
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
                            paper.addClass('icon-remove-sign');
                        } else if (val == 100) {
                            paper.addClass('icon-ok-sign');
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

                    $('#reporting-data .facility-link a').click(function(ev) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        $(this).parents('.facility-link')
                            .toggleClass('expanded')
                                .next('tr').children('td').children('div')
                                    .slideToggle();
                    });

                    $('.facility-link:first').addClass('expanded');
                    $('.data-records-list div').hide().first().show();

                    var openLinkMenu = function(selector) {
                        return function (ev) {
                            var elt = $(selector);
                            if (!elt.parents('.upopup')[0]) {
                                elt.uMenu('create', this, {
                                    vertical: true,
                                    onClick: function (_item_elt) {
                                        document.location.href = (
                                            $(_item_elt).find('a').first().attr('href')
                                        );
                                        return true;
                                    }
                                });
                            }
                        };
                    };

                    $('.change_time_unit_link').bind(
                        'mousedown', openLinkMenu('.change_time_unit_menu')
                    );
                    $('.change_time_unit_link').click(function(ev) {
                        ev.stopPropagation();
                        ev.preventDefault();
                    });

                    renderRelatedFacilities(req, doc);

                    getViewSiblingFacilities(doc, function(data) {
                        $('.controls .dropdown-menu').html(
                            templates.render(
                                'kujua-reporting/siblings-umenu-item.html', req, {
                                    rows: data.rows
                            })
                        );
                    });
                });
            });
        });

        return {
            title: doc.name,
            content: templates.render(template, req, {
                doc: doc,
                type_header: utils.viewHeading(doc.type),
                doc_raw: JSON.stringify(doc, null, 4)
            })
        };
    };
};

/**
 * Reporting rates of a facility
 */
exports.facility_reporting = facilityReporting();

