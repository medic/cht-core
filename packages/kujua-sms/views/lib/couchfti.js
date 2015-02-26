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

        this.request(req, function(err, result) {
            if (err) {
                // the request itself failed
                return callback(err);
            }
            if (!result.rows) {
                // the query failed for some reason
                return callback(result);
            }
            callback(null, result);
        });
    }
};
