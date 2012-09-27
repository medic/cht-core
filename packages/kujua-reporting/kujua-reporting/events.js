var duality_events = require('duality/events'),
    templates = require('duality/templates'),
    session = require('session'),
    utils = require('kujua-utils'),
    users = require('users'),
    settings = require('settings/root'),
    ddoc = settings.name;

duality_events.on('init', function (ev) {

    var db = require('db').current(),
        charts = require('./ui/charts'),
        q = {
            startkey: ['district_hospital'],
            endkey: ['district_hospital', {}],
            group: true
        };

    db.getView(ddoc, 'facilities_by_type', q, renderNav);
    charts.initPieChart();

});

/**
 * render analtyics top nav, relies on kansoconfig `kujua-reporting.forms`
 * definition.
 */
var renderNav = function(err, data) {

    if (err) {
        return alert('Create facility data to use analytics.');
    }

    session.info(function (err, info) {

        var isAdmin = utils.hasPerm(info.userCtx, 'can_edit_any_facility'),
            isDistrictAdmin = utils.hasPerm(info.userCtx, 'can_edit_facility'),
            setup = $.kansoconfig('kujua-reporting', true);

        // we have no forms in the config, nothing to do.
        if (!setup || !setup.forms || setup.forms.length === 0)
            return;

        // only admin or district admin should have access
        if (!isAdmin && !isDistrictAdmin)
            return;

        users.get(info.userCtx.name, function(err, user) {

            var district = user.kujua_facility,
                forms = [];

            // associate each form from config.js with a list of facilities
            setup.forms.forEach(function(form) {
                var f = {code: form.code, districts: []};
                data.rows.forEach(function(row) {
                    if (isAdmin)
                        f.districts.push({id:row.key[1], name:row.key[2]});
                    else if (isDistrictAdmin && row.key[1] === district)
                        f.districts.push({id:row.key[1], name:row.key[2]});
                });
                forms.push(f);
            });

            $('#topnav .nav .records').after(
                templates.render('kujua-reporting/top_nav.html', {}, {forms:forms})
            );
        });

    });

};
