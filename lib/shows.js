/**
 * Show functions to be exported from the design doc.
 */

var querystring = require('querystring'),
    db = require('db'),
    sha1 = require('sha1'),
    events = require('duality/events'),
    dutils = require('duality/utils'),
    jsonforms  = require('views/lib/jsonforms'),
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    utils = require('kujua-utils'),
    cookies = require('cookies'),
    logger = utils.logger,
    jsDump = require('jsDump'),
    dataRecords = require('./data_records'),
    _ = require('underscore')._,
    settings = require('settings/root'),
    ddoc = settings.name;

exports.sms_forms = function (doc, req) {

    events.once('afterResponse', function() {

        var isAdmin = utils.isUserAdmin(req.userCtx),
            baseURL = require('duality/core').getBaseURL(),
            district = utils.getUserDistrict(req.userCtx),
            q = {startkey: [district], endkey: [district,{}], group: true};

        $('.page-header h1').text('SMS Forms Data');
        $('.navbar .nav *').removeClass('active');
        $('.navbar .nav .home').addClass('active');
        $('.page-header .controls').hide();

        // render available downloads based on data available
        // user must either be admin or have associated district to view records
        var db = require('db').current();
        if (isAdmin || district) {
            q = isAdmin ? {group: true} : q;
            db.getView(
                ddoc,
                'data_records_valid_by_district_and_form',
                q,
                renderDownloadForms);
        } else {
            renderDownloadForms(null, []);
        }
    });

    return {
        title: 'SMS Forms',
        content: templates.render('sms_forms.html', req, {})
    };
};

var renderDownloadForms = function(err, data) {
    var req = dutils.currentRequest();

    if (err) {
        return alert(err);
    }

    var forms = _.map(data.rows, function(row) {
        var dh_id = row.key[0],
            form = row.key[1],
            def = jsonforms[form],
            dh_name = row.key[2],
            title = '',
            q = db.stringifyQuery({
                    startkey: [dh_id, form],
                    endkey: [dh_id, form, {}],
                    form: form,
                    include_docs: true,
                    reduce: false,
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
            q: querystring.stringify(q)};
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
          if (val.match(/xml\?locale=fr/)) {
            option.attr('selected','selected');
          }
      });
    //}
};

exports.sms_forms = function (doc, req) {
    events.once('afterResponse', function() {
        dataRecords.removeListeners();

        var isAdmin = utils.isUserAdmin(req.userCtx),
            baseURL = require('duality/core').getBaseURL(),
            district = utils.getUserDistrict(req.userCtx),
            q = {startkey: [district], endkey: [district,{}], group: true};

        $('.page-header h1').text('SMS Forms Data');
        $('.navbar .nav *').removeClass('active');
        $('.navbar .nav .home').addClass('active');
        $('.page-header .controls').hide();

        // render available downloads based on data available
        // user must either be admin or have associated district to view records
        var db = require('db').current();
        if (isAdmin || district) {
            q = isAdmin ? {group: true} : q;
            db.getView(
                ddoc,
                'data_records_valid_by_district_and_form',
                q,
                renderDownloadForms);
        } else {
            renderDownloadForms(null, []);
        }
    });

    return {
        title: 'SMS Forms',
        content: templates.render('sms_forms.html', req, {})
    };
};

var renderDoc = function(data, textStatus, jqXHR) {
    $('#docs-body').html(sd.makeHtml(data));
    var title = $('#docs-body h1:first-child').text();
    $('#docs-body h1:first-child').remove();
    $('.page-header h1').text(title);
    $('.page-header .controls').hide();
    $('.navbar .nav *').removeClass('active');
    $('.navbar .nav .docs').addClass('active');

    // render TOC unless no sub headers
    if ($('#docs-body h2').get(0)) {
      var ul = $('<ul/>');
      $('#docs-body h2, #docs-body h3').each(function(idx, el) {
        var header = $(el),
            title = header.text(),
            id = header.attr('id');
        if (el.tagName === 'H2') {
          ul.append(
            $('<li/>').append(
              $('<a/>').attr('href', '#'+id).text(title)));
        } else {
          ul.append(
            $('<li class="subhead"/>').append(
              $('<a/>').attr('href', '#'+id).text(title)));
        }
      });
      $('.sections').append(ul);
      $('.sections').show();
    } else {
      $('.sections').hide();
    }

    // make large images zoomable
    $('#docs-body img').each(function(idx, el) {
        var t =  $("<img/>"),
            width = 0,
            height = 0;
        t.attr("src", $(el).attr("src"));
        t.load(function() {
            width = this.width;
            height = this.height;
            $(el).parent().addClass('images');
            if (width > 960) {
              $(el).parent().addClass('zoom');
              $(el).parent().bind('click', function() {
                var p = $(this);
                if (p.attr('style')) {
                  p.attr('style',null);
                } else {
                  p.css({'width': width});
                }
              });
            }
        });
    });


    var createUserDoc = function(username, password, properties, callback) {
        var doc = {};
        doc._id = 'org.couchdb.user:' + username;
        doc.name = username;
        doc.type = 'user';

        _.extend(doc, properties);

        db.newUUID(100, function (err, uuid) {
            if (err) {
                return callback(err);
            }
            doc.salt = uuid;
            doc.password_sha = sha1.hex(password + doc.salt);
            callback(undefined, doc);
        });
    };

    $('#createuser').submit(function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var form = $(this),
            error = false,
            username = form.find('[name=username]'),
            password = form.find('[name=password]'),
            props = {roles: [], locale: 'en', kujua_facility: ''};
        if (_.isEmpty(username.val())) {
            username.parents('.control-group').addClass('error');
            error = true;
        };
        if (_.isEmpty(password.val())) {
            password.parents('.control-group').addClass('error');
            error = true;
        };
        if (!error) {
            form.find('.control-group').removeClass('error');
            createUserDoc(username.val(), password.val(), props, function(err, doc) {
                if (err) {
                    logger.error(err);
                    alert(err);
                } else {
                    $('#createuser-output').html(JSON.stringify(doc, null, 4)).show();
                }
            });
        }
    });

    if ($('#supportedforms').get(0)) {
        renderFormExamples();
    }

};

var renderFormExamples = function() {
    var div = $('<div id="formslist"/>'),
        req = {},
        // annoying https://github.com/akdubya/dustjs/issues/9
        context = {
          iter: function(chk, ctx, bodies) {
              var obj = ctx.current();
              for (var k in obj) {
                chk = chk.render(bodies.block, ctx.push({key: k, value: obj[k]}));
              }
              return chk;
          },
          forms: {}};

    // massage context a bit
    _.each(jsonforms , function(form, key) {
        context.forms[key] = {
            title: utils.localizedString(form.meta.label),
            examples: form.examples
        };
    });
    $('#supportedforms + p').after(
        templates.render('docs/example_messages.html', req, context)
    ).trigger('docsPageLoaded');
}

exports.docs = function (doc, req) {
    var page = req.query.page,
        dir = req.query.dir,
        baseURL = require('duality/core').getBaseURL(),
        url = baseURL + '/static/docs/';

    // todo support more subdirs
    if (dir && page) {
        url += dir + '/' + page + '.md';
    } else if (dir) {
        url += dir + '/index.md';
    } else if (page) {
        url += page + '.md';
    } else {
        url += 'index.md';
    }

    /*
     * strange bug, this needs to be called with 'once' otherwise it gets
     * called on every request there after.
     */
    events.once('afterResponse', function() {
        dataRecords.removeListeners();

        $.ajax({
            url: url,
            success: renderDoc,
            error: function(jqXHR, textStatus, errorThrown) {
              alert(textStatus + ' ' + errorThrown);
            }
        });

    });

    return {
        title: 'Docs',
        content: templates.render('docs.html', req, {})
    };
};

// display district filter
var updateControls = function(userCtx) {
    var req = dutils.currentRequest(),
        baseURL = require('duality/core').getBaseURL(req),
        dh_name = req.query.dh_name,
        dh_id = req.query.dh_id,
        form = req.query.form,
        q,
        _q = {};

    if(userCtx.name) {
        $('.page-header .controls').show();
    }

    if(!utils.isUserAdmin(userCtx)) {
        return;
    }

    var noneLink = '<li><a href="' + baseURL + '/data_records">Show All</a></li>';

    $('.dropdown-menu.forms').html(noneLink).closest('div').show();
    $('#form-filter a.btn')
        .html('Form' +
            (form ? ': <b>' + form + '</b>' : '') +
            ' <span class="caret"></span>');
    if(dh_id) {
        q = {dh_id: dh_id, dh_name: dh_name};
        $('.dropdown-menu.forms a').attr('href', baseURL +
            '/data_records?' + querystring.stringify(q));
        _q.dh_id = dh_id;
        _q.dh_name = dh_name;
    }

    $('.dropdown-menu.district-hospitals').html(noneLink).closest('div').show();
    $('#district-filter a.btn')
        .html('District' +
            (dh_name ? ': <b>' + dh_name + '</b>' : '') +
            ' <span class="caret"></span>');
    if(form) {
        q = {form: form};
        $('.dropdown-menu.district-hospitals a').attr('href', baseURL +
            '/data_records?' + querystring.stringify(q));
        _q.form = form;
    }

    var template = function(query, title) {
        return '<li><a href="' + baseURL + '/data_records?' +
                querystring.stringify(query) + '">'
                + title + '</a></li>';
    };

    var db = require('db').current();
    db.getView(ddoc, 'data_records_by_district_and_form', {group: true},
        function(err, data) {
            if (err) { return alert(err); }
            _.each(data.rows, function(row) {
                q = _.extend(_.clone(_q), {form: row.key[1]});
                $('.dropdown-menu.forms').append(template(q, row.key[1]));
            });
    });

    db.getView(ddoc, 'data_records_by_district',
        {group: true}, function(err, data) {
            if (err) { return alert(err); }

            _.each(data.rows, function(dh) {
                var dh_id = dh.key[0],
                    name = dh.key[1] || dh.key[0];

                q = _.extend(_q, {
                        dh_id: dh_id,
                        dh_name: name
                    });

                $('.dropdown-menu.district-hospitals').append(template(q, name));
            });
    });
    $(document).unbind('save-record');
    $(document).bind('save-record', function(e, record) {
      // revalidate facilities ... should be a util function somehow?
      record.errors = _.reduce(record.errors, function(errors, error) {
        if (!(error.code === 'facility_not_found' && record.related_entities.clinic)) {
          errors.push(error);
        }
        return errors;
      }, []);
      db.saveDoc(record, function(err) {
        if (err) {
          alert(err);
        }
      });
    });
};

exports.data_records = function(head, req) {
    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.
        var district = utils.getUserDistrict(req.userCtx),
            isAdmin = utils.isUserAdmin(req.userCtx),
            dh_id = district ? district : req.query.dh_id,
            form = req.query.form;

        var q = _.extend(req.query, {
            descending: true
        });

        if (dh_id) {
            q['startkey'] = [dh_id,{}];
            q['endkey'] = [dh_id];
        }

        $('.page-header h1').text('Records');
        $('.navbar .nav > *').removeClass('active');
        $('.navbar .nav .records').addClass('active');

        updateControls(req.userCtx);
        dataRecords.init(req, district, isAdmin, dh_id, form);
        dataRecords.addListeners();
    });

    return {
        content: templates.render('data_records.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};

var updateTopNav = function(key) {
    $('.page-header h1').text('Facilities');
    $('.navbar .nav > *').removeClass('active');
    $('.navbar .nav .' + key).addClass('active');
    $('.page-header .controls').hide();
};

var cache = {};

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

exports.clinics = function (doc, req) {
    events.once('afterResponse', function () {
        dataRecords.removeListeners();
        updateTopNav('facilities');

        var q, view;
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
            var district = req.userCtx.name.toLowerCase();
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
                if(row.key[1]) {
                    cache.health_center_names.push(row.key[1]);
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
                        label: 'Village Name',
                        property: ['name'],
                        type: 'string'
                    },
                    {
                        label: 'Contact Name',
                        property: ['contact', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Contact Phone',
                        property: ['contact', 'phone'],
                        type: 'string',
                        validation: 'phone'
                    },
                    {
                        label: 'RC Code',
                        property: ['contact', 'rc_code'],
                        type: 'string'
                    },
                    {
                        label: 'Health Center',
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
                        if (doc.parent && row.key[1] === doc.parent.name) {
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
    return {
        title: 'Facilities',
        content: templates.render('facilities.html', req, {
            tab: {'clinics': true}
        })
    };
};


exports.health_centers = function (doc, req) {
    events.once('afterResponse', function () {

        var db = require('db').current(),
            q = {},
            q_dh = {},
            view = '';

        dataRecords.removeListeners();
        updateTopNav('facilities');

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
            var district = req.userCtx.name.toLowerCase();
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
                if(row.key[1]) {
                    cache.district_names.push(row.key[1]);
                }
            });
        });

        var notused_typeaheadHandler = function () {
            // setup listeners for district input
            $(document).on('focus', '#facilities input.district', function(ev) {
                // options for bootstrap typeahead plugin.
                var cell = $(this);
                cell.attr('data-provide', 'typeahead');
                cell.typeahead({
                    // source is a list of strings for the typeahead
                    source: _.map(cache.districts, function(doc) {
                        return doc.key[1];
                    }),
                    items: 20
                });
            });
        };

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
                        label: 'Name',
                        property: ['name'],
                        type: 'string'
                    },
                    {
                        label: 'Contact Name',
                        property: ['contact', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Contact Phone',
                        property: ['contact', 'phone'],
                        type: 'string',
                        validation: 'phone'
                    },
                    {
                        label: 'District',
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
                        if (doc.parent && row.key[1] === doc.parent.name) {
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

    return {
        title: 'Facilities',
        content: templates.render('facilities.html', req, {
            tab: {'health_centers': true}
        })
    };
};

exports.districts = function (doc, req) {
    events.once('afterResponse', function () {

        dataRecords.removeListeners();
        updateTopNav('facilities');

        var db = require('db').current(),
            view = 'facilities',
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
            var district = req.userCtx.name.toLowerCase();
            view = 'facilities_by_district';
            q = {
                startkey: [district, 'district_hospital'],
                endkey: [district, 'district_hospital', {}],
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
                        label: 'Name',
                        property: ['name'],
                        type: 'string'
                    },
                    {
                        label: 'Contact Name',
                        property: ['contact', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Contact Phone',
                        property: ['contact', 'phone'],
                        type: 'string',
                        validation: 'phone'
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
                }
            });
        });
    });
    return {
        title: 'Facilities',
        content: templates.render('facilities.html', req, {
            tab: {'districts': true}
        })
    };
};
