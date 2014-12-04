var duality_events = require('duality/events'),
    templates = require('duality/templates'),
    settings = require('settings/root'),
    session = require('session'),
    users = require('users'),
    kutils = require('kujua-utils'),
    appinfo = require('views/lib/appinfo'),
    utils = require('./utils'),
    ddoc = settings.name;

duality_events.on('init', function (ev) {

    var db = require('db').current(),
        charts = require('./ui/charts');

    charts.initPieChart();

    /**
     * render analtyics top nav, relies on kansoconfig `kujua-reporting`
     * definition and session/user data.
     */
    session.info(function (err, info) {

        if (err) {
            kutils.logger.error('Failed to retreive session info: '+err.reason);
        }

        var isAdmin = kutils.hasPerm(info.userCtx, 'can_edit_any_facility'),
            isDistrictAdmin = kutils.hasPerm(info.userCtx, 'can_edit_facility'),
            config = appinfo.getAppInfo.call(this),
            hasValidConfig;

        _.each(config['kujua-reporting'], function(conf) {
            if (conf.code && conf.reporting_freq) {
                hasValidConfig = true;
            }
        });

        if (!hasValidConfig) {
            return;
        }

        if (!isAdmin && !isDistrictAdmin) {
            return;
        }

        users.get(info.userCtx.name, function(err, user) {
            if (err) {
                return kutils.logger.error('Failed to retreive user  info: '+err.reason);
            }

        });
    });

});
