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
    events.on('afterResponse', function() {
        dataRecords.removeListeners();
        
        var db = require('db').current(),
            isAdmin = utils.isUserAdmin(req.userCtx),
            baseURL = require('duality/core').getBaseURL(),
            district = utils.getUserDistrict(req.userCtx),
            q = {startkey: [district], endkey: [district,{}], group: true};

        $('.page-header h1').text('SMS Forms Data');
        $('.nav *').removeClass('active');
        $('.nav .home').addClass('active');
        $('.page-header .controls').hide();

        // render available downloads based on data available
        // user must either be admin or have associated district to view records
        if (isAdmin || district) {
            q = isAdmin ? {group: true} : q;
            db.getView(
                'kujua-export',
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
    $('.nav *').removeClass('active');
    $('.nav .docs').addClass('active');

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
    var db = require('db').current(),
        req = dutils.currentRequest(),
        baseURL = require('duality/core').getBaseURL(req);

    if(userCtx.name) {
        $('.page-header .controls').show();
    }

    if(!utils.isUserAdmin(userCtx)) {
        return;
    }

    var q = {group: true};

    db.getView('kujua-export', 'data_records_by_district', q, function(err, data) {
        if (err) { return alert(err); }

        $('.dropdown-menu.district-hospitals').closest('div').show();
        $('.dropdown-menu.district-hospitals').html('');

        // update district-filter button to show current district name
        if (req.query.dh_name) {
            $('#district-filter a.btn').html(
                'District: <b>'
                +req.query.dh_name+'</b> <span class="caret"></span>');
        } else {
            $('#district-filter a.btn').html(
                'District <span class="caret"></span>');
        }

        _.each(data.rows, function(dh, idx) {
            var dh_id = dh.key[0],
                name = dh.key[1] || dh.key[0],
                q = db.stringifyQuery({
                        dh_id: dh_id,
                        dh_name: name
                    }),
                li = '<li><a href="'+baseURL+'/data_records?'
                         + querystring.stringify(q)
                         + '">' + name + '</a></li>';
            $('.dropdown-menu.district-hospitals').append(li);
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
            db = require('db').current();

        var q = _.extend(req.query, {
            descending: true
        });

        if (dh_id) {
            q['startkey'] = [dh_id,{}];
            q['endkey'] = [dh_id];
        }

        $('.page-header h1').text('Records');
        $('.nav > *').removeClass('active');
        $('.nav .records').addClass('active');

        updateControls(req.userCtx);
        dataRecords.init(req, district, isAdmin, dh_id);
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

exports.facilities = function (doc, req) {
    events.once('afterResponse', function () {
        dataRecords.removeListeners();

        $('.page-header h1').text('Facilities');
        $('.nav > *').removeClass('active');
        $('.nav .facilities').addClass('active');

        var db = require('db').current();
        var q = {
            startkey: ['clinic'],
            endkey: ['clinic', {}],
            include_docs: true
        };
        db.getView('kujua-export', 'facilities', q, function (err, data) {
            if (err) {
                return console.log(err);
            }
            var docs = _.map(data.rows, function (row) {
                return row.doc;
            });
            $('#facilities').spreadsheet({
                keys: [
                    'name',
                    'location_name',
                    'contact_name',
                    'contact_phone',
                    'health_center_name',
                    'health_center_phone'
                ],
                data: docs
            });
        });
    });
    return {
        title: 'Facilities',
        content: templates.render('facilities.html', req, {})
    };
};
