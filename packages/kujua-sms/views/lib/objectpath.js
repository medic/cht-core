exports.get = function(obj, path) {
    path = path.split('.');

    while (obj && path.length) {
        obj = obj[path.shift()];
    }
    return obj;
};
