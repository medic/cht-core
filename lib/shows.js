/**
 * Show functions to be exported from the design doc.
 */

var settings = require('settings/root'),
    querystring = require('querystring'),
    events = require('duality/events'),
    smsforms = require('views/lib/smsforms'),
    templates = require('duality/templates');

exports.sms_forms = function (doc, req) {

    events.on('afterResponse', function() {

        var db = require('db').current(),
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
                $(location).attr('href', '{baseURL}/'+url);
            });

        });
    });


    return {
        title: 'SMS Forms',
        settings: settings,
        content: templates.render('sms_forms.html', req, {})
    };
};

exports.docs = function (doc, req) {
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
