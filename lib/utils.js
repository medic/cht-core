// test_this_one returns Test This One
exports.titleize = function(str) {
    return str.replace(new RegExp('(^[a-z]|_[a-z])', 'g'), function(s) {
        return s.replace('_',' ').toUpperCase();
    });
};
