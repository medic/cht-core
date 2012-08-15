var duality_events = require('duality/events');

duality_events.on('init', function () {
    console.log('kujua-reporting init');
    var charts = require('./ui/charts');
    charts.initPieChart();
});
