/**
 * Show functions to be exported from the design doc.
 */

var settings = require('settings/root'),
    querystring = require('querystring'),
    events = require('duality/events'),
    smsforms = require('views/lib/smsforms'),
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    utils = require('kujua-utils');

exports.sms_forms = function (doc, req) {

    events.on('afterResponse', function() {

        var db = require('db').current(),
            baseURL = require('duality/core').getBaseURL(),
            params = querystring.parse($(location).attr('href').split('?')[1]),
            forms = {};

        $('.page-header h1').text('SMS Forms Data');
        $('.nav *').removeClass('active');
        $('.nav .home').addClass('active');

        // render available downloads based on data available
        db.getView('kujua-export', 'sms_message_values', function(err, data) {
            if (err) {
                return alert(err);
            }
            for (var i = 0; i < data.rows.length; i++) {
                var key = data.rows[i].key[0];
                if (smsforms[key]) {
                  if (!forms[key])
                    forms[key] = {total: 0, schema: smsforms[key]};
                  forms[key].total++;
                }
            }
            var context = {
                forms: ($.isEmptyObject(forms) ? null : forms),
                iter: function(chk, ctx, bodies) {
                  var obj = ctx.current();
                  for (var k in obj) {
                    chk = chk.render(
                      bodies.block, ctx.push({key: k, value: obj[k]}));
                  }
                  return chk;
                }
            };

            $('#forms').html(
                templates.render('sms_forms_data.html', {}, context));

            // adjust download options based on locale value.  currently only
            // supporting French.
            if (params.locale && ['FR','fr'].indexOf(params.locale) !== -1) {
              $('.form option').each(function(idx, el) {
                  var option = $(el);
                  var val = option.attr('value').split('.')[1];
                  if ('xml?locale=fr' === val) {
                    option.attr('selected','selected');
                  }
              });
            }

            // bind to form download buttons
            $('#forms form').on('submit', function(ev) {
                ev.preventDefault();
                var url = $(this).find('option').filter(':selected').attr('value');
                $(location).attr('href', baseURL + '/' + url);
            });

        });
    });

    return {
        title: 'SMS Forms',
        settings: settings,
        content: templates.render('sms_forms.html', req, {})
    };
};

var renderDoc = function(data, textStatus, jqXHR) {

    utils.logger.debug('loading renderDoc');

    $('#docs-body').html(sd.makeHtml(data));
    var title = $('#docs-body h1:first-child').text();
    $('#docs-body h1:first-child').remove();
    $('.page-header h1').text(title);
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
    $('#docs-body code').each(function(idx, el) {
        if (idx === 0) {
            $(this).wrap($('<div/>').addClass('code-wrap-short'));
        } else {
            $(this).wrap($('<div/>').addClass('code-wrap'));
        }
    });
};

exports.docs = function (doc, req) {

    var page = req.query.page,
        dir = req.query.dir,
        baseURL = require('duality/core').getBaseURL(),
        url = baseURL + '/static/docs/';

    utils.logger.debug(['docs page', page]);
    utils.logger.debug(['docs url', url]);

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
        settings: settings,
        content: templates.render('docs.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};
