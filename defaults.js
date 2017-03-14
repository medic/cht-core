/*
 * Default settings/configs values for sentinel. These values used if settings
 * are not defined in the settings_path below.
 */

var defaults = {
    settings_path: '_design/medic/_rewrite/app_settings/medic',
    schedule_morning_hours: 0,
    schedule_morning_minutes: 0,
    schedule_evening_hours: 23,
    schedule_evening_minutes: 0,
    synthetic_date: null,
    transitions: {},
    loglevel: 'info'
};

module.exports = defaults;
