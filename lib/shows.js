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
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    utils = require('kujua-utils'),
    ksutils = require('kujua-sms/utils'),
    cookies = require('cookies'),
    logger = utils.logger,
    jsDump = require('jsDump'),
    data_records = require('./data_records'),
    moment = require('moment'),
    _ = require('underscore')._,
    settings = require('settings/root'),
    ddoc = settings.name,
    district,
    isAdmin,
    isDistrictAdmin;

var cache = {};

var onDownloadFormSubmit = function(ev) {
    ev.preventDefault();
    var url = $(this).closest('form').find('option:selected').attr('value'),
        parts = url.split('?'),
        params = querystring.parse(parts[1]),
        startDate = $('#startDate').val();

    params.kansoconfig = JSON.stringify($.kansoconfig());

    // optionally filter by date
    if (startDate !== '') {
        var startkey = JSON.parse(params.startkey),
            endkey = JSON.parse(params.endkey),
            date = new Date(startDate).valueOf();
        //startkey.splice(2,0,{});
        endkey.push(date);
        params.startkey = JSON.stringify(startkey);
        params.endkey = JSON.stringify(endkey);
    }

    // reconstruct url
    url = parts[0]+'?'+querystring.stringify(params);

    $(location).attr('href', url);
};

var renderDownloadForms = function(err, data) {
    var req = dutils.currentRequest();

    if (err) {
        return alert(err);
    }

    // render since date picker
    $('.container .controls').first().addClass('pull-right').show().html(
        templates.render('sms_forms_controls.html', {}, {})
    );

    // by default limit export to 1 month of previous data
    $('#datePicker').val(
        moment(new Date()).subtract('months',1).format('YYYY-MM-DD')
    ).datetimepicker({pickTime: false});

    var forms = _.map(data.rows, function(row) {
        var dh_id = row.key[0],
            form = row.key[1],
            def = jsonforms[form],
            dh_name = row.key[2],
            title = '',
            q = db.stringifyQuery({
                    startkey: [dh_id, form, dh_name, {}],
                    endkey: [dh_id, form, dh_name],
                    form: form,
                    include_docs: true,
                    descending: true,
                    dh_name: dh_name});

        if (def && def.meta && def.meta.label) {
            title = utils.localizedString(def.meta.label);
        }

        return {
            dh_id: dh_id,
            form: form,
            dh_name: dh_name,
            title: title,
            total: row.value,
            isAdmin: utils.isUserAdmin(req.userCtx),
            q: querystring.stringify(q)
        };
    });

    $('#forms').html(
        templates.render('sms_forms_data.html', {}, {
            forms: forms.length > 0 ? forms : null
        })
    );

    // adjust download options based on locale value.  currently only
    // supporting French. TODO use locale value in cookie instead of query
    // param.
    //logger.debug(['hi cookie', req.cookie]);
    //logger.debug(['hi locale', req.cookie.kujua_locale]);
    //making french xml default for now
    //if (req.cookie.kujua_locale && req.cookie.kujua_locale.match(/^fr/i)) {
      $('.form option').each(function(idx, el) {
          var option = $(el);
          var val = option.attr('value').split('.')[1];
          if (val.match(/xml\?locale=en/)) {
            option.attr('selected','selected');
          }
      });
    //}

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

            utils.updateTopNav('sms-forms-data', 'SMS Forms Data');

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
        title: 'SMS Forms',
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
        return $('#content').html(
            templates.render("403.html", req, {})
        );
    }
    utils.getUserDistrict(req.userCtx, function(err, data) {
        if (err) return callback(err);
        district = data;
        callback();
    });
};

exports.data_records = function(head, req) {

    // Avoid binding events here because they will accumulate on each request.
    events.once('afterResponse', function() {
        setupContext(req, function(err) {


            if (err)
                return render500('Failed to setup context.', err);

            utils.updateTopNav('records');

            data_records.init(req, {
                district: district || req.query.dh_id,
                isAdmin: isAdmin
            });
        });
    });

    return {
        title: 'Records',
        content: templates.render('data_records.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
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
    if (typeof $ !== 'undefined') {
        props['Clinics'] = $.kansoconfig('Clinics');
        props['Health_Centers'] = $.kansoconfig('Health Centers');
        props['Districts'] = $.kansoconfig('Districts');
    }
    return {
        title: 'Facilities',
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
    if (typeof $ !== 'undefined') {
        props['Clinics'] = $.kansoconfig('Clinics');
        props['Health_Centers'] = $.kansoconfig('Health Centers');
        props['Districts'] = $.kansoconfig('Districts');
    }
    return {
        title: 'Facilities',
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
    if (typeof $ !== 'undefined') {
        props['Clinics'] = $.kansoconfig('Clinics');
        props['Health_Centers'] = $.kansoconfig('Health Centers');
        props['Districts'] = $.kansoconfig('Districts');
    }
    return {
        title: 'Facilities',
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

            db.getView('kujua-base', 'reminders', q, function(err, data) {
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
        content: templates.render('loader.html', req, {})
    };
};
