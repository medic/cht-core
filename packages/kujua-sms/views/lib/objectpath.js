exports.get = function(obj, path) {
    if (typeof path !== 'string') {
        return;
    }
    path = path.split('.');

    var arrayRegex = /\[([0-9]*)\]/;
    while (obj && path.length) {
        var part = path.shift();
        if (arrayRegex.test(part)) {
            // property with array index
            var index = arrayRegex.exec(part)[1];
            part = part.replace(arrayRegex, '');
            obj = obj[part][index];
        } else {
            // property without array index
            obj = obj[part];
        }
    }
    return obj;
};
