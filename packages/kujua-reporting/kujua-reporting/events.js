var duality_events = require('duality/events'),
    templates = require('duality/templates'),
    settings = require('settings/root'),
    ddoc = settings.name;

duality_events.on('init', function () {

    console.log('kujua-reporting init');

    var db = require('db').current(),
        q = {};

    q['startkey'] = ['district_hospital'];
    q['endkey'] = ['district_hospital', {}];

    db.getView(ddoc, 'facilities_by_type', q, function(err, data) {

        var req = {},
            charts = require('./ui/charts');

        if (err) {
            return alert('Create facility data to use analytics.');
        }

        if (data.rows.length > 0) {
            var id = data.rows[0].key[1];
            $('#topnav .nav .records').after(
                templates.render('kujua-reporting/top_nav.html', req, {id:id})
            );
            charts.initPieChart();
        }

    });

});
