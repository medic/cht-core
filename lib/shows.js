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
    _str = require('underscore-string'),
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

var handleModalResponse = function(modal, msg, err) {
    if (err) {
        console.log(msg, err);
        if (_.isString(err)) {
            msg += ': ' + err;
        }
        modal.find('.modal-footer .note').text(msg);
    } else {
        modal.find('.modal-footer .note').text();
        modal.modal('hide');
    }
};

function onExportFormsSubmit(ev) {

    ev.preventDefault();

    var $target = $(ev.currentTarget),
        params = querystring.parse($target.attr('data-query')),
        form = $target.attr('data-form'),
        url = $target.attr('data-url'),
        startVal = $('#startDate > input').val(),
        endVal = $('#endDate > input').val(),
        startkey = JSON.parse(params.startkey),
        endkey = JSON.parse(params.endkey),
        // moment doesn't like dates of '' or null
        startDate = moment(startVal || undefined),
        endDate = moment(endVal || undefined);

    // flip dates if both have values and startDate's after endDate
    if (startVal !== '' && startDate > endDate) {
        endDate = startDate;
        startDate = moment(endVal || undefined);
    }

    // optionally filter by date
    if (startVal !== '') {
        // update endkey for startdate as view is descending
        endkey.push(startDate.valueOf());
    } else {
        endkey.push(0);
    }
    if (endVal !== '') {
        // update startkey for enddate as view is descending
        startkey.push(endDate.valueOf());
    } else {
        startkey.push({});
    }

    params.startkey = JSON.stringify(startkey);
    params.endkey = JSON.stringify(endkey);
    params.format = $('#sms-forms-controls [name=format]').val();
    params.locale = $('#sms-forms-controls [name=locale]').val();

    url += '?' + querystring.stringify(params);

    $(window.location).attr('href', url);
}

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

var renderDownloadControls = function(info) {

    $('.page-header .controls').first().html(
        templates.render('export/controls.html', {}, {
            locale: info.getLocale(),
            locales: info.locales
        })
    ).show();

    /*
     * Disabling default month value for now since record count does not
     * reflect the export row totals displayed on the screen.  It's probably
     * better UX to have the set the date knowing they are doing something than
     * having a default that doesn't make sense with the totals on the screen.
     *
     * TODO default export start month to subtract setting and calculate based
     * on the the date value.
     * */

    // by default limit export to 3 months of previous data
    //$('#startDate > input').val(
    //    moment().subtract(1,'month').startOf('month').format('YYYY-MM-DD')
    //);

    $('[data-role=datetimepicker]').datetimepicker({
        pickTime: false
    }).on('changeDate', function() {
        $(this).datetimepicker('hide');
    });
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

function renderDownloadAudit() {
    $('[data-page=sms-forms-data] #export-audit').html(
        templates.render('export/audit.html', {}, {})
    );

    // bind to form download buttons in export screen
    $('#export-audit form [type=submit]').on('click', function(ev) {
        ev.preventDefault();

        var $target = $(ev.currentTarget),
            baseURL = $target.attr('data-url'),
            url;

        var params = {
            format: $('#sms-forms-controls [name=format]').val(),
            locale: $('#sms-forms-controls [name=locale]').val(),
            reduce: false
        }

        // reconstruct url
        url = baseURL + '/export/audit?' + querystring.stringify(params);

        $(window.location).attr('href', url);
    });
};

function safeStringify(str) {
    if (_.isString(str)) {
        return str;
    }
    try {
        return JSON.stringify(str);
    } catch(e) {
        return str;
    }
};

function renderDownloadFeedback() {
    var query = {
        include_docs: true,
        descending: true,
        limit: 20
    };
    var db = require('db').current();
    var baseURL = require('duality/core').getBaseURL();
    db.getView(ddoc, 'feedback', query, function(err, data) {
        if (err) {
            return alert(err);
        }

        var req = dutils.currentRequest();
        var info = appinfo.getAppInfo.call(this, req);

        var feedback = _.map(data.rows, function(row) {
            var doc = row.doc;
            return {
                id: doc._id,
                time: moment(doc.meta.time).format(info.reported_date_format),
                info: safeStringify(doc.info)
            };
        });
        $('[data-page=sms-forms-data] #export-feedback').html(
            templates.render('export/feedback.html', {}, {
                feedback: feedback,
                rows: data.rows.length,
                total_rows: data.total_rows,
                baseURL: baseURL
            })
        );
        // bind to form download buttons in export screen
        $('#export-feedback .btn-primary').on('click', function(e) {
            e.preventDefault();

            var startVal = $('#startDate > input').val(),
                endVal = $('#endDate > input').val(),
                startDate = startVal ? moment(startVal) : undefined,
                endDate = endVal ? moment(endVal) : undefined,
                url;

            var startkey = [endDate ? endDate.valueOf() : 9999999999999, {}];
            var endkey = [startDate ? startDate.valueOf() : 0];

            var params = {
                reduce: false,
                startkey: JSON.stringify(startkey),
                endkey: JSON.stringify(endkey),
                format: $('#sms-forms-controls [name=format]').val(),
                locale: $('#sms-forms-controls [name=locale]').val()
            }

            url = baseURL + '/export/feedback?' + querystring.stringify(params);

            $(window.location).attr('href', url);
        });
    });
};

function renderDownloadMessages() {

    var db = require('db').current();
    var baseURL = require('duality/core').getBaseURL();

    db.getView(ddoc, 'data_records_by_district', { group: true }, function(err, data) {

        if (err) {
            return alert(err);
        }

        if (!isAdmin) {
            return;
        }

        var messages;

        /*
         * By default set startkey/endkey filter to include all records.
         */
        var districts = _.map(data.rows, function(row) {
            return {
                dh_id: row.key[0],
                dh_name: row.key[1]
            };
        });
        var messages = { districts: _.sortBy(districts, 'dh_name') };

        $('[data-page=sms-forms-data] #export-messages').html(
            templates.render('export/messages.html', {}, {
                messages: messages
            })
        );

        // bind to form download buttons in export screen
        $('#export-messages form [type=submit]').on('click', function(ev) {
            ev.preventDefault();

            var $target = $(ev.currentTarget),
                districtId = $target.data('district-id'),
                districtName = $target.data('district-name'),
                baseURL = $target.data('url'),
                startVal = $('#startDate > input').val(),
                endVal = $('#endDate > input').val(),
                startDate = startVal ? moment(startVal) : undefined,
                endDate = endVal ? moment(endVal) : undefined;

            // flip dates if both have values and startDate's after endDate
            if (startDate && endDate && startDate > endDate) {
                var tmp = startDate;
                startDate = endDate;
                endDate = tmp;
            }

            var enddate = endDate ? endDate.valueOf() : 9999999999999;
            var startdate = startDate ? startDate.valueOf() : 0;

            var startkey = [enddate, {}];
            var endkey = [startdate];

            if (districtId) {
                startkey.unshift(districtId);
                endkey.unshift(districtId);
            }

            var params = {
                startkey: JSON.stringify(startkey),
                endkey: JSON.stringify(endkey),
                dh_name: districtName,
                tz: moment().zone(),
                format: $('#sms-forms-controls [name=format]').val(),
                locale: $('#sms-forms-controls [name=locale]').val(),
                reduce: false
            };

            // reconstruct url
            var url = baseURL + '/export/messages?' + querystring.stringify(params);

            $(window.location).attr('href', url);
        });
    });

};

function renderDownloadForms() {
    var view = 'data_records_valid_by_district_and_form';
    var db = require('db').current();

    db.getView(ddoc, view, { group: true }, function(err, data) {

        if (err) {
            return alert(err);
        }

        var req = dutils.currentRequest(),
            tz = moment().zone(),
            keys,
            titles = {};

        var info = appinfo.getAppInfo.call(this, req);

        _.each(data.rows, function(row) {
            var form = row.key[1],
                title = sms_utils.getFormTitle(form, info);
            // prepare titles
            if (!titles[title]) {
                titles[title] = 1;
            }
        });

        keys = _.keys(titles).sort();

        var forms = _.reduce(data.rows, function(memo, row) {
            var dh_id = row.key[0],
                form = row.key[1],
                dh_name = row.key[2],
                title = '',
                form,
                q,
                index;

            q = db.stringifyQuery({
                startkey: [true, dh_id, form],
                endkey: [true, dh_id, form],
                dh_name: dh_name,
                tz: tz
            });

            title = sms_utils.getFormTitle(form, info);

            index = _.indexOf(keys, title);

            if (!memo[index]) {
                memo[index] = {
                    districts: [],
                    form: form,
                    total: 0,
                    title: title
                };
            }

            memo[index].total += row.value;

            memo[index].districts.push({
                dh_id: dh_id,
                dh_name: dh_name,
                title: title,
                total: row.value,
                q: querystring.stringify(q)
            });
            if (!memo[index].q) {
                memo[index].q = querystring.stringify(db.stringifyQuery({
                    startkey: [true, form],
                    endkey: [true, form],
                    include_docs: true,
                    descending: true,
                    tz: tz
                }));
            }

            return memo;
        }, []);

        _.each(forms, function(form) {
            form.districts = _.sortBy(form.districts, 'dh_name');
        });

        $('[data-page=sms-forms-data] #export-forms').html(
            templates.render('export/forms.html', {}, {
                forms: forms.length > 0 ? forms : null
            })
        );

        // bind to form download buttons in export screen
        $('#export-forms form [type=submit]').on('click', onExportFormsSubmit);

    });
};

var render403 = exports.render403 = function(req, msg) {
    $('#content').html(templates.render('403.html', req, {}));
    $('.page_login').on('click', function(_ev) {
        var garden_app_support = require('garden-app-support');
        garden_app_support.get_garden_ctx(function(err, ctx) {
            if (!err) {
                _ev.stopPropagation();
                window.location = ctx.login_url;
            }
            // else error: propagate click
        });
    });
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

exports.sms_forms = function (doc, req) {

    events.once('afterResponse', function() {
        setupContext(req, function() {
            utils.updateTopNav('sms-forms-data', info.translate('Export'));
            renderDownloadControls(info);
            renderDownloadForms();
            renderDownloadMessages();
            renderDownloadAudit();
            renderDownloadFeedback();
        });
    });

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
        content: templates.render('export/export.html', req, {})
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

exports.configuration = configuration.configuration;
exports.forms = configuration.forms;
exports.workflows = configuration.workflows;
exports.workflow = configuration.workflow;

exports.help = function (doc, req) {

    var pages = {
        search: {
            template: 'help/search.html',
            callback: loadSearchHelp
        },
        validation: {
            template: 'help/validation-rules.html'
        },
        export: {
            template: 'help/export.html'
        },
        messages: {
            template: 'help/messages.html'
        }
    };
    var page = req.query.page ? 
        pages[req.query.page] : { template: 'help/index.html' };

    function loadSearchHelp() {
        if (cache.search_help_fields) {
            return success(cache.search_help_fields);
        }
        function success(data, text, xhr) {
            cache.search_help_fields = data;
            $('[data-page=help] .field-data').replaceWith(
                templates.render(
                    'help/search-fields.html', {}, { fields: _.unique(data.fields).sort() }
                )
            );
        };
        function error(xhr, status, err) {
            $('[data-page=help] .fields-data').replaceWith(
                '<li>' + err + '</li>'
            );
        };
        // ick, change to using /_rewrite/ if possible
        var url = '/_fti/local' + db.current().url + '/_design/' + ddoc + '/data_records';
        $.ajax({
            url: url,
            success: success,
            error: error,
            dataType: 'json'
        });
    };

    events.once('afterResponse', function () {
        if (!page) {
            return render404(req);
        }
        utils.updateTopNav('help');
        $('[data-page=help] #loader').replaceWith(
            templates.render(page.template, {}, {})
        );
        if (page.callback) {
            page.callback();
        }
    });

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        info: info,
        content: templates.render('loader.html', req, {})
    };
}

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