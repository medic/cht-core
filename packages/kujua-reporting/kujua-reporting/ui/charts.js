/**
 * Bindings to Duality events
 **/

var events = require('duality/events'),
    _ = require('underscore')._;

exports.pie = function (values, opts) {
    var opts = opts || {},
        selector = opts.selector || '#totals .chart',
        cx = opts.cx || 110,
        cy = opts.cy || 150,
        radius = opts.radius || 100,
        labels = opts.labels || [],
        fill = opts.fill || [],
        elem = null;

    if (typeof(selector) !== 'string') {
        elem = selector;
    } else {
        elem = $(selector).get(0);
    }

    var chart = Raphael(elem).pieChart(
                    cx, cy, radius, values, labels, {fill: fill});

    return chart;
};

exports.initPieChart = function() {
    Raphael.fn.pieChart = function (cx, cy, r, values, labels, opts) {
        var paper = this,
            rad = Math.PI / 180,
            chart = this.set(),
            opts = opts || {},
            stroke = opts.stroke || "#F2F2F2",
            fill = opts.fill || [];

        function isHundredPrecent() {
            return _.select(values, function(value) {
                return value > 0;
            }).length === 1;
        };

        function getFill(i) {
            if (fill && fill.length && fill[i]) {
                return fill[i];
            } else {
                var color = Raphael.hsb(start, .75, 1),
                    bgcolor = Raphael.hsb(start, .75, 1),
                    f = "90-" + bgcolor + "-" + color;
                return f;
            }
        };
        
        function sector(cx, cy, r, startAngle, endAngle, params) {
            var x1 = cx + r * Math.cos(-startAngle * rad),
                x2 = cx + r * Math.cos(-endAngle * rad),
                y1 = cy + r * Math.sin(-startAngle * rad),
                y2 = cy + r * Math.sin(-endAngle * rad);

            return paper.path(
                    ["M", cx, cy, "L", x1, y1, "A", r, r, 0,
                     +(endAngle - startAngle > 180), 0, x2, y2, "z"]
                   ).attr(params);                
        };
        
        var angle = 0,
            total = 0,
            start = 0,
            process = function (j) {
                var value = values[j],
                    angleplus = 360 * value / total,
                    popangle = angle + (angleplus / 2),
                    ms = 500,
                    delta = r/2 + total/value * 1.5,
                    p = sector(cx, cy, r, angle, angle + angleplus, {
                            fill: getFill(j),
                            stroke: stroke,
                            "stroke-width": 2});

                if (labels && labels.length && value != 0) {
                    var txt = paper.text(
                            cx + delta * Math.cos(-popangle * rad),
                            cy + delta * Math.sin(-popangle * rad),
                            labels[j]).attr({
                                fill: '#fff',
                                stroke: "none",
                                opacity: 1,
                                "font-size": 18,
                                "font-weight": 'bold'});
                    chart.push(txt);
                }
                angle += angleplus;
                chart.push(p);
                start += .1;
            };

        if(isHundredPrecent()) {
            for(var i = 0; i < values.length; i++) {
                if(values[i] > 0) {
                    var circle = paper.circle(cx, cy, r).attr({
                        fill: getFill(i),
                        stroke: stroke,
                        "stroke-width": 2
                    });
                    var txt = paper.text(
                            cx,
                            cy,
                            labels[i]).attr({
                                fill: '#fff',
                                stroke: "none",
                                opacity: 1,
                                "font-size": 18,
                                "font-weight": 'bold'});
                    chart.push(txt);
                    chart.push(circle);
                }
            }
        } else {
            for (var i = 0, ii = values.length; i < ii; i++) {
                total += values[i];
            }

            for (i = 0; i < ii; i++) {
                process(i);
            }
        }

        return chart;
    };
};
