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
    ddoc = settings.name;

var _workflows = [
    {
        id: 'basic',
        name: 'Basic Antenatal Care',
        summary: 'Monthly messages repeated until delivery.',
        image: '/static/img/workflows/basic-anc.png',
        registration: {
            code: 'R'
        },
        reports: [
            {
                code: 'V',
                name: 'Visits',
                format: 'V <patientid>'
            },
            {
                code: 'D',
                name: 'Deliveries',
                format: 'D <patientid> <facility>'
            }
        ]
    }
    /*,
    {
        id: 'advanced',
        name: 'Advanced Antenatal Care',
        summary: 'Messages targeted for appointment dates based on last menstrual period.',
        image: '/static/img/workflows/basic-anc.png'
    }*/
];

var _findWorkflow = function(_id) {
    return _.find(_workflows, function(_workflow) {
        return _workflow.id === _id;
    });
};

var _submitConfiguration = function (_ev, data) {

    var _updateStatus = function(_data) {
        var target = $(_ev.target);
        target.removeClass('disabled');
        var status = target.closest('.footer').find('.status');
        if (_data.success) {
            _resetTranslated(target.closest('form'));
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
    };

    _ev.stopPropagation();
    _ev.preventDefault();

    $(_ev.target).addClass('disabled');

    var baseURL = require('duality/core').getBaseURL();

    $.ajax({
        method: 'PUT',
        data: JSON.stringify(data),
        contentType: 'application/json',
        dataType: 'json',
        url: baseURL + '/update_settings/' + ddoc,
        success: _updateStatus,
        error: function (_xhr, _status, _err) {
            _updateStatus({ success: false, error: _err });
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

/**
 * configuration:
 */
exports.configuration = function (_doc, _req) {

    /* Client-side initialization begins here */
    events.once('afterResponse', function() {

        var _switchLocale = function () {
            var selector = $('.locale-selector');
            var language = selector.val();
            selector.data('language', language);
            _.each(info.translations, function(item) {
                $('[name="' + item.key + '"]').val(item[language]);
            });
            _resetTranslated($('#translations-form'));
            $('#translations-form textarea').autosize();
        };

        var _parseTime = function (_data) {
            _.each(['morning', 'evening'], function (_property) {
                var wrapper = $('#schedule-' + _property);
                _.each(['hours', 'minutes'], function (_unit) {
                    var select = wrapper.find('[name=' + _unit + ']');
                    var value = _parseInt(select.val());
                    _data['schedule_' + _property + '_' + _unit] = value;
                });
            });
        };

        if (!utils.isUserAdmin(_req.userCtx)) {
            return render403(_req);
        }

        utils.updateTopNav('configuration', 'Configuration');

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
            if (_hasDirtyTranslations($('#translations-form'))) {
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
            _submitConfiguration(_ev, data);
        });
    });


    var _formatTimeProperty = function (_info, _property) {
        return _formatTime(
            info['schedule_' + _property + '_hours'],
            info['schedule_' + _property + '_minutes']
        );
    };

    var info = appinfo.getAppInfo.call(this, _req);
    var baseURL = require('duality/core').getBaseURL(_req);
    var translations = _.map(info.translations, function(_translation) {
        return {
            key: _translation.key,
            default: _translation.en,
            message: _translation[info.locale]
        };
    });

    return {
        info: info,
        title: info.translate('Configuration'),
        content: templates.render('configuration/configuration.html', _req, {
            workflows: _workflows,
            info: info,
            locale: info.locale,
            translations: translations,
            baseURL: baseURL,
            scheduleEvening: _formatTimeProperty(info, 'evening'),
            scheduleMorning: _formatTimeProperty(info, 'morning')
        })
    };
};


/**
 * workflow:
 */
exports.workflow = function (_doc, _req) {

    /* Client-side initialization begins here */
    events.once('afterResponse', function() {
        if (!utils.isUserAdmin(_req.userCtx)) {
            return render403(_req);
        }

        utils.updateTopNav('workflow', 'Workflow', ': ' + workflow.name);

        $('#content').on('click', '.repeat-container .add', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            var container = $(_ev.target).closest('.repeat-container');
            var template = container.find('> .repeat-element').last();
            var clone = template.clone();
            clone.find('.translated').removeData('messages');
            clone.find('input, textarea').val('');
            clone.find('select').each(function() {
                this.selectedIndex = 0;
            });
            clone.find('.repeat-container').each(function() {
                $(this).find('> .repeat-element:not(:first)').remove();
            });
            template.after(clone);
        });

        $('#content').on('click', '.repeat-container .remove', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            $(_ev.target).closest('.repeat-element').remove();
        });

        $('#content').on('click', '.toggle-head', function (_ev) {
            _ev.stopPropagation();
            _ev.preventDefault();
            $(_ev.target).closest('.toggle').toggleClass('expanded');
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
            _elem.find('.validation').each(function() {
                validations.push({
                    property: $(this).find('[name=property]').val(),
                    rule: $(this).find('[name=rule]').val(),
                    message: _mergeMessages($(this).find('[name=content]'))
                });
            });
            return validations;
        };

        var _updateRegistration = function (_data) {
            var elem = $('#workflow-registrations');
            var messages = _mergeMessages(
                elem.find('.responses [name=content]')
            );
            var registration = _findForm(_data.registrations, 'R');
            registration.validations.list = _getValidations(elem);
            registration.messages[0].message = messages;
        };

        var _updatePatientReports = function (_data) {
            var elem = $('#workflow-incoming .report').each(function() {
                var _elem = $(this);
                var _formCode = _elem.data('formcode');
                console.log('adding ' + _formCode);
                var form = _findForm(_data.patient_reports, _formCode);
                form.validations.list = _getValidations(_elem);
                form.silence_for = _elem.find('[name=silence-value]').val() + 
                    ' ' + _elem.find('[name=silence-unit]').val();
                var messages = [];
                _elem.find('.response').each(function() {
                    messages.push({
                        message: _mergeMessages($(this).find('[name=message]')),
                        event_type: $(this).find('[name=event_type]').val(),
                        recipient: 'reporting_unit'
                    });
                });
                form.messages = messages;
                console.log('added: ', form);
            });
        };

        $('#workflow-incoming').on('click', '.submit', function (_ev) {
            var data = _.pick(info, 'registrations', 'patient_reports');
            _updateRegistration(data);
            _updatePatientReports(data);
            _submitConfiguration(_ev, data);
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

            $('#workflow-outgoing .schedule').each(function() {
                var $schedule = $(this);
                var messages = [];
                $schedule.find('.message').each(function() {
                    var $message = $(this);
                    var offset = $message.find('[name=offset_value]').val() + ' ' + 
                                 $message.find('[name=offset_unit]').val();
                    messages.push({
                        message: _mergeMessages($message.find('[name=message]')),
                        group: $message.find('[name=group]').val(),
                        offset: offset,
                        send_day: $message.find('[name=send_day]').val(),
                        send_time: _parseSendTime($message.find('#send_time')),
                        recipient: $message.find('[name=recipient]').val()
                    });
                });
                var name = $schedule.find('[name=name]').val();
                var schedule = _.find(data.schedules, function(_schedule) {
                    return _schedule.name === name;
                });
                if (!schedule) {
                    schedule = {
                        name: name
                    };
                    data.schedules.push(schedule);
                }
                schedule.start_from = $schedule.find('[name=start_from]').val();
                schedule.messages = messages;
            });

            _submitConfiguration(_ev, data);

        });
    });

    var info = appinfo.getAppInfo.call(this, _req);
    var baseURL = require('duality/core').getBaseURL(_req);
    var workflow = _findWorkflow(_req.query.form);
    if (!workflow) {
        return render404(req);
    }

    function _findForm (_forms, _name) {
        return _.find(_forms, function(_form) {
            return _form.form === _name;
        });
    }

    function _createReports (_workflow) {

        return _.map(_workflow.reports, function(_report) {
            var form = _findForm(info.patient_reports, _report.code);
            var silence = _formatDate(form.silence_for);
            var validations = _.map(form.validations.list, function(_validation) {
                return {
                    property: _validation.property,
                    rule: _validation.rule,
                    message: _findMessage(_validation.message, info.locale),
                    messages: JSON.stringify(_validation.message)
                };
            });
            var responses = _.map(form.messages, function(_message) {
                return {
                    event_type: _message.event_type,
                    recipient: _message.recipient,
                    message: _findMessage(_message.message, info.locale),
                    messages: JSON.stringify(_message.message)
                };
            });
            return {
                report: _report,
                form: {
                    responses: responses,
                    silence: silence,
                    validations: validations
                }
            };
        });
    }

    function _createRegistration (_registration) {
        var message = _findMessage(_registration.messages[0].message, info.locale);
        var validations = _.map(_registration.validations.list, function(_validation) {
            return {
                property: _validation.property,
                rule: _validation.rule,
                message: _findMessage(_validation.message, info.locale),
                messages: JSON.stringify(_validation.message)
            };
        });
        return {
            message: message,
            messages: JSON.stringify(_registration.messages[0].message),
            validations: validations
        };
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

    var _formatTimeProperty = function (_time) {
        if (!_time) {
            return _formatTime();
        }
        var parts = _time.split(':');
        return _formatTime(parts[0], parts[1]);
    };
    
    var registration = _findForm(info.registrations, workflow.registration.code);
    var scheduleNames = _.pluck(
        _.filter(registration.events, function(_event) {
            return _event.trigger === 'assign_schedule';
        }),
        'params'
    );
    var schedules = _.map(scheduleNames, function(_name) {
        return _.find(info.schedules, function(schedule) {
            return schedule.name === _name;
        });
    });
    var scheduleModels = _.map(schedules, function (_schedule) {
        var messages = _.map(_schedule.messages, function(_message) {
            return {
                schedule: _schedule,
                message: _message,
                sendTime: _formatTimeProperty(_message.send_time),
                offset: _formatDate(_message.offset),
                content: _findMessage(_message.message, info.locale),
                contents: JSON.stringify(_message.message)
            };
        });
        return {
            name: _schedule.name,
            start_from: _schedule.start_from,
            messages: messages
        };
    });

    return {
        info: info,
        title: info.translate('Workflow'),
        content: templates.render('workflow/workflow.html', _req, {
            baseURL: baseURL,
            locale: info.locale,
            workflow: workflow,
            overview: {},
            incoming: {
                registration: _createRegistration(registration),
                reports: _createReports(workflow)
            },
            outgoing: {
                schedules: scheduleModels
            }
        })
    };
};
