exports.get = function(obj, path) {
    if (typeof path !== 'string') {
        return;
    }
    path = path.split('.');

    while (obj && path.length) {
        obj = obj[path.shift()];
    }
    return obj;
};
