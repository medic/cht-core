exports.addFTI = function(obj) {
    obj.getFTI = function(name, index, q, callback) {
        var data,
            req;

        try {
            data = this.stringifyQuery(q);
        } catch (e) {
            return callback(e);
        }

        req = {
            data: data,
            expect_json: true,
            url: '/_fti/local' + this.url + '/_design/' + this.encode(name) + '/' + this.encode(index)
        };

        this.request(req, callback);
    }
};
