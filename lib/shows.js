/**
 * Show functions to be exported from the design doc.
 */

var querystring = require('querystring'),
    db = require('db'),
    events = require('duality/events'),
    dutils = require('duality/utils'),
    smsforms = require('views/lib/smsforms'),
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    utils = require('kujua-utils'),
    cookies = require('cookies'),
    logger = utils.logger,
    jsDump = require('jsDump'),
    dataRecords = require('./data_records'),
    _ = require('underscore')._;

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
        if (isAdmin || district) {
            q = isAdmin ? {group: true} : q;
            utils.getView(
                null,
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
            dh_name = row.key[2],
            q = db.stringifyQuery({
                    startkey: [dh_id, form],
                    endkey: [dh_id, form, {}],
                    form: form,
                    include_docs: true,
                    reduce: false,
                    dh_name: dh_name});
        return {
            dh_id: dh_id,
            form: form,
            dh_name: dh_name,
            title: row.key[3],
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
        if (isAdmin || district) {
            q = isAdmin ? {group: true} : q;
            utils.getView(
                null,
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

    // wrap code with overflow auto
    var limit = 860;
    $('#docs-body code').each(function(idx, el) {
        var _el  = $(this);
        var width = _el.width();
        if (_el.hasClass('shorten')) {
            _el.wrap($('<div/>').addClass('scroll-short'));
        } else if (width > limit) {
            _el.wrap($('<div/>').addClass('scroll'));
        }
    });
};

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
    
    var noneLink = '<li><a href="' + baseURL + '/data_records">None</a></li>';

    $('.dropdown-menu.forms').html(noneLink).closest('div').show();
    $('#form-filter a.btn')
        .html('Form' +
            (form ? ': <b>' + form + '</b>' : '') +
            ' <span class="caret"></span>')
        .click(function() { $('.dropdown-menu.district-hospitals').hide(); });
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
            ' <span class="caret"></span>')
        .click(function() { $('.dropdown-menu.forms').hide(); });
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
    
    utils.getView(null, 'data_records_by_district_and_form', {group: true},
        function(err, data) {
            if (err) { return alert(err); }
            _.each(data.rows, function(row) {
                q = _.extend(_.clone(_q), {form: row.key[1]});
                $('.dropdown-menu.forms').append(template(q, row.key[1]));
            });
    });

    utils.getView(null, 'data_records_by_district', 
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
        $('.dropdown-toggle').siblings().hide();
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

exports.clinics = function (doc, req) {
    events.once('afterResponse', function () {
        dataRecords.removeListeners();

        $('.page-header h1').text('Facilities');
        $('.navbar .nav > *').removeClass('active');
        $('.navbar .nav .facilities').addClass('active');
        $('.page-header .controls').hide();

        var q, view;
        if (_.indexOf(req.userCtx.roles, '_admin') !== -1 ||
            _.indexOf(req.userCtx.roles, 'national_admin') !== -1) {
            view = 'facilities';
            q = {
                startkey: ['clinic'],
                endkey: ['clinic', {}],
                include_docs: true
            };
        }
        else if (_.indexOf(req.userCtx.roles, 'district_admin') !== -1) {
            var district = req.userCtx.name.toLowerCase();
            view = 'facilities_by_district';
            q = {
                startkey: [district, 'clinic'],
                endkey: [district, 'clinic', {}],
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
        utils.getView(null, view, q, function (err, data) {
            if (err) {
                return logger.error(err);
            }
            var docs = _.map(data.rows, function (row) {
                return row.doc;
            });
            $('#facilities').spreadsheet({
                columns: [
                    {
                        label: 'Name and Surname',
                        property: ['contact', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Health Center',
                        property: ['parent', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Village',
                        property: ['name'],
                        type: 'string'
                    },
                    {
                        label: 'RC Code',
                        property: ['contact', 'rc_code'],
                        type: 'string'
                    },
                    {
                        label: 'Phone',
                        property: ['contact', 'phone'],
                        type: 'string'
                    }
                ],
                data: docs,
                save: function (doc, callback) {
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

        $('.page-header h1').text('Facilities');
        $('.navbar .nav > *').removeClass('active');
        $('.navbar .nav .facilities').addClass('active');
        $('.page-header .controls').hide();

        var q, view;
        if (_.indexOf(req.userCtx.roles, '_admin') !== -1 ||
            _.indexOf(req.userCtx.roles, 'national_admin') !== -1) {
            view = 'facilities';
            q = {
                startkey: ['health_center'],
                endkey: ['health_center', {}],
                include_docs: true
            };
        }
        else if (_.indexOf(req.userCtx.roles, 'district_admin') !== -1) {
            var district = req.userCtx.name.toLowerCase();
            view = 'facilities_by_district';
            q = {
                startkey: [district, 'health_center'],
                endkey: [district, 'health_center', {}],
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
        utils.getView(null, view, q, function (err, data) {
            if (err) {
                return logger.error(err);
            }
            var docs = _.map(data.rows, function (row) {
                return row.doc;
            });
            $('#facilities').spreadsheet({
                columns: [
                    {
                        label: 'Name and Surname',
                        property: ['contact', 'name'],
                        type: 'string'
                    },
                    {
                        label: 'Health Center',
                        property: ['name'],
                        type: 'string'
                    },
                    {
                        label: 'RC Code',
                        property: ['contact', 'rc_code'],
                        type: 'string'
                    },
                    {
                        label: 'Phone',
                        property: ['contact', 'phone'],
                        type: 'string'
                    }
                ],
                data: docs,
                save: function (doc, callback) {
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
                }
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
