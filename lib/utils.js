var _ = require('underscore')._;

exports.prettyMonth = function (month, full) {
    var months_short = new Array(
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec');
    var months_full = _.map(exports.months(), function(month) { return month[1]; });

    if (full) {
        return months_full[month];
    }
    
    return months_short[month];
};

exports.months = function () {
    return [
        [0, 'January'],
        [1, 'February'],
        [2, 'March'],
        [3, 'April'],
        [4, 'May'],
        [5, 'June'],
        [6, 'July'],
        [7, 'August'],
        [8, 'September'],
        [9, 'October'],
        [10, 'November'],
        [11, 'December']
    ];
};
