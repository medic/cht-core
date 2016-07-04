/*
 * Default settings/configs values for sentinel. These values used if settings
 * are not defined in the settings_path below.
 */

var defaults = {
    settings_path: '_design/medic/_rewrite/app_settings/medic',
    id_format: '111111',
    schedule_morning_hours: 0,
    schedule_morning_minutes: 0,
    schedule_evening_hours: 23,
    schedule_evening_minutes: 0,
    synthetic_date: null,
    transitions: {
        accept_patient_reports: {
            load: './transitions/accept_patient_reports.js'
        },
        conditional_alerts: {
            load: './transitions/conditional_alerts.js'
        },
        default_responses: {
            load: './transitions/default_responses.js'
        },
        update_sent_by: {
            load: './transitions/update_sent_by.js'
        },
        ohw_counseling: {
            disable: true,
            load: './transitions/ohw_counseling.js'
        },
        ohw_emergency_report: {
            disable: true,
            load: './transitions/ohw_emergency_report.js'
        },
        ohw_notifications: {
            disable: true,
            load: './transitions/ohw_notifications.js'
        },
        resolve_pending: {
            disable: true,
            load: './transitions/resolve_pending.js'
        },
        registration: {
            load: './transitions/registration.js'
        },
        twilio_message: {
            disable: true,
            load: './transitions/twilio_message.js'
        },
        update_clinics: {
            load: './transitions/update_clinics.js'
        },
        update_notifications: {
            load: './transitions/update_notifications.js'
        },
        update_scheduled_reports: {
            load: './transitions/update_scheduled_reports.js'
        },
        update_sent_forms: {
            load: './transitions/update_sent_forms.js'
        }
    },
    loglevel: 'info'
};

module.exports = defaults;
