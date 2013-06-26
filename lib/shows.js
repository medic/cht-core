/**
 * Show functions to be exported from the design doc.
 */

var querystring = require('querystring'),
    db = require('db'),
    sha1 = require('sha1'),
    users = require('users'),
    events = require('duality/events'),
    dutils = require('duality/utils'),
    jsonforms  = require('views/lib/jsonforms'),
    objectpath  = require('views/lib/objectpath'),
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    utils = require('kujua-utils'),
    ksutils = require('kujua-sms/utils'),
    cookies = require('cookies'),
    url_util = require('url'),
    logger = utils.logger,
    jsDump = require('jsDump'),
    data_records = require('./data_records'),
    moment = require('moment'),
    _ = require('underscore'),
    settings = require('settings/root'),
    ddoc = settings.name,
    muvuku_webapp_url = '/json-forms/_design/json-forms/_rewrite/?_embed_mode=2',
    district,
    isAdmin,
    isDistrictAdmin;

var cache = {};

function onDownloadFormSubmit(ev) {

    ev.preventDefault();

    var $target = $(ev.currentTarget),
        params = querystring.parse($target.attr('data-query')),
        form = $target.attr('data-form'),
        baseURL = $target.attr('data-url'),
        format = $('#sms-forms-controls [name=format]').val().split(','),
        startVal = $('#startDate > input').val(),
        endVal = $('#endDate > input').val(),
        startkey = JSON.parse(params.startkey),
        endkey = JSON.parse(params.endkey),
        startDate = moment(startVal || undefined), // somewhat funky -- moment doesn't like dates of '' or null :/
        endDate = moment(endVal || undefined),
        url;

    params.kansoconfig = JSON.stringify($.kansoconfig());

    // set reduce to false
    params.reduce = 'false';

    // flip dates if both have values and startDate's after endDate
    if (startVal !== '' && startDate > endDate) {
        endDate = startDate;
        startDate = moment(endVal || undefined);
    }

    // optionally filter by date
    if (startVal !== '') {
        // update endkey for startdate as view is descending
        endkey[3] = startDate.valueOf();
    } else {
        endkey[3] = 0;
    }
    if (endVal !== '') {
        // update startkey for enddate as view is descending
        startkey[3] = endDate.valueOf();
    } else {
        startkey[3] = {};
    }

    params.startkey = JSON.stringify(startkey);
    params.endkey = JSON.stringify(endkey);

    // format is a bit hinky; second in comma separated value
    if (format.length > 1) {
        params.locale = format[1];
    }

    // reconstruct url
    url = baseURL;
    if (form) {
        url += '/' + form + '/';
    } else {
        url += '/form_';
    }
    url += 'data_records.' + format[0] + '?' + querystring.stringify(params);

    console.log(url);

    $(window.location).attr('href', url);
}

var renderDownloadControls = function() {
    $('.page-header .controls').first().html(
        templates.render('sms_forms_controls.html', {}, {})
    ).show();

    // by default limit export to 1 month of previous data
    $('#startDate > input').val(moment().startOf('month').format('YYYY-MM-DD'));
    $('[data-role=datetimepicker]').datetimepicker({
        pickTime: false
    }).on('changeDate', function() {
        $(this).datetimepicker('hide');
    });
};

function renderDownloadForms(err, data) {
    var req = dutils.currentRequest(),
        keys;

    if (err) {
        return alert(err);
    }

    renderDownloadControls();

    keys = _.map(data.rows, function(row) {
        var form = row.key[1];

        return ksutils.getFormTitle(form);
    });
    keys = _.unique(keys);
    keys.sort();

    var forms = _.reduce(data.rows, function(memo, row) {
        var dh_id = row.key[0],
            form = row.key[1],
            dh_name = row.key[2],
            title = '',
            form,
            q,
            index;

        q = db.stringifyQuery({
            startkey: [dh_id, form, dh_name, {}],
            endkey: [dh_id, form, dh_name],
            form: form,
            include_docs: true,
            descending: true,
            dh_name: dh_name
        });

        title = ksutils.getFormTitle(form);

        index = _.indexOf(keys, title);

        if (!memo[index]) {
            memo[index] = {
                districts: [],
                form: form,
                total: 0,
                title: title
            };
        }

        memo[index].districts.push({
            dh_id: dh_id,
            dh_name: dh_name || 'No district',
            title: title,
            total: row.value,
            isAdmin: utils.isUserAdmin(req.userCtx),
            q: querystring.stringify(q)
        });
        memo[index].total += row.value;
        if (!memo[index].q) {
            memo[index].q = querystring.stringify(db.stringifyQuery({
                startkey: [form, true, {}],
                endkey: [form, true, 0],
                form: form,
                include_docs: true,
                descending: true
            }));
        }

        return memo;
    }, []);

    _.each(forms, function(form) {
        form.districts = _.sortBy(form.districts, 'dh_name');
    });

    $('#forms').html(
        templates.render('sms_forms_data.html', {}, {
            forms: forms.length > 0 ? forms : null
        })
    );

    // bind to form download buttons in export screen
    $('#forms form [type=submit]').on('click', onDownloadFormSubmit);
};

var render500 = function(msg, err, doc) {

    if (typeof req === 'undefined') req = {};

    return $('#content').html(
        templates.render("500.html", req, {
            doc: doc,
            msg: msg,
            err: JSON.stringify(err,null,2)
        })
    );
}

exports.sms_forms = function (doc, req) {

    events.once('afterResponse', function() {

        setupContext(req, function(err) {

            if (err) {
                return render500('Failed to setup context.', err, doc);
            }

            var baseURL = require('duality/core').getBaseURL(),
                q = {startkey: [district], endkey: [district,{}], group: true},
                db = require('db').current();

            utils.updateTopNav('sms-forms-data', 'Export');

            // render available downloads based on data available user must
            // either be admin or have associated district to view records
            if (isAdmin)
                q = {group: true}

            if (isAdmin || isDistrictAdmin) {
                db.getView(
                    ddoc,
                    'data_records_valid_by_district_and_form',
                    q,
                    renderDownloadForms);
            } else {
                renderDownloadForms(null, []);
            }
        });

    });

    return {
        title: 'Export',
        info: getAppInfo.apply(this),
        content: templates.render('sms_forms.html', req, {})
    };
};

var renderSMSResponses = function(err, callback) {

    callback = callback || err;

    var $div = $('<div/>'),
        messages = ksutils.getMessagesObject();

    for (var key in messages) {
        var val = messages[key],
            $dl = $('<dl/>');
        for (var k in val) {
            var v = val[k];
            $dl.append($('<dt/>').html(k));
            $dl.append($('<dd/>').html(v));
        }
        $div.append(
            $('<div/>').append($('<h3/>').html(key).after($dl))
        );
    }

    $('#smsresponses + p').after($div);
    callback();
}

/**
 * Centralized some variable initializaiton that is used in most of the
 * views/shows to filter on a user's district or `kujua_facility` value.
 */
var setupContext = function(req, callback) {
    isAdmin = utils.isUserAdmin(req.userCtx);
    isDistrictAdmin = utils.isUserDistrictAdmin(req.userCtx);

    if (!isAdmin && !isDistrictAdmin) {
        // not logged in or roles is not setup right
        $('#content').html(
            templates.render("403.html", req, {})
        );
        $('#dashboard-topbar').on('ready', function(){
            var login_url = $('#dashboard-topbar-session a.login').attr('href');
            $('.page_login').attr('href', login_url);
        });

        return;
    }
    utils.getUserDistrict(req.userCtx, function(err, data) {
        if (err) return callback(err);
        district = data;
        callback();
    });
};
/**
 * This has to run in the shows context for 'this' to work
 */
var getAppInfo = function() {
    var info = {
        muvuku_webapp_url: muvuku_webapp_url
    };
    if (this.app_settings && this.app_settings.muvuku_webapp_url) {
        info.muvuku_webapp_url = this.app_settings.muvuku_webapp_url;
    }
    var muvuku = url_util.parse(info.muvuku_webapp_url, true);
    muvuku.search = null
    muvuku.query.sync_url = require('duality/core').getBaseURL() + '/add';
    info.muvuku_webapp_url = url_util.format(muvuku);

    if (this.kanso && this.kanso.git && this.kanso.git.commit) {
        info.sha = this.kanso.git.commit;
    }


    return info;
}

exports.data_records = function(doc, req) {

    // Avoid binding events here because they will accumulate on each request.
    events.once('afterResponse', function() {
        setupContext(req, function(err) {


            if (err)
                return render500('Failed to setup context.', err);

            utils.updateTopNav('activity');

            data_records.init(req, {
                district: district || req.query.dh_id,
                isAdmin: isAdmin,
                username: req.userCtx && req.userCtx.name
            });
        });
    });

    return {
        title: 'Activity',
        info : getAppInfo.apply(this),
        content: templates.render('loader.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        info: getAppInfo.apply(this),
        content: templates.render('404.html', req, {})
    };
};

var createCell = function(col, val) {
    // wrap td text in dropdown markup and toggle dropdown
    var req = {};
    var td = $('<td/>').html(
        templates.render('spreadsheet_dropdown.html', req, {
            value: val
        })
    );
    return td;
};

var updateCell = function(td, val, items) {
    var req = {};
    $(td).html(
        templates.render('spreadsheet_dropdown.html', req, {
            items: items,
            value: val
        })
    );
};

/*
 * Try to update child facilities for health centers and districts. Recursive
 * case only really applies to districts.
 */
var updateChildFacilities = function(doc) {
    var view = 'facility_by_parent'
        , q = {startkey:[doc._id], endkey:[doc._id, {}], include_docs:true}
        , db = require('db').current();

    if (!doc || !doc.type) return;

    // only act on facilities that might have children
    if (doc.type !== 'health_center' && doc.type !== 'district_hospital')
        return;

    db.getView(ddoc, view, q, function(err, data) {

        if (err)
            return alert('Failed updating child facilities: ' + err);

        for (var i in data.rows) {
            var d = data.rows[i].doc;
            if (d.parent._id === doc._id && d.parent._rev === doc._rev)
                updateChildFacilities(d);
            d.parent = doc;
            db.saveDoc(d, function(err, res) {
                if (err)
                    alert('Failed updating child facilities: ' + err);
            });
            updateChildFacilities(d);
        }
    });
}

exports.clinics = function (doc, req) {
    events.once('afterResponse', function () {

        utils.updateTopNav('facilities');

        var q,
            view;

        setupContext(req, function(err) {
            if (utils.hasPerm(req.userCtx, 'can_edit_any_facility')) {
                view = 'facilities';
                q = {
                    startkey: ['clinic'],
                    endkey: ['clinic', {}],
                    include_docs: true
                };
                q_hc = {
                    startkey: ['health_center'],
                    endkey: ['health_center',{}],
                    include_docs: true
                };
            }
            else if (utils.hasPerm(req.userCtx, 'can_edit_facility')) {
                view = 'facilities_by_district';
                q = {
                    startkey: [district, 'clinic'],
                    endkey: [district, 'clinic', {}],
                    include_docs: true
                };
                q_hc = {
                    startkey: [district, 'health_center'],
                    endkey: [district, 'health_center',{}],
                    include_docs: true
                };
            }
            else {
                // should not display facilities
                $('#content').html(
                    '<p class="facilities_msg">You must be a district or national admin to edit facilities</p>'
                );
                return;
            }

            var db = require('db').current();

            // reload facilities cache
            db.getView(ddoc, view, q_hc, function (err, data) {
                if (err) {
                    return alert(err);
                }
                cache.health_centers = [];
                cache.health_center_names = [];
                _.each(data.rows, function(row) {
                    cache.health_centers.push(row);
                    if(row.value.name) {
                        cache.health_center_names.push(row.value.name);
                    }
                });
            });

            var editSelection = function (td, callback) {
                var val = $(td).find('.dropdown-toggle').text();

                updateCell(td, val, cache.health_center_names);

                // toggle menu
                $(td).find('.dropdown-toggle').trigger('click.dropdown.data-api');

                // on menu item click, save and update cell
                $(td).find('.dropdown-menu a').on('click', function(ev) {
                    ev.preventDefault();
                    var val = $(ev.target).text();
                    $('[data-toggle="dropdown"]').parent().removeClass('open');
                    // triggers the save
                    callback(td, val);
                    // update the cell
                    updateCell(td, val, cache.district_names);
                });
            };

            // render spreadsheet
            db.getView(ddoc, view, q, function (err, data) {
                if (err) {
                    return logger.error(err);
                }
                $('#loader').hide();
                var docs = _.map(data.rows, function (row) {
                    return row.doc;
                });
                $('#facilities').spreadsheet({
                    columns: [
                        {
                            label: $.kansoconfig('Village Name'),
                            property: ['name'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('Clinic Contact Name'),
                            property: ['contact', 'name'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('Clinic Contact Phone'),
                            property: ['contact', 'phone'],
                            type: 'string'
                            //validation: 'phone'
                        },
                        {
                            label: $.kansoconfig('RC Code'),
                            property: ['contact', 'rc_code'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('Health Center'),
                            property: ['parent', 'name'],
                            type: 'string',
                            createCellHandler: createCell,
                            editSelectionHandler: editSelection
                        }
                    ],
                    data: docs,
                    save: function (doc, callback) {
                        // resolve parent object based on name
                        for (var i in cache.health_centers) {
                            var row = cache.health_centers[i];
                            if (doc.parent && row.value.name === doc.parent.name) {
                                doc.parent = row.doc;
                                break;
                            }
                        }
                        db.saveDoc(doc, function (err, res) {
                            if (err) {
                                return callback(err);
                            }
                            doc._rev = res.rev;
                            callback(null, doc);
                        });
                    },
                    create: function (callback) {
                        db.newUUID(function (err, uuid) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, {
                                _id: uuid,
                                type: 'clinic'
                            });
                        });
                    },
                    remove: function(doc, callback) {
                        db.removeDoc(doc, function (err, res) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, doc);
                        });
                    }
                });
            });
        });
    });
    var props = {
        tab: {'clinics': true}
    };
    return {
        title: 'Facilities',
        info: getAppInfo.apply(this),
        content: templates.render('facilities.html', req, props)
    };
};


exports.health_centers = function (doc, req) {
    events.once('afterResponse', function () {

        var db = require('db').current(),
            q = {},
            q_dh = {},
            view = '';

        utils.updateTopNav('facilities');

        setupContext(req, function(err) {
            if (utils.hasPerm(req.userCtx, 'can_edit_any_facility')) {
                view = 'facilities';
                q = {
                    startkey: ['health_center'],
                    endkey: ['health_center', {}],
                    include_docs: true
                };
                q_dh = {
                    startkey: ['district_hospital'],
                    endkey: ['district_hospital',{}],
                    include_docs: true
                };
            } else if (utils.hasPerm(req.userCtx, 'can_edit_facility')) {
                // filter by district
                view = 'facilities_by_district';
                q = {
                    startkey: [district, 'health_center'],
                    endkey: [district, 'health_center', {}],
                    include_docs: true
                };
                q_dh = {
                    startkey: [district, 'district_hospital'],
                    endkey: [district, 'district_hospital',{}],
                    include_docs: true
                };
            } else {
                // should not display facilities
                $('#content').html(
                    '<p class="facilities_msg">'+
                    "You don't have permissions to edit facilities</p>"
                );
                return;
            }

            // reload districts cache
            db.getView(ddoc, view, q_dh, function (err, data) {
                if (err) {
                    return alert(err);
                }
                cache.districts = [];
                cache.district_names = [];
                _.each(data.rows, function(row) {
                    cache.districts.push(row);
                    if(row.value.name) {
                        cache.district_names.push(row.value.name);
                    }
                });
            });

            var editSelection = function (td, callback) {
                var val = $(td).find('.dropdown-toggle').text();

                updateCell(td, val, cache.district_names);

                // toggle menu
                $(td).find('.dropdown-toggle').trigger('click.dropdown.data-api');

                // on click, save and update cell
                $(td).find('.dropdown-menu a').on('click', function(ev) {
                    ev.preventDefault();
                    var val = $(ev.target).text();
                    $('[data-toggle="dropdown"]').parent().removeClass('open')
                    // triggers the save
                    callback(td, val);
                    // update the cell
                    updateCell(td, val, cache.district_names);
                });
            };

            // render spreadsheet
            db.getView(ddoc, view, q, function (err, data) {
                if (err) {
                    return logger.error(err);
                }
                $('#loader').hide();
                var docs = _.map(data.rows, function (row) {
                    var doc = row.doc;
                    return doc;
                });
                var spreadsheet = $('#facilities').spreadsheet({
                    columns: [
                        {
                            label: $.kansoconfig('Health Center Name'),
                            property: ['name'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('Health Center Contact Name'),
                            property: ['contact', 'name'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('Health Center Contact Phone'),
                            property: ['contact', 'phone'],
                            type: 'string'
                            //validation: 'phone'
                        },
                        {
                            label: $.kansoconfig('District'),
                            property: ['parent','name'],
                            type: 'string',
                            createCellHandler: createCell,
                            editSelectionHandler: editSelection
                        }
                    ],
                    data: docs,
                    save: function (doc, callback) {
                        // resolve parent object based on name
                        for (var i in cache.districts) {
                            var row = cache.districts[i];
                            if (doc.parent && row.value.name === doc.parent.name) {
                                doc.parent = row.doc;
                                break;
                            }
                        }
                        db.saveDoc(doc, function (err, res) {
                            if (err) {
                                return callback(err);
                            }
                            doc._rev = res.rev;
                            updateChildFacilities(doc);
                            callback(null, doc);
                        });
                    },
                    create: function (callback) {
                        db.newUUID(function (err, uuid) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, {
                                _id: uuid,
                                type: 'health_center'
                            });
                        });
                    },
                    remove: function(doc, callback) {
                        db.removeDoc(doc, function (err, res) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, doc);
                        });
                    }
                });
                spreadsheet.on('rangeChange', function() {
                    // close dropdowns on cell change
                    $('[data-toggle="dropdown"]').parent().removeClass('open')
                });
            });
        });
    });

    var props = {
        tab: {'health_centers': true}
    };

    return {
        title: 'Facilities',
        info: getAppInfo.apply(this),
        content: templates.render('facilities.html', req, props)
    };
};

exports.districts = function (doc, req) {
    events.once('afterResponse', function () {

        utils.updateTopNav('facilities');

        setupContext(req, function(err) {
            var db = require('db').current(),
                view = 'facilities',
                lockRows = false,
                q = {
                    startkey: ['national_office'],
                    endkey: ['national_office', {}],
                    include_docs: true
                };

            // reload national office cache
            db.getView(ddoc, view, q, function (err, data) {
                if (err) {
                    return alert(err);
                }
                cache.national_office = {};
                // get first national office matched
                for (var i in data.rows) {
                    var row = data.rows[i];
                    cache.national_office = row.doc;
                    break;
                };
            });

            if (utils.hasPerm(req.userCtx, 'can_edit_any_facility')) {
                view = 'facilities';
                q = {
                    startkey: ['district_hospital'],
                    endkey: ['district_hospital', {}],
                    include_docs: true
                };
            } else if (utils.hasPerm(req.userCtx, 'can_edit_facility')) {
                view = 'facilities_by_district';
                q = {
                    startkey: [district, 'district_hospital'],
                    endkey: [district, 'district_hospital', {}],
                    include_docs: true
                };
                lockRows = true;
            } else {
                // should not display facilities
                $('#content').html(
                    '<p class="facilities_msg">'+
                    "You don't have permissions to edit facilities</p>"
                );
                return;
            }

            db.getView(ddoc, view, q, function (err, data) {
                if (err) {
                    return logger.error(err);
                }
                $('#loader').hide();
                var docs = _.map(data.rows, function (row) {
                    return row.doc;
                });
                $('#facilities').spreadsheet({
                    columns: [
                        {
                            label: $.kansoconfig('District Name'),
                            property: ['name'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('District Contact Name'),
                            property: ['contact', 'name'],
                            type: 'string'
                        },
                        {
                            label: $.kansoconfig('District Contact Phone'),
                            property: ['contact', 'phone'],
                            type: 'string'
                            //validation: 'phone'
                        }
                    ],
                    data: docs,
                    save: function (doc, callback) {
                        // resolve parent
                        if (cache.national_office) {
                            doc.parent = cache.national_office;
                        }
                        db.saveDoc(doc, function (err, res) {
                            if (err) {
                                return callback(err);
                            }
                            doc._rev = res.rev;
                            updateChildFacilities(doc);
                            callback(null, doc);
                        });
                    },
                    create: function (callback) {
                        db.newUUID(function (err, uuid) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, {
                                _id: uuid,
                                type: 'district_hospital'
                            });
                        });
                    },
                    remove: function(doc, callback) {
                        db.removeDoc(doc, function (err, res) {
                            if (err) {
                                return callback(err);
                            }
                            callback(null, doc);
                        });
                    },
                    lockRows: lockRows
                });
            });
        });
    });
    var props = {
        tab: {'districts': true}
    };

    return {
        title: 'Facilities',
        info: getAppInfo.apply(this),
        content: templates.render('facilities.html', req, props)
    };
};

exports.reminders = function(doc, req) {
    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.

        setupContext(req, function(err) {
            if (err) {
                return render500('Failed to setup context.', err, doc);
            }
            var db = require('db').current(),
                html = '',
                label,
                key;

            // descending by default
            var q = _.extend(req.query, {
                descending: true,
                group: 'true',
                limit: '1000'
            });

            if (district) {
                q['startkey'] = [district,{}];
                q['endkey'] = [district];
            }

            utils.updateTopNav('reminders_log');

            function startWeek() {
              if (label !== undefined) {
                html += "</tbody>";
              }
              html += "<tbody><th colspan=\"3\">Reminders for week " + key[1]
                      + "/" + key[2] + "</th>";
            }

            db.getView('kujua-lite', 'reminders', q, function(err, data) {
                if (err) {
                    return render500('Failed reminders view.', err);
                }
                html += "<table class=\"table\"><tbody>";

                if (data.rows.length === 0)
                    html += "<tr><td class=\"span2\">No reminders found.</td></tr>";

                data.rows.forEach(function(row) {
                    key = row.key;
                    if (label !== '' + key[1] + key[2]) {
                      startWeek();
                      label = '' + key[1] + key[2];
                    }
                    html += "<tr><td class=\"span2\"><span class=\"label\">" + key[4]
                         +"</span></td><td>" + key[3] + "</td><td>" + row.value + "</td></tr>";
                });
                html += "</tbody></table>";
                $('#content').html(html);
            });
        });
    });

    return {
        info: getAppInfo.apply(this),
        content: templates.render('loader.html', req, {})
    };
};
