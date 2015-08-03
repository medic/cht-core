/**
 * Configuration show functions to be exported from the design doc.
 */
var _ = require('underscore'),
    showdown = require('showdown'),
    sd = new showdown.converter(),
    events = require('duality/events'),
    templates = require('duality/templates'),
    utils = require('kujua-utils'),
    appinfo = require('views/lib/appinfo'),
    settings = require('settings/root'),
    moment = require('moment'),
    shows = require('../shows'),
    ddoc = settings.name;

var standard_date_formats = [
    'DD-MMM-YYYY',
    'DD/MM/YYYY',
    'MM/DD/YYYY'
];

var standard_datetime_formats = [
    'DD-MMM-YYYY HH:mm:ss',
    'DD/MM/YYYY HH:mm:ss',
    'MM/DD/YYYY HH:mm:ss'
];

var _getWorkflows = function(_info) {
    return _.map(_info.schedules, function(_schedule) {
        var name = _schedule.name;
        var workflow = { schedule: _schedule };
        if (_schedule.description) {
            workflow.description = sd.makeHtml(_schedule.description);
        }
        workflow.registrations = _.filter(
            _info.registrations, 
            function(_registration) {
                return _.some(_registration.events, function(_event) {
                    return _event.trigger === 'assign_schedule' 
                        && _event.params === name;
                }
            );
        });
        workflow.patient_reports = _.filter(
            _info.patient_reports, 
            function(_report) {
                return _report.silence_type === name;
            }
        );
        return workflow;
    });
};

var _submitConfiguration = function (options, _callback) {

    var _updateStatus = function(_form, _data) {
        var footer = _form.find('.footer');
        footer.find('.btn').removeClass('disabled');
        var status = footer.find('.status');
        if (_data.success) {
            _resetTranslated(_form);
            footer.removeClass('error');
            status
                .text(options.info.translate('Saved'))
                .show()
                .delay(2000)
                .fadeOut(400);
        } else {
            footer.addClass('error');
            status
                .text(options.info.translate('Save failed') + ': ' + _data.error)
                .show();
        }
        if (_callback) {
            _callback(_data);
        }
    };

    options.event.stopPropagation();
    options.event.preventDefault();

    var target = $(options.event.target);
    target.addClass('disabled');
    var form = target.closest('form');

    form.find('.error-message').remove();
    form.find('.error').removeClass('error');
    if (options.validation) {
        var valid = options.validation(options.data);
        if (!valid.valid) {
            _.each(valid.errors, function(_error) {
                var field = $(_error.field);
                field.addClass('error');
                field.prepend(
                    '<div class="error-message help-block">' + 
                        _error.error + 
                    '</div>'
                );
                field.parents('.toggle:not(.expanded)').addClass('expanded');
            });
            return _updateStatus(form, { 
                success: false, 
                error: options.info.translate('Failed validation')
            });
        }
    }

    var baseURL = require('duality/core').getBaseURL();

    $.ajax({
        type: 'PUT',
        data: JSON.stringify(options.data),
        contentType: 'application/json',
        dataType: 'json',
        url: baseURL + '/update_settings/' + ddoc,
        success: function(_data) {
            _updateStatus(form, _data);
        },
        error: function (_xhr, _status, _err) {
            _updateStatus(form, { success: false, error: _err });
        }
    });

};

var _parseInt = function (_int, _default) {
    _default = _default || 0;
    if (!_int) {
        return _default;
    }
    try {
        return parseInt(_int);
    } catch(e) {
        return _default;
    }
}

var _formatTime = function (_hours, _minutes) {
    var hours = _parseInt(_hours);
    var minutes = Math.round(_parseInt(_minutes) / 5) * 5;
    return {
        hours: hours + '',
        minutes: minutes + ''
    };
};

var _resetTranslated = function(_form) {
    _form.find('.translated').each(function() {
        var textarea = $(this);
        textarea.data('message', textarea.val());
    });
};

var _hasDirtyTranslations = function(_form) {
    var dirty = false;
    _form.find('.translated').each(function() {
        if ($(this).val() != $(this).data('message')) {
            dirty = true;
        }
    });
    return dirty;
};

var _repeatingEvents = function($wrapper) {
    $wrapper
        .on('click', '.repeat-container .add', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            var container = $(_ev.target).closest('.repeat-container');
            var template = container.find('> .repeat-template').clone();
            template.removeClass('repeat-template').addClass('repeat-element');
            $(_ev.target).closest('p').before(template);
        })
        .on('click', '.repeat-container .remove', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            $(_ev.target).closest('.repeat-element').remove();
        });
};

var _setupTabs = function() {
    var tabPrefix = 'tab-';
    var hash = location.hash;
    if (hash) {
        var href = hash.replace(tabPrefix, '');
        $('.nav-tabs a[href=' + href + ']').tab('show');
    }
    $('.nav-tabs a').on('shown.bs.tab', function(e) {
        var location = e.target.hash.replace('#', '#' + tabPrefix);
        if (history.pushState) {
            history.pushState(null, null, location);
        } else {
            location.hash = location;
        }
    });
};

/**
 * workflows:
 */
exports.workflows = function (_doc, _req) {

    /* Client-side initialization begins here */
    events.once('afterResponse', function() {
        shows.setupContext(_req, function() {
            if (!utils.isDbAdmin(_req.userCtx)) {
                return shows.render403(_req, 'You must be an admin to access this page.');
            }
            utils.updateTopNav('schedules', info.translate('Schedules'));
        });
    });

    var info = appinfo.getAppInfo.call(this, _req);
    require('../dust-helpers');

    return {
        info: info,
        content: templates.render('workflow/workflows.html', _req, {
            workflows: _getWorkflows(info)
        })
    };
};

/**
 * workflow:
 */
exports.workflow = function (_doc, _req) {

    /* Client-side initialization begins here */
    events.once('afterResponse', function() {
        shows.setupContext(_req, function() {
            if (!utils.isDbAdmin(_req.userCtx)) {
                return shows.render403(_req, 'You must be an admin to access this page.');
            }

            _setupTabs();

            utils.updateTopNav('schedules', info.translate('Schedule name', { name: workflow.schedule.name }));

            _repeatingEvents($('#workflow-content'));

            $('#workflow-content').on('click', '.toggle-head', function (_ev) {
                _ev.stopPropagation();
                _ev.preventDefault();
                $(_ev.target).closest('.toggle').toggleClass('expanded');
            });

            $('#workflow-content').on('change', '[name=offset_unit]', function(_ev) {
                var target = $(_ev.target);
                var show = target.val() !== 'minutes' && target.val() !== 'hours';
                target.closest('.message').find('.send_time').toggle(show);
            });

            var selector;
            var _switchLocale = function () {
                var language = selector.val();
                selector.data('language', language);
                var form = selector.closest('form');
                form.find('.translated').each(function() {
                    var textarea = $(this);
                    var messages = textarea.data('messages');
                    textarea.val(_findMessage(messages, language));
                });
                _resetTranslated(form);
            };

            $('#discard-changes-confirmation .btn-primary').on('click', function(ev) {
                ev.preventDefault();
                $('#discard-changes-confirmation').modal('hide');
                _switchLocale();
            });
            $('#discard-changes-confirmation').on('hidden', function () {
                var selector = $('.locale-selector');
                selector.val(selector.data('language'));
            });
            $('.locale-selector').on('change', function (_ev) {
                selector = $(_ev.target);
                if (_hasDirtyTranslations(selector.closest('form'))) {
                    $('#discard-changes-confirmation').modal('show');
                } else {
                    _switchLocale(_ev);
                }
            });
            $('select[name=start_from]').on('change', function(_ev) {
                var name = $(_ev.target).find(':selected').text();
                $('.date-property-name').text(name);
            });

            var _mergeMessages = function (_elem) {
                var locale = _elem.closest('form').find('.locale-selector').val();
                var messages = _elem.data('messages') || [];
                var message = _.find(messages, function(_message) {
                    return _message.locale === locale;
                });
                if (!message) {
                    message = { locale: locale }
                    messages.push(message);
                }
                message.content = _elem.val();
                return messages;
            };

            var _getValidations = function (_elem) {
                var validations = [];
                _elem.find('.repeat-element').each(function() {
                    validations.push({
                        property: $(this).find('[name=property]').val(),
                        rule: $(this).find('[name=rule]').val(),
                        message: _mergeMessages($(this).find('[name=content]'))
                    });
                });
                return validations;
            };

            var _updateRegistration = function (_data) {
                $('#workflow-incoming .registration').each(function(_idx) {
                    var elem = $(this);
                    var registration = _findForm(
                        _data.registrations, elem.data('form')
                    );
                    registration.validations.list = _getValidations(elem);
                    registration.messages[0].message = _mergeMessages(
                        elem.find('.responses [name=content]')
                    );
                });
            };

            var _updatePatientReports = function (_data) {
                $('#workflow-incoming .report').each(function() {
                    var elem = $(this);
                    var form = _findForm(
                        _data.patient_reports, elem.data('form')
                    );
                    form.validations.list = _getValidations(elem);
                    form.silence_for = elem.find('[name=silence-value]').val() + 
                        ' ' + elem.find('[name=silence-unit]').val();
                    form.silence_type = workflow.schedule.name;
                    var messages = [];
                    elem.find('.response').each(function() {
                        var message = $(this).find('[name=message]');
                        if (message.val()) {
                            messages.push({
                                message: _mergeMessages(message),
                                event_type: $(this).find('[name=event_type]').val(),
                                recipient: 'reporting_unit'
                            });
                        }
                    });
                    form.messages = messages;
                });
            };

            var _validTime = function (_time) {
                if (!_time) {
                    return true;
                }
                _time = _time.split(' ')[0];
                return !isNaN(Number(_time));
            };

            $('#workflow-incoming').on('click', '.submit', function (_ev) {
                var data = _.pick(info, 'registrations', 'patient_reports');
                _updateRegistration(data);
                _updatePatientReports(data);
                _submitConfiguration({ event: _ev, data: data, info: info }, function (_data) {
                    var errors = [];

                    _.each(_data.patient_reports, function(_report, _idx) {
                        if (!_validTime(_report.silence_for)) {
                            errors.push({
                                field: '#workflow-incoming .report:nth-child(' + (_idx + 2) + ') .silence',
                                error: info.translate('The unit must be an integer')
                            });
                        }
                    });

                    return {
                        valid: !errors.length,
                        errors: errors
                    };
                });
            });

            var _parseSendTime = function (_wrapper) {
                var parts = _.map(['hours', 'minutes'], function (_unit) {
                    var select = _wrapper.find('[name=' + _unit + ']');
                    return _parseInt(select.val());
                });
                return parts.join(':');
            };


            $('#workflow-outgoing').on('click', '.submit', function (_ev) {

                var data = _.pick(info, 'schedules');

                var $schedule = $('#workflow-outgoing');
                var schedule = _.find(data.schedules, function(_schedule) {
                    return _schedule.name === workflow.schedule.name;
                });
                schedule.start_from = $schedule.find('[name=start_from]').val();
                schedule.messages = [];
                $schedule.find('.repeat-element').each(function() {
                    var $message = $(this);

                    var offsetValue = $message.find('[name=offset_value]').val();
                    var offsetUnit = $message.find('[name=offset_unit]').val();
                    var offset = offsetValue + ' ' + offsetUnit;

                    var ignoreSendTime = _.contains(['minutes', 'hours'], offsetUnit);
                    var sendTime = ignoreSendTime ? 
                        null : _parseSendTime($message.find('.send_time'));

                    schedule.messages.push({
                        message: _mergeMessages($message.find('[name=message]')),
                        group: $message.find('[name=group]').val(),
                        offset: offset,
                        send_day: $message.find('[name=send_day]').val(),
                        send_time: sendTime,
                        recipient: $message.find('[name=recipient]').val()
                    });
                });

                _submitConfiguration({ event: _ev, data: data, info: info }, function (_data) {
                    var errors = [];

                    _.each(_data.schedules, function(_schedule) {
                        _.each(_schedule.messages, function(_message, _idx) {
                            var group = _message.group;
                            var messageElem = '#workflow-outgoing .message:nth-child(' + (_idx + 2) + ') ';
                            if (isNaN(Number(_message.group))) {
                                errors.push({
                                    field: messageElem + '.group',
                                    error: info.translate('The group must be an integer')
                                });
                            }
                            if (!_validTime(_message.offset)) {
                                errors.push({
                                    field: messageElem + '.message-description',
                                    error: info.translate('The offset unit must be an integer')
                                });
                            }
                        });
                    });

                    return {
                        valid: !errors.length,
                        errors: errors
                    };
                });

            });
        });
    });

    function _findForm (_forms, _name) {
        return _.find(_forms, function(_form) {
            return _form.form === _name;
        });
    }

    function _getFields(_report) {
        if (_report.fields && _report.fields.length && _report.fields[0].field_name) {
            return _report.fields;
        }
        return _.map(
            _.uniq(_.pluck(_report.validations.list, 'property')),
            function(fieldName) {
                return {
                    field_name: fieldName
                };
            }
        );
    }

    function _createValidationsModel (_report) {
        var fields = _getFields(_report);
        return [{
            template: true,
            fields: fields,
            property: 'patient_name',
            rule: '',
            message: '',
            messages: []
        }].concat(_.map(_report.validations.list, function(_validation) {
            return {
                fields: fields,
                property: _validation.property,
                rule: _validation.rule,
                message: _findMessage(_validation.message, info.locale),
                messages: JSON.stringify(_validation.message)
            };
        }));
    }

    function _createReports (_workflow, info) {

        return _.map(_workflow.patient_reports, function(_report) {
            _.each(['report_accepted', 'registration_not_found'], function(_type) {
                var exists = _.some(_report.messages, function(_m) {
                    return _m.event_type === _type;
                });
                if (!exists) {
                    _report.messages.push({ event_type: _type, message: [] });
                }
            });
            var responses = _.map(_report.messages, function(_message) {
                return {
                    event_type: _message.event_type,
                    message: _findMessage(_message.message, info.locale),
                    messages: JSON.stringify(_message.message)
                };
            });
            return {
                form: _report.form,
                name: _report.name || info.translate('Patient Report'),
                format: _report.format,
                responses: responses,
                silence: _formatDate(_report.silence_for),
                validations: _createValidationsModel(_report)
            };
        });
    }

    function _createRegistrations (_workflow) {
        return _.map(_workflow.registrations, function(_registration) {
            var message = _registration.messages[0].message;
            return {
                form: _registration.form,
                help: sd.makeHtml(_registration.help || ''),
                message: _findMessage(message, info.locale),
                messages: JSON.stringify(message),
                validations: _createValidationsModel(_registration)
            };
        });
    }

    function _findMessage (_messages, _language) {
        var message = _.find(_messages, function(_message) {
            return _message.locale === _language;
        });
        return message && message.content;
    }

    function _formatDate (_date) {
        if (!_date) {
            return {
                value: '',
                unit: 'days'
            };
        }
        var parts = _date.split(' ');
        return {
            value: parts[0],
            unit: parts[1]
        };
    }

    function _formatTimeProperty (_time) {
        if (!_time) {
            return _formatTime();
        }
        var parts = _time.split(':');
        return _formatTime(parts[0], parts[1]);
    }

    function _createScheduleModel (_workflow, info) {
        var fields = [{ field_name: 'reported_date' }];
        var lmpFields = ['weeks_since_lmp', 'last_menstrual_period', 'lmp']
        var hasLmp = _.some(_getFields(_workflow.registrations[0]), function(field) {
            return _.contains(lmpFields, field.field_name);
        });
        if (hasLmp) {
            fields.push({ field_name: 'lmp_date' });
        }
        var messages = [{
            template: true,
            message: {},
            offset: {},
            sendTime: {},
            contents: []
        }].concat(_.map(_workflow.schedule.messages, function(_message) {
            return {
                schedule: _workflow.schedule,
                message: _message,
                sendTime: _formatTimeProperty(_message.send_time),
                offset: _formatDate(_message.offset),
                content: _findMessage(_message.message, info.locale),
                contents: JSON.stringify(_message.message)
            };
        }));
        return {
            start_from: _workflow.schedule.start_from,
            fields: fields,
            messages: messages
        };
    }

    var info = appinfo.getAppInfo.call(this, _req);
    require('../dust-helpers');

    var baseURL = require('duality/core').getBaseURL(_req);

    var workflow = _.find(_getWorkflows(info), function(_workflow) {
        return _workflow.schedule.name === _req.query.form;
    });

    if (!workflow) {
        return {
            code: 404,
            info: info,
            content: templates.render('404.html', _req, {})
        };
    }

    var context = {
        locale: info.locale,
        locales: info.locales,
        weekdays: [
            { code: 'monday', label: moment.weekdays(1) },
            { code: 'tuesday', label: moment.weekdays(2) },
            { code: 'wednesday', label: moment.weekdays(3) },
            { code: 'thursday', label: moment.weekdays(4) },
            { code: 'friday', label: moment.weekdays(5) },
            { code: 'saturday', label: moment.weekdays(6) },
            { code: 'sunday', label: moment.weekdays(0) }
        ],
        timeunits: ['minutes', 'hours', 'days', 'weeks', 'months', 'years' ]
    };
    if (workflow) {
        _.extend(context, {
            overview: {
                baseURL: baseURL,
                workflow: workflow
            },
            incoming: {
                baseURL: baseURL,
                registrations: _createRegistrations(workflow),
                reports: _createReports(workflow, info)
            },
            outgoing: {
                workflow: workflow,
                schedule: _createScheduleModel(workflow, info)
            }
        });
    }

    return {
        info: info,
        content: templates.render('workflow/workflow.html', _req, context)
    };
};
