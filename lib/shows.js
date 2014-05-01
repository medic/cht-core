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
    _str = require('underscore-string'),
    async = require('async'),
    settings = require('settings/root'),
    appinfo = require('views/lib/appinfo'),
    ddoc = settings.name,
    district,
    isAdmin,
    isDistrictAdmin,
    currentFacilityRequest;

var cache = {};

function onExportFormsSubmit(ev) {

    ev.preventDefault();

    var $target = $(ev.currentTarget),
        params = querystring.parse($target.attr('data-query')),
        form = $target.attr('data-form'),
        url = $target.attr('data-url'),
        format = $('#sms-forms-controls [name=format]').val().split(','),
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
    params.format = format[0];

    // format is a bit hinky; second in comma separated value
    if (format.length > 1) {
        params.locale = format[1];
    }

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
            errors = [];

        try {
            json = JSON.parse(ev.target.result);
        } catch(e) {
            return finish('Failed to parse JSON file.', [e]);
        }

        $('#facilities').html(
            templates.render('facilities_restore.html', {}, {
                progress: 'Reading file...'
            })
        );

        if (overwrite) {
            console.warn('overwriting facilities');
        }

        function updateProgress(complete, total) {
            total = total || json.length;
            var width = Math.floor(complete/total * 100),
                desc = 'Processed '+complete+'/'+total+' records...';
            // start showing stats and progress bar after 1st record
            if (complete == 1) {
                $('#facilities').html(
                    templates.render('facilities_restore.html', {}, {
                        progress: desc,
                        width: "0%"
                    })
                );
            }
            $('#facilities-restore .update-progress .desc').text(desc);
            $('#facilities-restore .update-progress .bar').css('width', width+'%');
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
                url: baseURL+'/_db/'+facility._id,
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
            var msg = restored_count + '/' + json.length + ' facilities restored.',
                skipped = json.length - restored_count;
            if (err) {
                msg = err + ' ' + msg;
            }
            if (skipped > 0) {
                errors.push("Skipped "+skipped+" records.");
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

var renderDownloadControls = function() {

    $('.page-header .controls').first().html(
        templates.render('export/controls.html', {}, {})
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

var removeConfirm = function(doc, callback) {
    $('#delete-confirmation-label').text('Are you sure you want to delete ' + (doc.name || doc.contact.name || 'this row') + '? This operation cannot be undone.');
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
            format = $('#sms-forms-controls [name=format]').val().split(','),
            params = {},
            url;

        params.reduce = 'false';

        if (format.length > 0) {
            params.format = format[0];
        }

        // reconstruct url
        url = baseURL + '/export/audit?' + querystring.stringify(params);

        $(window.location).attr('href', url);
    });
}

function renderDownloadMessages(err, data) {

    if (err) {
        return alert(err);
    }

    if (data.rows && !data.rows.length) {
        return;
    }

    var req = dutils.currentRequest(),
        tz = moment().zone(),
        messages = {
            districts: [],
            q: ''
        };

    if (isAdmin) {
        messages.q = querystring.stringify(db.stringifyQuery({
            startkey: ['*'],
            endkey: ['*'],
            tz: tz
        }));
        // populate districts property if admin
        _.each(data.rows, function(row) {
            var dh_id = row.key[0],
                dh_name = row.key[1] || 'No district';
            messages.districts.push({
                dh_id: dh_id,
                dh_name: dh_name,
                title: 'Messages',
                isAdmin: utils.isUserAdmin(req.userCtx),
                q: querystring.stringify(db.stringifyQuery({
                    startkey: [dh_id, '*'],
                    endkey: [dh_id, '*',],
                    dh_name: dh_name,
                    tz: tz
                }))
            });
        });
        messages.districts = _.sortBy(messages.districts, 'dh_name');
    } else if (isDistrictAdmin) {
        messages.q = querystring.stringify(db.stringifyQuery({
            startkey: [district, '*'],
            endkey: [district, '*'],
            tz: tz
        }));
    }

    $('[data-page=sms-forms-data] #export-messages').html(
        templates.render('export/messages.html', {}, {
            messages: messages
        })
    );

    // bind to form download buttons in export screen
    $('#export-messages form [type=submit]').on('click', function(ev) {
        ev.preventDefault();

        var $target = $(ev.currentTarget),
            params = querystring.parse($target.attr('data-query')),
            baseURL = $target.attr('data-url'),
            format = $('#sms-forms-controls [name=format]').val().split(','),
            startVal = $('#startDate > input').val(),
            endVal = $('#endDate > input').val(),
            startkey = JSON.parse(params.startkey),
            endkey = JSON.parse(params.endkey),
            startDate = moment(startVal || undefined), // somewhat funky -- moment doesn't like dates of '' or null :/
            endDate = moment(endVal || undefined),
            url;

        params.reduce = 'false';

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
        }

        // always append {} to start key
        startkey.push({});

        params.startkey = JSON.stringify(startkey);
        params.endkey = JSON.stringify(endkey);

        // format is a bit hinky; second in comma separated value
        if (format.length > 1) {
            params.format = format[1];
        }

        // reconstruct url
        url = baseURL + '/export/messages?' + querystring.stringify(params);

        $(window.location).attr('href', url);
    });
}

function renderDownloadForms(err, data) {
    var req = dutils.currentRequest(),
        tz = moment().zone(),
        keys,
        titles = {};

    if (err) {
        return alert(err);
    }

    var info = appinfo.getAppInfo.call(this, req);

    _.each(data.rows, function(row) {
        var form = row.key[1],
            title = ksutils.getFormTitle(form, info);
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

        title = ksutils.getFormTitle(form, info);

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

        if (isAdmin) {
            memo[index].districts.push({
                dh_id: dh_id,
                dh_name: dh_name || 'No district',
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
        } else if (isDistrictAdmin) {
            if (!memo[index].q) {
                memo[index].q = querystring.stringify(q);
            }
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
};

var render403 = exports.render403 = function(req) {
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

var render500 = exports.render500 = function(msg, err, doc) {
    if (typeof req === 'undefined') {
        req = {};
    }

    if (_.isObject(err)) {
        err = JSON.stringify(err, null, 2);
    }

    return $('#content').html(
        templates.render("500.html", req, {
            doc: doc,
            msg: msg,
            err: err
        })
    );
}

exports.sms_forms = function (doc, req) {

    events.once('afterResponse', function() {

        setupContext(req, function(err) {

            if (err) {
                console.error('setupContext error', err);
                return render500('Failed to setup context.', err, doc);
            }

            var baseURL = require('duality/core').getBaseURL(),
                q = {startkey: [district], endkey: [district,{}], group: true},
                db = require('db').current();

            utils.updateTopNav('sms-forms-data', 'Export');

            // render available downloads based on data available user must
            // either be admin or have associated district to view records
            if (isAdmin) {
                q = {group: true}
            }

            if (isAdmin || isDistrictAdmin) {
                renderDownloadControls();
                db.getView(
                    ddoc,
                    'data_records_valid_by_district_and_form',
                    q,
                    renderDownloadForms
                );
                db.getView(
                    ddoc,
                    'data_records_by_district',
                    q,
                    renderDownloadMessages
                );
                if (isAdmin) {
                    renderDownloadAudit();
                }
            } else {
                renderDownloadForms(null, []);
            }
        });

    });

    var info = appinfo.getAppInfo.call(this, req);

    return {
        info: info,
        title: info.translate('Export'),
        content: templates.render('export/export.html', req, {})
    };
};

/**
 * Centralized some variable initializaiton that is used in most of the
 * views/shows to filter on a user's district or `facility_id` value.
 */
var setupContext = function(req, callback) {
    isAdmin = utils.isUserAdmin(req.userCtx);
    isDistrictAdmin = utils.isUserDistrictAdmin(req.userCtx);

    if (isAdmin) {
        callback();
    } else if (isDistrictAdmin) {
        exports.checkDistrictConstraint({
            db: require('db').current(),
            userCtx: req.userCtx
        }, callback);
    } else {
        // not logged in or roles is not setup right
        return render403(req);
    }
};

exports.checkDistrictConstraint = function(options, callback) {
    utils.getUserDistrict(options.userCtx, function(err, data) {
        if (err) {
            return callback(err);
        }
        district = data;
        if (district) {
            options.db.getDoc(district, function(err, doc) {
                if (err) {
                    if (err.error === 'not_found') {
                        callback("No facility found with id '" + district + "'. Your admin needs to update the Facility Id in your user details.");
                    } else {
                        callback(err);
                    }
                } else if (doc.type !== 'district_hospital') {
                    callback("No facility found with id '" + district + "'. Your admin needs to update the Facility Id in your user details.");
                } else {
                    callback();
                }
            });
        } else {
            callback('No district assigned to district admin.');
        }
    });
};

exports.data_records = function(doc, req) {

    var info = appinfo.getAppInfo.call(this, req);

    // Avoid binding events here because they will accumulate on each request.
    events.once('afterResponse', function() {
        setupContext(req, function(err) {
            if (err) {
                console.error('setupContext error', err);
                return render500('Failed to setup context.', err);
            }

            // don't add title, we need space for search box
            utils.updateTopNav('activity', null);

            data_records.init(req, {
                district: district,
                isAdmin: isAdmin
            });
        });
    });

    return {
        info: info,
        title: info.translate('Activity'),
        content: templates.render('loader.html', req, {})
    };
};

exports.not_found = function (doc, req) {

    var info = appinfo.getAppInfo.call(this, req);

    return {
        info: info,
        title: info.translate('404 - Not Found'),
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

        currentFacilityRequest = req;

        utils.updateTopNav('facilities');

        var q,
            view;

        setupContext(req, function(err) {
            if (err) {
                console.error('setupContext error', err);
            }
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
                                label: $.kansotranslate('Village Name'),
                                property: ['name'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('Clinic Contact Name'),
                                property: ['contact', 'name'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('Clinic Contact Phone'),
                                property: ['contact', 'phone'],
                                type: 'string'
                                //validation: 'phone'
                            },
                            {
                                label: $.kansotranslate('RC Code'),
                                property: ['contact', 'rc_code'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('Health Center'),
                                property: ['parent', 'name'],
                                type: 'string',
                                createCellHandler: createCell,
                                editSelectionHandler: function(td, callback) {
                                    editSelection(td, cache.health_center_names, callback);
                                }
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
                        removeConfirm: removeConfirm
                    });
                }
            });
        });
    });

    var props = {
        tab: { 'clinics': true }
    };

    var info = appinfo.getAppInfo.call(this, req);

    return {
        info: info,
        title: info.translate('Facilities'),
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

        utils.updateTopNav('facilities');

        setupContext(req, function(err) {
            if (err) {
                console.error('setupContext error', err);
            }
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
                                label: $.kansotranslate('Health Center Name'),
                                property: ['name'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('Health Center Contact Name'),
                                property: ['contact', 'name'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('Health Center Contact Phone'),
                                property: ['contact', 'phone'],
                                type: 'string'
                                //validation: 'phone'
                            },
                            {
                                label: $.kansotranslate('District'),
                                property: ['parent','name'],
                                type: 'string',
                                createCellHandler: createCell,
                                editSelectionHandler: function(td, callback) {
                                    editSelection(td, cache.district_names, callback);
                                }
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
                        removeConfirm: removeConfirm
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

    return {
        info: info,
        title: info.translate('Facilities'),
        content: templates.render('facilities.html', req, props)
    };
};

exports.districts = function (doc, req) {
    events.once('afterResponse', function () {

        currentFacilityRequest = req;

        utils.updateTopNav('facilities');

        setupContext(req, function(err) {
            if (err) {
                console.error('setupContext error', err);
            }
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
                                label: $.kansotranslate('District Name'),
                                property: ['name'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('District Contact Name'),
                                property: ['contact', 'name'],
                                type: 'string'
                            },
                            {
                                label: $.kansotranslate('District Contact Phone'),
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
                            createFacility(db, callback, 'district_hospital');
                        },
                        remove: function(doc, callback) {
                            removeFacility(db, doc, callback);
                        },
                        removeConfirm: removeConfirm,
                        lockRows: lockRows
                    });
                }
            });
        });
    });

    var props = {
        tab: { 'districts': true }
    };

    var info = appinfo.getAppInfo.call(this, req);

    return {
        info: info,
        title: info.translate('Facilities'),
        content: templates.render('facilities.html', req, props)
    };
};

exports.reminders = function(doc, req) {
    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.

        setupContext(req, function(err) {
            if (err) {
                console.error('setupContext error', err);
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
        info: appinfo.getAppInfo.call(this, req),
        content: templates.render('loader.html', req, {})
    };
};

exports.config = function() {
    return {
        body: '' +
        '(function($) {\n' +
        '    var info,\n' +
        '        getInfo = ' + appinfo.getAppInfo.toString() + ';\n' +
        '    $.kansoconfig = function(key) { info = info || getInfo(); return info[key]; };\n' +
        '    $.kansotranslate = function(key, locale) { info = info || getInfo(); return info.translate(key, locale) };\n' +
        '})(jQuery);',
        headers: {
            'Content-Type': 'text/javascript'
        }
    };
};


var _submitConfiguration = function (_ev, data, _cb) {

    var _updateStatus = function(_data) {
        $(_ev.target).removeClass('disabled');
        var status = $(_ev.target).closest('.footer').find('.status');
        if (_data.success) {
            status
                .text('Saved')
                .show()
                .delay(2000)
                .fadeOut(400);
        } else {
            status
                .text('Save failed: ' + _data.error)
                .show();
        }
        if (_cb) {
            _cb(_data);
        }
    };

    _ev.stopPropagation();
    _ev.preventDefault();

    $(_ev.target).addClass('disabled');

    var baseURL = require('duality/core').getBaseURL();
    var url = baseURL.replace('/_rewrite', '') + 
        '/_update/update_config/_design%2F' + ddoc;

    $.ajax({
        method: 'PUT',
        data: JSON.stringify(data),
        contentType: 'application/json',
        dataType: 'json',
        url: url,
        success: _updateStatus,
        error: function (_xhr, _status, _err) {
            _updateStatus({ success: false, error: _err });
        }
    });

};

/**
 * configuration:
 */
exports.configuration = function (_doc, _req) {

    /* Client-side initialization begins here */
    events.once('afterResponse', function() {

        var _switchLocale = function () {
            var selector = $('#locale-selector');
            selector.data('language', selector.val());
            var language = $('#locale-selector').val();
            dirtyTranslations = false;
            _.each(info.translations, function(item) {
                $('[name="' + item.key + '"]').val(item[language]);
            });
            $('#translations-form textarea').autosize();
        };

        var _formatTime = function (_info) {
            _.each(['morning', 'evening'], function (_property) {
                var hours = info['schedule_' + _property + '_hours'];
                var minutes = info['schedule_' + _property + '_minutes'] + '';
                minutes = (minutes.length < 2 ? '0' : '') + minutes;
                $('#schedule-' + _property).val(hours + ':' + minutes);
            });
        };

        var _parseTime = function (_data) {
            _.each(['morning', 'evening'], function (_property) {
                var time = $('#schedule-' + _property).val().split(':');
                _data['schedule_' + _property + '_hours'] = time[0] || 0;
                _data['schedule_' + _property + '_minutes'] = time[1] || 0;
            });
        };

        if (!utils.isUserAdmin(_req.userCtx)) {
            return render403(_req);
        }

        utils.updateTopNav('configuration', 'Configuration');

        // explitely update fields that templating can't handle
        $('#language').val(info.locale);
        $('#accept-messages').prop('checked', !info.forms_only_mode);
        _formatTime(info);

        $('#configuration-form').on('click', '.submit', function (_ev) {

            var data = {
                locale: $('#language').val(),
                gateway_number: $('#gateway-number').val(),
                forms_only_mode: !$('#accept-messages').prop('checked'),
                reported_date_format: $('#date-display-format').val(),
                outgoing_phone_replace: {
                    match: $('#phone-filters-match').val(),
                    replace: $('#phone-filters-replace').val()
                }
            };

            _parseTime(data);

            _submitConfiguration(_ev, data);

        });

        $('a[data-toggle="tab"]').on('shown', function (e) {
            if ($(e.target).hasClass('autosize')) {
                $('#translations-form textarea').autosize();
            }
        });

        var dirtyTranslations = false;
        $('#discard-changes-confirmation .btn-primary').on('click', function(ev) {
            ev.preventDefault();
            $('#discard-changes-confirmation').modal('hide');
            _switchLocale();
        });
        $('#discard-changes-confirmation').on('hidden', function () {
            var selector = $('#locale-selector');
            selector.val(selector.data('language'));
        });
        $('#translations-form ul').on('change', function (_ev) {
            dirtyTranslations = true;
        });
        $('#locale-selector').on('change', function (_ev) {
            if (dirtyTranslations) {
                $('#discard-changes-confirmation').modal('show');
            } else {
                _switchLocale();
            }
        });

        $('#translations-form').on('click', '.submit', function (_ev) {
            var language = $('#locale-selector').val();
            var translations = [];
            _.each(info.translations, function(item) {
                item[language] = $('[name="' + item.key + '"]').val();
                translations.push(item);
            });
            var data = { translations: translations };
            _submitConfiguration(_ev, data, function (_data) {
                if (_data.success) {
                    dirtyTranslations = false;
                }
            });
        });
    });

    var info = appinfo.getAppInfo.call(this, _req);

    return {
        info: info,
        title: info.translate('Configuration'),
        content: templates.render('configuration.html', _req, {
            info: info
        })
    };
};

/**
 * users:
 */
exports.users = function (_doc, _req) {

    var baseURL = require('duality/core').getBaseURL(_req);

    /**
     * fetch_users:
     */
    var fetch_users = function (_callback) {

        $.ajax({
            url: '/_users/_all_docs?include_docs=true',
            success: function (_data, _text, _xhr) {

                var rv = [], data = JSON.parse(_data);

                if (!_.isArray(data.rows)) {
                    return _callback(
                        new Error('Database returned invalid user data')
                    );
                }

                _.each(data.rows, function (_row) {
                    if (_str.startsWith(_row.id, 'org.couchdb.user:')) {
                        rv.push(_row.doc);
                    }
                });

                return _callback(null, rv);
            },
            error: function (_xhr, _status, _err) {
                return _callback(_err);
            }
        });
    };

    /**
     * fetch_facilities:
     */
    var fetch_facilities = function (_callback) {

        $.ajax({
            url: baseURL + '/facilities.json',
            success: function (_data, _text, _xhr) {

                var rv = {}, data = JSON.parse(_data);

                if (!_.isArray(data.rows)) {
                    return _callback(
                        new Error('Database returned invalid facility data')
                    );
                }

                _.each(data.rows, function (_row) {
                    rv[_row.id] = _row.doc;
                });

                return _callback(null, rv);
            },
            error: function (_xhr, _status, _err) {
                return _callback(_err);
            }
        });
    };

    /**
     * select_facility_grouped:
     *   Use select2 to show a two-level list of facilities, with
     *   the first (upper, unselectable) level serving to group
     *   the available facilities by facility type.
     */
    var select_facility_grouped = function (_elt) {

        var term = '', ajax = {

            url: baseURL + '/facilities.json',

            data: function (_term, _page) {
                /* Always called before results, below */
                term = _term;
            },

            results: function (_data, _page) {

                var map = {};

                _.each(_data.rows, function (_row) {

                    var id = _row.id;
                    var type = _row.doc.type;
                    var text = _row.value.name;

                    if (!_.isString(id) || !_.isString(text)) {
                        return; /* continue; */
                    }

                    /* Client-side filtering:
                     *   We should be requesting data from couchdb-lucene
                     *   using a specific query, rather than pulling the
                     *   whole facility list and paring it down on the
                     *   client side. If you switch over to a server-side
                     *   search, you may want to remove this test.
                     */

                    if (term.length > 0) {
                        var l = _str.slugify(text),
                            r = _str.slugify(term);

                        if (!_str.contains(l, r)) {
                            return; /* continue; */
                        }
                    }

                    /* Create first-level headings */
                    if (!_.isObject(map[type])) {
                        map[type] = {
                            children: [],
                            text: $.kansotranslate(_str.titleize(_str.humanize(type)))
                        };
                    }

                    /* Create second-level items */
                    map[type].children.push({
                        id: id, text: text
                    });

                });

                /* Format as select2 expects */
                return { results: _.toArray(map) };
            }
        };

        $(_elt).select2({
            ajax: ajax,
            allowClear: true,
            minimumInputLength: 0,
            placeholder: 'Select a facility',

            /* Handler: map `_elt` to `{ id, text }` pair */
            initSelection: function (_elt, _callback) {

                fetch_facilities(function (_err, _facilities) {
                  return _callback({
                      id: _elt.val(),
                      text: _facilities[_elt.val()].name
                  });
                });
            }
        });
    };

    /**
     * populate_user:
     */
    var populate_user = function (_elt, _user) {

        var elt = $(_elt);
        var user = (_user || {});

        var properties = {
            _id: true, _rev: true, name: true,
              fullname: true, email: true, phone: true,
              language: true, facility_id: 'facility',
              salt: 'salt', derived_key: 'derived_key',
              password_scheme: 'password_scheme'
        }

        _.each(properties, function (_to, _from) {

            var val = user[_from];
            var elt = $('#' + (_to === true ? _from : _to));

            if (elt.hasClass('select2-offscreen')) {
                elt.select2('val', val);
            } else {
                elt.val(val);
            }
        });

        $('#password').val('');
        $('#type').select2('val', unmap_user_type(user.roles || []));

        if (user._id) {
            $('#name').prop('disabled', true);
            $('#save').val('Save Changes');
        } else {
            $('#name').prop('disabled', false);
            $('#save').val('Create User');
        }
    };

    /**
     * serialize_user:
     */
    var serialize_user = function () {

        var rv = {};

        var properties = {
            _id: true, _rev: true, name: true,
              fullname: true, email: true, password: true,
              phone: true, language: true, facility: 'facility_id',
              salt: 'salt', derived_key: 'derived_key',
              password_scheme: 'password_scheme'
        }

        _.each(properties, function (_to, _from) {

            var val, elt = $('#' + _from);

            if (elt.hasClass('select2-offscreen')) {
                val = elt.select2('val');
            } else {
                val = elt.val();
            }

            if (val !== null && val.length > 0) {
                rv[(_to === true ? _from : _to)] = val;
            }
        });

        rv.type = 'user';

        rv.roles = map_user_type($('#type').select2('val'));

        return rv;
    };

    /**
     * save_user:
     */
    var save_user = function (_user, _callback) {

        _callback = _callback || function() {};

        if (!_user._id) {
            if (!_user.name) {
                return _callback('You must specify a User Name');
            }
            _user._id = 'org.couchdb.user:' + _user.name;
        }

        $.ajax({
            method: 'PUT',
            dataType: 'json',
            data: JSON.stringify(_user),
            url: '/_users/' + _user._id,
            contentType: 'application/json',

            success: function (_data, _text, _xhr) {
                refresh_users(function (_err) {
                    _callback(_err, _data);
                });
            },

            error: function (_xhr, _status, _err) {
                _callback(_err);
            }
        });
    };

    /**
     * map_user_type:
     */
    var map_user_type = function (_type) {

        var map = {
            'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
            'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
            'facility-manager': ['kujua_user', 'data_entry'],
            'data-entry': ['data_entry'],
            'analytics': ['kujua_analytics'],
            'gateway': ['kujua_gateway']
        };

        var roles = map[_type];

        if (!roles) {
            return [];
        }

        if (!_.isArray(roles)) {
            roles = [ roles ];
        }

        /* User type is always first, by convention */
        return (roles ? [ _type ].concat(roles) : [ _type ]);
    };

    /**
     * unmap_user_type:
     */
    var unmap_user_type = function (_roles) {

        if (_roles.length <= 1) {
            return null;
        }

        /* User type is always first, by convention */
        return _roles[0];
    };

    /**
     * populate_users:
     */
    var populate_users = function (_elt, _users, _facilities) {

        var model = _.map(_users, function(user) {
            var serialized = JSON.stringify(user);
            var facility = (_facilities[user.facility_id] || {}).name || 'None';
            var type = _str.titleize(_str.humanize(
                unmap_user_type(user.roles || {}) || 'unknown'
            ));

            return _.extend(user, {
                serialized: serialized,
                facility: facility,
                type: type
            });
        });

        $(_elt).html(
            templates.render('users_list.html', {}, { users: model })
        );
    };

    /**
     * refresh_users:
     */
    var refresh_users = function (_callback) {

        fetch_facilities(function (_err, _facilities) {

            if (_err) {
                return (_callback ? _callback(_err) : false);
            }

            fetch_users(function (_e, _users) {

                if (_e) {
                    return (_callback ? _callback(_e) : false);
                }

                populate_users('#user-list tbody', _users, _facilities);

                if (_callback) {
                    _callback(null, _users, _facilities);
                }
            });
        });
    };

    /* Client-side initialization begins here */
    events.once('afterResponse', function() {

        if (!utils.isUserAdmin(_req.userCtx)) {
            return render403(_req);
        }

        refresh_users();

        $('#type').select2({
            allowClear: true,
            placeholder: 'Select a user type'
        });

        $('#language').select2({
            allowClear: true,
            placeholder: 'Select a default language'
        });

        select_facility_grouped('#facility');

        utils.updateTopNav('user-management', 'User Management');

        var userManagementModal = $('#user-management-modal');

        $('#add-user').on('click', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            populate_user('#user-creation', false);
            userManagementModal.find('.modal-header h3').text('Add User');
            userManagementModal.modal('show');
        });

        userManagementModal.on('click', '.submit', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            save_user(serialize_user(), function (_err) {
                if (_err) {
                    userManagementModal.find('.modal-footer .note').text(_err);
                } else {
                    userManagementModal.modal('hide');                
                }
            });
        });

        $('#user-list tbody').on('click', function (_ev) {
            if ($(_ev.target).closest('.btn').length) {
                _ev.stopPropagation();
                _ev.preventDefault();
            
                var tr = $(_ev.target).closest('tr');
                var user = JSON.parse(tr.attr('data-json'));

                if ($(_ev.target).closest('.delete').length) {
                    $('#user-delete-confirmation-label').text('Are you sure you want to delete ' + user.name + '? This operation cannot be undone.');
                    $('#user-delete-confirmation .btn-primary')
                        // remove previous click handlers
                        .off('click')
                        // register new click handler
                        .on('click', function(ev) {
                            ev.preventDefault();
                            $.ajax({
                                method: 'DELETE',
                                url: '/_users/' + user._id + '?rev=' + user._rev,

                                success: function(_data, _text, _xhr) {
                                    refresh_users();
                                    $('#user-delete-confirmation').modal('hide');
                                },

                                error: function(_xhr, _status, _err) {
                                    console.log('Failed to delete user', _err);
                                    alert('User could not be deleted');
                                }
                            });
                        });
                    $('#user-delete-confirmation').modal('show');

                } else if ($(_ev.target).closest('.edit').length) {
                    populate_user('#user-creation', user);
                    userManagementModal.find('.modal-header h3').text('Edit User');
                    userManagementModal.modal('show');
                }
            }

        });

    });

    var info = appinfo.getAppInfo.call(this, _req);

    return {
        info: info,
        title: info.translate('User Management'),
        content: templates.render('users.html', _req, {})
    };
}

exports.help = function (doc, req) {

    function loadSearchHelp() {
        // ick, change to using /_rewrite/ if possible
        var url = '/_fti/local' + db.current().url + '/_design/' + ddoc + '/data_records';
        if (cache.search_help_fields) {
            return success(cache.search_help_fields);
        }
        function success(data, text, xhr) {
            cache.search_help_fields = data;
            $('[data-page=help] .field-data').replaceWith(
                templates.render(
                    'help/search-fields.html', {}, {fields: data.fields.sort()}
                )
            );
        };
        function error(xhr, status, err) {
            $('[data-page=help] .fields-data').replaceWith(
                '<li>'+err+'</li>'
            );
        };
        $.ajax({
            url: url,
            success: success,
            error: error,
            dataType: 'json'
        });
    };

    function showSearchHelp(callback) {
        $('[data-page=help] #loader').replaceWith(
            templates.render('help/search.html', {}, {})
        );
        if (typeof callback === 'function') {
            callback();
        }
    };


    events.once('afterResponse', function () {
        var info = appinfo.getAppInfo.call(this, req);
        utils.updateTopNav('help');
        showSearchHelp(loadSearchHelp);
    });

    return {
        info: appinfo.getAppInfo.call(this, req),
        content: templates.render('loader.html', req, {})
    };
}
