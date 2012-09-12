var duality_events = require('duality/events'),
    templates = require('duality/templates'),
    dutils = require('duality/utils'),
    settings = require('settings/root'),
    ddoc = settings.name;

duality_events.on('init', function (ev) {

    var db = require('db').current(),
        setup = $.kansoconfig('kujua-reporting', true),
        view = 'facilities_by_type',
        q = {
            startkey: ['district_hospital'],
            endkey: ['district_hospital', {}],
            group: true
        };

    // we have no forms in the config, nothing to do.
    if (!setup.forms || setup.forms.length === 0)
        return;

    //
    // render analtyics top nav, relies on kansoconfig `kujua-reporting.forms`
    // config.
    //
    db.getView(ddoc, view, q, function(err, data) {

        var req = {},
            charts = require('./ui/charts'),
            forms = [];

        if (err) {
            return alert('Create facility data to use analytics.');
        }

        // associate each form from config.js with a list of facilities
        setup.forms.forEach(function(form) {
            var f = {code: form.code, districts: []};
            data.rows.forEach(function(row) {
                f.districts.push({id:row.key[1], name:row.key[2]});
            });
            forms.push(f);
        });

        $('#topnav .nav .records').after(
            templates.render('kujua-reporting/top_nav.html', req, {forms:forms})
        );
        charts.initPieChart();

    });

});
