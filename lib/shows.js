/**
 * Show functions to be exported from the design doc.
 */

var db = require('db'),
    events = require('duality/events'),
    dutils = require('duality/utils'),
    templates = require('duality/templates'),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    migrations = require('js-migrations'),
    moment = require('moment'),
    _ = require('underscore'),
    appinfo = require('views/lib/appinfo'),
    users = require('users'),
    configuration = require('./show-includes/configuration'),
    ddoc = 'medic',
    district,
    isAdmin;

var render403 = exports.render403 = function(req, msg) {
    $('#content').html(templates.render('403.html', req, {}));
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
        $('#feedback-wrapper').html(templates.render('feedback_admin.html', req, {}));
        callback();
    });
};

exports.inbox = function(doc, req) {
    return {
        body: templates.render('inbox.html', req, {
            info: appinfo.getAppInfo.call(this, req)
        })
    };
};

exports.not_found = function (doc, req) {

    var info = appinfo.getAppInfo.call(this, req);
    require('./dust-helpers');

    return {
        code: 404,
        info: info,
        content: templates.render('404.html', req, {})
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
