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
    sms_utils = require('kujua-sms/utils'),
    pagination = require('kujua-pagination/pagination'),
    cookies = require('cookies'),
    logger = utils.logger,
    _ = require('underscore')._;

exports.sms_forms = function (doc, req) {

    events.on('afterResponse', function() {

        var db = require('db').current(),
            isAdmin = utils.isUserAdmin(req.userCtx),
            baseURL = require('duality/core').getBaseURL(),
            associated_district = utils.getUserDistrict(req.userCtx);

        $('.page-header h1').text('SMS Forms Data');
        $('.nav *').removeClass('active');
        $('.nav .home').addClass('active');
        $('.controls').hide();

        // render available downloads based on data available
        // user must either be admin or have associated district to view records
        if (isAdmin || associated_district) {
            var q = _.extend(viewParams(req.userCtx), {group: true});
            db.getView(
                'kujua-export',
                'data_record_form_keys_by_district',
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

    var params = querystring.parse($(location).attr('search')),
        req = dutils.currentRequest();

    if (err) {
        return alert(err);
    }

    var forms = _.map(data.rows, function(row) {
        var form = row.key[1],
            q = db.stringifyQuery(viewParams(req.userCtx, form));
        return {
            form: form,
            title: row.key[2],
            size: row.value,
            q: querystring.stringify(q)};
    });

    $('#forms').html(
        templates.render('sms_forms_data.html', {}, {
            forms: forms.length > 0 ? forms : null,
            q: querystring.stringify(q)
        })
    );

    // adjust download options based on locale value.  currently only
    // supporting French. TODO use locale value in userCtx instead of query
    // param.
    if (params.locale && ['FR','fr'].indexOf(params.locale) !== -1) {
      $('.form option').each(function(idx, el) {
          var option = $(el);
          var val = option.attr('value').split('.')[1];
          if ('xml?locale=fr' === val) {
            option.attr('selected','selected');
          }
      });
    }
};

var renderDoc = function(data, textStatus, jqXHR) {

    $('#docs-body').html(sd.makeHtml(data));
    var title = $('#docs-body h1:first-child').text();
    $('#docs-body h1:first-child').remove();
    $('.page-header h1').text(title);
    $('.controls').hide();
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
            };
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

var fieldsToHtml = function(keys, labels, data_record) {
    var fields = {
        headers: [],
        data: []
    };

    _.each(keys, function(key) {
        if(_.isArray(key)) {
            fields.headers.push({head: utils.titleize(key[0])});
            fields.data.push(_.extend(
                fieldsToHtml(key[1], labels, data_record[key[0]]),
                {isArray: true}
            ));
        } else {
            fields.headers.push({head: labels.shift()});
            fields.data.push({
                isArray: false,
                value: data_record[key]
            });
        }
    });

    return fields;
};

var makeDataRecordReadable = function(row) {
    var data_record = row.value;

    var sms_message = data_record.sms_message;
    if(sms_message) {
        sms_message.short_message = sms_message.message.substr(0, 40) + '...';
        sms_message.message = sms_message.message.replace(
                                new RegExp('#', 'g'), "<br />");
    }

    if(data_record.form) {
        var keys = sms_utils.getFormKeys(data_record.form);
        var labels = sms_utils.getLabels(keys, data_record.form, 'en');
        data_record.fields = fieldsToHtml(keys, labels, data_record);
    }

    data_record.reported_date = new Date(data_record.reported_date).
                                        toLocaleString().
                                        match(/^(.*\d{2}\:\d{2}\:\d{2})/)[1];

    return data_record;
};

var renderRecords = function(err, data) {

    var req = dutils.currentRequest();

    if (err) {
        return alert(err);
    }

    if (!data) {
        return $('#loader').html(
            templates.render(
                'data_records_table.html', {}, {data_records: []}
            )
        );
    }

    var rows = pagination.prepare(req, data.rows),
        rows = _.map(rows, makeDataRecordReadable);

    $('#loader').html(
        templates.render(
            'data_records_table.html', {}, {data_records: rows}
        )
    );

    if(req.query.filter) {
        $('.dropdown-menu.limits a').each(function(idx, link) {
            var perPage = $(link).attr('href').match(/perPage=(\d+)/)[1];
            $(link).replaceWith(
                '<a href="' + urlParams(perPage, req.query.filter) + '">'
                + perPage + '</a>');
        });
    }

    if ($('.edit').hasClass('active')) {
        $('.edit-col').show();
    } else {
        $('.edit-col').hide();
    };

};

// display district filter
var updateControls = function(userCtx) {

    var db = require('db').current();

    $('.controls').show();

    if(!utils.isUserAdmin(userCtx)) {
        return;
    }

    var q = {group: true};

    db.getView('kujua-export', 'data_records_by_district', q, function(err, data) {
        if (err) { return alert(err); }

        $('.dropdown-menu.district-hospitals').closest('div').show();
        $('.dropdown-menu.district-hospitals').html('');

        _.each(data.rows, function(dh) {
            var name = dh.key[1] || dh.key[0];
            var li = '<li><a href="' +
                     urlParams(pagination.perPage, dh.key[0]) +
                     '">' + name + '</a></li>';
            $('.dropdown-menu.district-hospitals').append(li);
        });
    });
};

var viewParams = function(userCtx, form) {

    var q = {},
        district = utils.getUserDistrict(userCtx),
        isAdmin = utils.isUserAdmin(userCtx);

    // admin views are not constrained by district
    if (isAdmin) { return q; }

    q = {
        startkey: [district],
        endkey: [district,{}]
    };

    if (form) {
        q = {
            startkey: [district, form],
            endkey: [district, form, {}]
        };
    }

    return q;
};

var urlParams = function(perPage, filter) {
    return '?perPage=' + perPage +
    '&amp;filter=' + filter +
    '&amp;limit=' + (parseInt(perPage, 10) + 1) +
    '&amp;startkey=%5B%22' + filter + '%22%5D';
};

exports.data_records = function(head, req) {

    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.
        var associated_district = utils.getUserDistrict(req.userCtx),
            isAdmin = utils.isUserAdmin(req.userCtx),
            db = require('db').current();

        $('.page-header h1').text('Records');
        $('.nav > *').removeClass('active');
        $('.nav .records').addClass('active');
        updateControls(req.userCtx);

        // user must either be admin or have associated district to view records
        if (isAdmin || associated_district) {
            db.getView(
                'kujua-export',
                'data_records_by_reported_date',
                viewParams(req.userCtx),
                renderRecords);
        } else {
             renderRecords(null, []);
        }
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
