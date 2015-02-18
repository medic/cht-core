/**
 * Show functions to be exported from the design doc.
 */

var querystring = require('querystring'),
    db = require('db'),
    events = require('duality/events'),
    dutils = require('duality/utils'),
    templates = require('duality/templates'),
    utils = require('kujua-utils'),
    logger = utils.logger,
    sms_utils = require('kujua-sms/utils'),
    migrations = require('js-migrations'),
    moment = require('moment'),
    _ = require('underscore'),
    async = require('async'),
    settings = require('settings/root'),
    appinfo = require('views/lib/appinfo'),
    users = require('users'),
    libphonenumber = require('libphonenumber/utils'),
    configuration = require('./show-includes/configuration'),
    ddoc = settings.name,
    district,
    isAdmin,
    currentFacilityRequest;

var cache = {};

var restoreFacilities = function(ev) {
    ev.preventDefault();
    var btn = $(this);
    $('#facilities-controls .uploader').click();
};

var uploadFacilities = function(ev) {
    var db = require('db').current(),
        baseURL = require('duality/core').getBaseURL(),
        overwrite = $('#facilities-controls [name=overwrite]').prop('checked');

    if (this.files.length === 0) return;
    var reader = new FileReader();
    $('#facilities').html(
        templates.render('loader.html', {}, {})
    );

    // disable form elements while running
    $('#facilities-controls [type=checkbox]').disable();
    $('#facilities-controls [type=button]').disable();

    function finish(msg, errors) {
        $('#facilities').html(
            templates.render('facilities_restore.html', {}, {
                msg: msg,
                errors: errors
            })
        );
        $('#facilities-controls [type=checkbox]').enable();
        $('#facilities-controls [type=button]').enable();
    }

    reader.onloadend = function(ev) {
        var json,
            processed_count = 0,
            restored_count = 0,
            errors = [],
            info = appinfo.getAppInfo.call(this);

        try {
            json = JSON.parse(ev.target.result);
        } catch(e) {
            return finish('Failed to parse JSON file.', [e]);
        }

        $('#facilities').html(templates.render('facilities_restore.html', {}, {
            progress: info.translate('Reading file')
        }));

        if (overwrite) {
            console.warn('overwriting facilities');
        }


        function updateProgress(complete, total) {
            total = total || json.length;
            var width = Math.floor(complete/total * 100);
            var desc = info.translate('Processed number of total records', {
                number: complete,
                total: total
            });
            // start showing stats and progress bar after 1st record
            if (complete == 1) {
                $('#facilities').html(templates.render('facilities_restore.html', {}, {
                    progress: desc,
                    width: '0%'
                }));
            }
            $('#facilities-restore .update-progress .desc').text(desc);
            $('#facilities-restore .update-progress .bar').css('width', width + '%');
        }

        function saveRecord(doc, options, cb) {
            if (typeof(options) === 'function' && !cb) {
                cb = options;
                options = null;
            }
            // delete _rev since this is a new doc in this database
            if (options && options.create && doc._rev) {
                delete doc._rev;
            }
            db.saveDoc(doc, function(err) {
                if (err) {
                    console.error('error saving record', err);
                    errors.push([doc.name, err]);
                } else {
                    restored_count++;
                }
                // continue processing
                processed_count++;
                updateProgress(processed_count);
                cb();
            });
        }

        // check for record first and overwrite if specified
        function onFacility(facility, cb) {
            $.ajax({
                type: 'HEAD',
                url: baseURL + '/_db/' + facility._id,
                complete: function(xhr, txtStatus) {
                    if (xhr.status == 404) {
                        // create a new record
                        saveRecord(facility, {create: true}, cb);
                    } else if (xhr.status == 200) {
                        // quotes are included in response header string,
                        // remove them so couchdb accepts the rev.
                        var rev = xhr.getResponseHeader('ETag').replace(/['"]/g,'');
                        if (rev && overwrite) {
                            // overwrite a record
                            facility._rev = rev;
                            saveRecord(facility, cb);
                        } else {
                            processed_count++;
                            updateProgress(processed_count);
                            cb();
                        }
                    }
                },
                error: function(xhr, txtStatus, err) {
                    // we handle 404, report anything else
                    if (xhr.status != 404) {
                        errors.push([facility.name, err]);
                    }
                }
            });
        }

        function finishLoading(err) {
            var msg = info.translate('Restored number of total records', {
                number: restored_count,
                total: json.length
            });
            if (err) {
                msg = err + ' ' + msg;
            }
            var skipped = json.length - restored_count;
            if (skipped > 0) {
                errors.push(info.translate(
                    'Skipped number of records', { number: skipped }
                ));
            }
            finish(msg, errors);
        }

        async.forEach(json, onFacility, finishLoading);
    }

    reader.readAsText(this.files[0]);

};

var backupFacilities = function(ev) {
    ev.preventDefault();
    $(window.location).attr('href', $(this).attr('data-url'));
};

var renderFacilitiesControls = function() {
    $('.page-header .controls').first().html(
        templates.render('facilities_controls.html', {}, {isAdmin: isAdmin})
    ).show();
    $('#facilities-controls .backup').on('click', backupFacilities);
    $('#facilities-controls .restore').on('click', function() {
        $('#facilities-controls .options').hide();
        $('#facilities-controls .options-restore').show();
    });
    $('#facilities-controls .cancel').on('click', function(ev) {
        $('#facilities-controls form')[0].reset();
        $('#facilities-controls .options').show();
        $('#facilities-controls .options-restore').hide();
    });
    $('#facilities-controls .choose').on('click', restoreFacilities);
    $('#facilities-controls .uploader').on('change', uploadFacilities);
};

var removeConfirm = function(doc, info, callback) {
    var name = doc.name || (doc.contact && doc.contact.name) || 'this row';
    $('#delete-confirmation-label').text(
        info.translate('Confirm delete', { name: name })
    );
    $('#delete-confirmation .btn-primary')
        // remove any previous click handlers
        .off('click')
        .on('click', function(ev) {
            ev.preventDefault();
            $('#delete-confirmation').modal('hide');
            callback();
        });
    $('#delete-confirmation').modal('show');
};

var render403 = exports.render403 = function(req, msg) {
    $('#content').html(templates.render('403.html', req, {}));
};

var render404 = exports.render404 = function(req) {
    $('#content').html(templates.render('404.html', req, {}));
};

var render500 = exports.render500 = function(msg, err, doc) {
    if (_.isObject(err)) {
        err = JSON.stringify(err, null, 2);
    }

    $('#content').html(
        templates.render('500.html', {}, {
            doc: doc,
            msg: msg,
            err: err
        })
    );
};

exports.status = function (doc, req) {
    // if we can get this far, the app is running
    return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ready: true })
    };
};

/**
 * Centralized some variable initializaiton that is used in most of the
 * views/shows to filter on a user's district or `facility_id` value.
 */
var setupContext = exports.setupContext = function(req, callback) {

    if (!req.userCtx || !req.userCtx.name) {
        isAdmin = false;
        return render403(req);
    }

    isAdmin = utils.isUserAdmin(req.userCtx);

    if (!isAdmin) {
        return render403(req, 'You must be an admin to access this page. Your admin needs to update your permissions.');
    }

    users.get(req.userCtx.name, function(err, user) {
        $('#topnavlinks').html(templates.render('top_bar.html', req, {
            isDbAdmin: utils.isDbAdmin(req.userCtx)
        }));
        $('#feedback-wrapper').html(templates.render('partials/modal_feedback_admin.html', req, {}));
        callback();
    });
};

exports.inbox = function(doc, req) {
    return {
        body: templates.render('inbox.html', req, {
            user: JSON.stringify(req.userCtx),
            info: appinfo.getAppInfo.call(this, req)
        })
    };
};

exports.not_found = function (doc, req) {

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
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

var editSelection = function(td, values, callback) {
    var val = $(td).find('.dropdown-toggle').text();

    updateCell(td, val, values);

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
        updateCell(td, val, values);
    });
}

var removeFacility = function(db, doc, callback) {
    db.removeDoc(doc, function (err, res) {
        if (err) {
            return callback(err);
        }
        callback(null, doc);
    });
}

var createFacility = function(db, callback, type) {
    db.newUUID(function (err, uuid) {
        if (err) {
            return callback(err);
        }
        callback(null, {
            _id: uuid,
            type: type
        });
    });
}

/*
 * Try to update child facilities for health centers and districts. Recursive
 * case only really applies to districts.
 */
var updateChildFacilities = function(doc) {
    var view = 'facility_by_parent',
        q = { startkey: [doc._id], endkey: [doc._id, {}], include_docs: true },
        db = require('db').current();

    if (!doc || !doc.type) return;

    // only act on facilities that might have children
    if (doc.type !== 'health_center' && doc.type !== 'district_hospital')
        return;

    db.getView(ddoc, view, q, function(err, data) {

        if (err) {
            console.log('Failed updating child facilities', err);
            return alert('Failed updating child facilities.');
        }

        for (var i in data.rows) {
            var d = data.rows[i].doc;
            if (d.parent._id === doc._id && d.parent._rev === doc._rev)
                updateChildFacilities(d);
            d.parent = doc;
            db.saveDoc(d, function(err, res) {
                if (err) {
                    console.log('Failed saving child facilities', err);
                    alert('Failed updating child facilities');
                }
            });
            updateChildFacilities(d);
        }
    });
}

var initPhoneColumn = function(info, label) {
    return {
        label: info.translate(label),
        property: ['contact', 'phone'],
        formatter: function(input) {
            return libphonenumber.format(info, input) || input;
        },
        validationHint: info.translate('Phone number example'),
        validation: function(input) {
            if (!input) {
                return true;
            }
            return libphonenumber.validate(info, input);
        },
        type: 'string'
    };
}

exports.clinics = function (doc, req) {
    events.once('afterResponse', function () {

        currentFacilityRequest = req;

        var q,
            view;

        setupContext(req, function() {
            utils.updateTopNav('facilities', info.translate('Facilities'));
            renderFacilitiesControls();
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
            } else if (utils.hasPerm(req.userCtx, 'can_edit_facility')) {
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
            } else {
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

            // render spreadsheet
            db.getView(ddoc, view, q, function (err, data) {
                if (err) {
                    return logger.error(err);
                }
                if (currentFacilityRequest === req) {
                    currentFacilityRequest = undefined;
                    $('#loader').hide();
                    var docs = _.map(data.rows, function (row) {
                        return row.doc;
                    });
                    $('[data-page=facilities] #facilities').spreadsheet({
                        columns: [
                            {
                                label: info.translate('Village Name'),
                                property: ['name'],
                                type: 'string'
                            },
                            {
                                label: info.translate('Clinic Contact Name'),
                                property: ['contact', 'name'],
                                type: 'string'
                            },
                            initPhoneColumn(info, 'Clinic Contact Phone'),
                            {
                                label: info.translate('RC Code'),
                                property: ['contact', 'rc_code'],
                                type: 'string'
                            },
                            {
                                label: info.translate('Health Center'),
                                property: ['parent', 'name'],
                                type: 'string',
                                createCellHandler: createCell,
                                editSelectionHandler: function(td, callback) {
                                    editSelection(td, cache.health_center_names, callback);
                                }
                            },
                            {
                                label: info.translate('External ID'),
                                property: ['external_id'],
                                type: 'string'
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
                            createFacility(db, callback, 'clinic');
                        },
                        remove: function(doc, callback) {
                            removeFacility(db, doc, callback);
                        },
                        removeConfirm: function(doc, callback) {
                            removeConfirm(doc, info, callback);
                        },
                        translate: info.translate
                    });
                }
            });
        });
    });

    var props = {
        tab: { 'clinics': true }
    };

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
        content: templates.render('facilities.html', req, props)
    };
};

exports.health_centers = function (doc, req) {
    events.once('afterResponse', function () {

        currentFacilityRequest = req;

        var db = require('db').current(),
            q = {},
            q_dh = {},
            view = '';

        setupContext(req, function() {
            utils.updateTopNav('facilities', info.translate('Facilities'));
            renderFacilitiesControls();
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

            // render spreadsheet
            db.getView(ddoc, view, q, function (err, data) {
                if (err) {
                    return logger.error(err);
                }
                if (currentFacilityRequest === req) {
                    currentFacilityRequest = undefined;
                    $('#loader').hide();
                    var docs = _.map(data.rows, function (row) {
                        return row.doc;
                    });
                    var spreadsheet = $('[data-page=facilities] #facilities').spreadsheet({
                        columns: [
                            {
                                label: info.translate('Health Center Name'),
                                property: ['name'],
                                type: 'string'
                            },
                            {
                                label: info.translate('Health Center Contact Name'),
                                property: ['contact', 'name'],
                                type: 'string'
                            },
                            initPhoneColumn(info, 'Health Center Contact Phone'),
                            {
                                label: info.translate('District'),
                                property: ['parent','name'],
                                type: 'string',
                                createCellHandler: createCell,
                                editSelectionHandler: function(td, callback) {
                                    editSelection(td, cache.district_names, callback);
                                }
                            },
                            {
                                label: info.translate('External ID'),
                                property: ['external_id'],
                                type: 'string'
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
                            createFacility(db, callback, 'health_center');
                        },
                        remove: function(doc, callback) {
                            removeFacility(db, doc, callback);
                        },
                        removeConfirm: function(doc, callback) {
                            removeConfirm(doc, info, callback);
                        },
                        translate: info.translate
                    });
                    spreadsheet.on('rangeChange', function() {
                        // close dropdowns on cell change
                        $('[data-toggle="dropdown"]').parent().removeClass('open')
                    });
                }
            });
        });
    });

    var props = {
        tab: {'health_centers': true}
    };

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
        content: templates.render('facilities.html', req, props)
    };
};

exports.districts = function (doc, req) {
    events.once('afterResponse', function () {

        currentFacilityRequest = req;

        setupContext(req, function() {
            utils.updateTopNav('facilities', info.translate('Facilities'));
            var db = require('db').current(),
                view = 'facilities',
                lockRows = false,
                q = {
                    startkey: ['national_office'],
                    endkey: ['national_office', {}],
                    include_docs: true
                };

            renderFacilitiesControls();

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
                if (currentFacilityRequest === req) {
                    currentFacilityRequest = undefined;
                    $('#loader').hide();
                    var docs = _.map(data.rows, function (row) {
                        return row.doc;
                    });
                    $('[data-page=facilities] #facilities').spreadsheet({
                        columns: [
                            {
                                label: info.translate('District Name'),
                                property: ['name'],
                                type: 'string'
                            },
                            {
                                label: info.translate('District Contact Name'),
                                property: ['contact', 'name'],
                                type: 'string'
                            },
                            initPhoneColumn(info, 'District Contact Phone'),
                            {
                                label: info.translate('External ID'),
                                property: ['external_id'],
                                type: 'string'
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
                            createFacility(db, callback, 'district_hospital');
                        },
                        remove: function(doc, callback) {
                            removeFacility(db, doc, callback);
                        },
                        removeConfirm: function(doc, callback) {
                            removeConfirm(doc, info, callback);
                        },
                        lockRows: lockRows,
                        translate: info.translate
                    });
                }
            });
        });
    });

    var props = {
        tab: { 'districts': true }
    };

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
        content: templates.render('facilities.html', req, props)
    };
};

exports.reminders = function(doc, req) {
    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.

        setupContext(req, function() {
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

            utils.updateTopNav('reminder_log');

            function startWeek() {
              if (label !== undefined) {
                html += "</tbody>";
              }
              html += "<tbody><th colspan=\"3\">Reminders for week " + key[1]
                      + "/" + key[2] + "</th>";
            }

            db.getView(ddoc, 'reminders', q, function(err, data) {
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

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
        content: templates.render('loader.html', req, {})
    };
};

exports.workflows = configuration.workflows;
exports.workflow = configuration.workflow;

exports.migration = function(doc, req) {

    var transforms = [{
        version: '0.4.0-alpha.500',
        up: function(settings) {

            var migrateMessage = function(messages) {
                _.each(messages, function(message) {
                    message.message = [{
                        content: message.message,
                        locale: settings.locale || 'en'
                    }];
                });
            };

            // update the translations
            _.each(settings.translations, function(translation) {
                if (!translation.translations) {
                    var translations = [];
                    _.each(_.keys(translation), function(key) {
                        if (key !== 'key' && key !== 'default') {
                            translations.push({
                                locale: key,
                                content: translation[key]
                            });
                            delete translation[key];
                        }
                    });
                    translation.translations = translations;
                }
            });

            // update the registrations
            _.each(settings.registrations, function(registration) {
                migrateMessage(registration.validations.list);
                var msgs = {};
                _.each(registration.messages, function(message) {
                    if (!msgs[message.recipient]) {
                        msgs[message.recipient] = [];
                    }
                    msgs[message.recipient].push({
                        content: message.message,
                        locale: message.locale
                    });
                });
                registration.messages = [];
                _.each(_.keys(msgs), function(key) {
                    registration.messages.push({
                        message: msgs[key],
                        recipient: key
                    });
                });
            });

            // update the patient reports
            _.each(settings.patient_reports, function(report) {
                migrateMessage(report.validations.list);
                report.messages = _.map(report.messages, function(message) {
                    return {
                        message: [{
                            content: message.message,
                            locale: message.locale
                        }],
                        event_type: message.event_type,
                        recipient: message.recipient
                    };
                });
            });

            // update the schedules
            _.each(settings.schedules, function(schedule) {
                var msgs = {};
                _.each(schedule.messages, function(msg) {
                    var key = [msg.recipient, msg.offset, msg.group].join(',');
                    if (!msgs[key]) {
                        msgs[key] = [];
                    }
                    msgs[key].push({
                        content: msg.message,
                        locale: msg.locale
                    });
                });
                schedule.messages = [];
                _.each(_.keys(msgs), function(key) {
                    var props = key.split(',');
                    schedule.messages.push({
                        message: msgs[key],
                        recipient: props[0],
                        offset: props[1],
                        group: props[2]
                    });
                });
            });

            // update the notifications
            if (settings.notifications) {
                migrateMessage(settings.notifications.messages);
            }

            return {
                error: false,
                result: settings
            };

        }
    },
    {
        version: '0.4.0-alpha.616',
        up: function(settings) {
            var new_validations = {
                join_responses: false,
                list: []
            };
            if (settings.notifications) {
                _.each(settings.notifications.validations, function(v) {
                   new_validations.list.push({
                        property: v.property,
                        rule: v.rule,
                        message: [{
                            content: v.message,
                            locale: settings.locale || 'en'
                        }]
                    });
                });
                settings.notifications.validations = new_validations;
            }
            return {
                error: false,
                result: settings
            };
        }
    }];

    var body = parseRequestBodyAsJson(req);
    var settings = body.settings;
    var from = body.from;

    var migrated = migrations.migrate(settings, transforms, { from: from });
    if (migrated.error) {
        throw migrated.error;
    } else {
        return JSON.stringify(migrated.result);
    }

}

var parseRequestBodyAsJson = function(req) {
    try {
        return JSON.parse(req.body);
    } catch(e) {
        throw 'Could not parse request body as JSON';
    }
};