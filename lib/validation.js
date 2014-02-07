var _ = require('underscore'),
    async = require('async'),
    utils = require('./utils'),
    pupil = require('pupil'),
    db = require('../db');

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
    getMessages: function(validations) {
        return _.reduce(validations, function(memo, validation) {
            if (validation.property && validation.message) {
                memo[validation.property] = validation.message;
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
            if (fields.length = 1 && fields[0] == 'patient_id') {
                /*
                 * Run callback with false result if a valid registration with
                 * the same ID is found.
                 */
                utils.getRegistrations({
                    db: db,
                    id: doc.patient_id
                }, function(err, rows) {
                    if (err) {
                        return callback(err);
                    }
                    var ret = true;
                    _.each(rows, function(row) {
                        var doc = row.doc;
                        if (doc.errors && doc.errors.length === 0) {
                            ret = false;
                        }
                    });
                    return callback(null, ret);
                });
            } else {
                return callback(
                    "Usupported parameters for unique validation, only " +
                    "'patient_id' supported right now."
                );
            }
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
     *   message: "Patient ID must be 5 numbers."
     *  },
     *  {
     *   property: "patient_id",
     *   rule: "unique('patient_id')",
     *   message: "Patient ID must be unique."
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
                    result.fields(), self.getMessages(validations), ignores
                )
            );
            callback(errors);
        });
    }
};
