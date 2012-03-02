/**
 * Show functions to be exported from the design doc.
 */

var settings = require('settings/root'),
    querystring = require('querystring'),
    events = require('duality/events'),
    smsforms = require('views/lib/smsforms'),
    templates = require('duality/templates'),
    showdown = require('showdown'),
    sd = new showdown.converter();

exports.sms_forms = function (doc, req) {

    events.on('afterResponse', function() {

        var db = require('db').current(),
            baseURL = require('duality/core').getBaseURL(),
            params = querystring.parse($(location).attr('href').split('?')[1]),
            forms = {};

        $('.page-header h1').text('SMS Forms Data');
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

var renderDoc = function(data) {

    log('loading renderDoc');
    $('#docs-body').html(sd.makeHtml(data));
    $('#docs-body h1:first-child').remove();
    $('.page-header h1').text(title);
    $('.nav .docs').addClass('active');

    // render TOC unless loading the index
    if (page) {
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
};

exports.docs = function (doc, req) {

    var page = req.query.page || 'index';
    log(['hello! page', page]);

    events.on('afterResponse', function() {

        log('loading afterResponse');
        console.log('page');
        console.log(page);

        /*
        var title = $('#docs-body h1:first-child').text(),
            baseURL = require('duality/core').getBaseURL();

        $.ajax({
            url: '../../docs/'+ page +'.md',
            success: renderDoc,
            error: function(jqXHR, textStatus, errorThrown) {
              alert(textStatus + ' ' + errorThrown);
            }
        });
        */

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
