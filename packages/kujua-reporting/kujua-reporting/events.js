var duality_events = require('duality/events'),
    templates = require('duality/templates');

duality_events.on('init', function () {

    var req = {},
        ctx = {},
        charts = require('./ui/charts');

    console.log('kujua-reporting init');

    $('#topnav .nav .records').after(
        templates.render('kujua-reporting/top_nav.html', req, ctx)
    );

    charts.initPieChart();

});
