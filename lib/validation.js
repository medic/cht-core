var _ = require('underscore'),
    async = require('async'),
    pupil = require('pupil'),
    moment = require('moment'),
    messages = require('./messages'),
    utils = require('./utils'),
    db = require('../db');

var _parseDuration = function(duration) {
    var parts = duration.split(' ');
    return moment.duration(parseInt(parts[0]), parts[1]);
};

var _checkUniqueness = function(doc, query, callback) {
    db.fti(
        'data_records',
        { q: query, include_docs: true },
        function(err, result) {
            if (err) {
                return callback(err);
            }
            var found = _.some(result.rows, function(row) {
                return row.id !== doc._id
                    && row.doc 
                    && row.doc.errors 
                    && row.doc.errors.length === 0;
            });
            return callback(null, !found);
        }
    );
};

module.exports = {
    extractErrors: function(result, messages, ignores) {
        // wrap single item in array; defaults to empty array
        ignores = ignores || [];
        if (!_.isArray(ignores)) {
            ignores = [ ignores ];
        }

        return _.reduce(result, function(memo, valid, key) {
            if (!valid && !_.contains(ignores, key)) {
                memo.push({
                    code: 'invalid_'+key,
                    message: messages[key]
                });
            }
            return memo;
        }, []);
    },
    getMessages: function(validations, locale) {
        return _.reduce(validations, function(memo, validation) {
            if (validation.property && validation.message) {
                memo[validation.property] = messages.getMessage(
                    validation.message,
                    locale
                );
            }
            return memo;
        }, {});
    },
    getRules: function(validations) {
        return _.reduce(validations, function(memo, validation) {
            if (validation.property && validation.rule) {
                memo[validation.property] = validation.rule;
            }
            return memo;
        }, {});
    },
    /*
     * Custom validations in addition to pupil but follows Pupil API
     * */
    extra_validations: {
        /*
         * Check if fields on a doc are unique in the db, return true if unique
         * false otherwise.
         */
        unique: function(doc, fields, callback) {
            var conjunctions = _.map(fields, function(field) {
                return field + ':"' + encodeURIComponent(doc[field]) + '"';
            });
            _checkUniqueness(doc, conjunctions.join(' AND '), callback);
        },
        uniqueWithin: function(doc, fields, callback) {
            var duration = _parseDuration(fields.pop());
            var conjunctions = _.map(fields, function(field) {
                return field + ':"' + encodeURIComponent(doc[field]) + '"';
            });
            var start = moment().subtract(duration).toISOString();
            var endOfTime = '3000-01-01T00:00:00';
            conjunctions.push(
                'reported_date<date>:[' +  start + ' TO ' + endOfTime + ']'
            );
            _checkUniqueness(doc, conjunctions.join(' AND '), callback);
        }
    },
    /**
     * Validation setings may consist of Pupil.js rules and custom rules.
     * These cannot be combined as part of the same rule.
     *
     * Not OK:
     *  rule: "regex(\d{5}) && unique('patient_id')"
     *
     * OK:
     *  rule: "regex(\d{5}) && max(11111)"
     *
     * If for example you want to validate that patient_id is 5 numbers and it
     * is unique (or some other custom validation) you need to define two
     * validation configs/separate rules in your settings. Example validation
     * settings:
     *
     * [
     *  {
     *   property: "patient_id",
     *   rule: "regex(\d{5})",
     *   message: [{
     *       content: "Patient ID must be 5 numbers.",
     *       locale: "en"
     *   }]
     *  },
     *  {
     *   property: "patient_id",
     *   rule: "unique('patient_id')",
     *   message: [{
     *       content: "Patient ID must be unique.",
     *       locale: "en"
     *   }]
     *  }
     * ]
     *
     * validate() modifies the property value of the second item to
     * `patient_id_unique` so that pupil.validate() still returns a valid
     * result.  Then we process the result once more to extract the custom
     * validation results and error messages.
     *
     * @param ignores -
     *   Optional array keys of doc that is always considered valid
     *
     * @callback Array of errors if validation failed, empty array otherwise.
     * */
    validate: function(doc, validations, ignores, callback) {
        var self = module.exports,
            result = {},
            errors = [];

        callback = callback ? callback : ignores,
        validations = validations || [];

        /*
         * Modify validation objects that are calling a custom validation
         * function. Add function name and args and append the function name to
         * the property value so pupil.validate() will still work and error
         * messages can be generated.
         *
         **/
        var names = Object.keys(self.extra_validations),
            entities;
        _.each(validations, function(config, idx) {
            try {
                entities = pupil.parser.parse(pupil.lexer.tokenize(config.rule));
            } catch(e) {
                return errors.push('Error on pupil validations: ' + JSON.stringify(e));
            }
            _.each(entities, function(entity) {
                if (entity.sub && entity.sub.length > 0) {
                    _.each(entity.sub, function(e) {
                        if (names.indexOf(e.funcName) >= 0) {
                            var v = validations[idx];
                            v['funcName'] = e.funcName;
                            v['funcArgs'] = e.funcArgs;
                            v['property'] = v['property'] + '_' + e.funcName;
                        }
                    });
                }
            });
        });

        // touble parsing pupil rules
        if (errors.length > 0) {
            return callback(errors);
        }

        try {
            result = pupil.validate(self.getRules(validations), doc);
        } catch(e) {
            errors.push('Error on pupil validations: ' + JSON.stringify(e));
            return callback(errors);
        }

        /*
         * Run async/extra validations in series and collect results.
         */
        async.eachSeries(validations, function(v, cb) {
            if (!v.funcName) {
                return cb(); // continue series
            }
            self.extra_validations[v.funcName].apply(this, [doc, v.funcArgs, function(err, res) {
                /*
                 * Be careful to not to make an invalid pupil result valid,
                 * only assign false values. If async result is true then do
                 * nothing since default is already true. Fields are valid
                 * unless proven otherwise.
                 */
                if (res === false) {
                    result.results[v.property] = res;
                }
                cb(err); // continue series
            }]);
        }, function(err) {
            errors = errors.concat(
                self.extractErrors(
                    result.fields(),
                    self.getMessages(validations, utils.getLocale(doc)),
                    ignores
                )
            );
            callback(errors);
        });
    }
};
