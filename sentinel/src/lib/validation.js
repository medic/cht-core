var _ = require('underscore'),
    async = require('async'),
    moment = require('moment'),
    pupil = require('./pupil/src/pupil'),
    messages = require('./messages'),
    utils = require('./utils'),
    logger = require('./logger'),
    db = require('../db-nano');

var _parseDuration = function(duration) {
    var parts = duration.split(' ');
    return moment.duration(parseInt(parts[0]), parts[1]);
};

const _getIntersection = responses => {
    let ids = responses.pop().rows.map(row => row.id);
    responses.forEach(response => {
        ids = ids.filter(id => _.findWhere(response.rows, { id: id }));
    });
    return ids;
};

const _executeExistsRequest = (options, callback) => {
    db.medic.view(
        'medic-client',
        'reports_by_freetext',
        options,
        (err, response) => callback(err, response) // strip out unnecessary third argument
    );
};

const lowerCaseString = obj => typeof obj === 'string' ? obj.toLowerCase() : obj;

const _exists = (doc, fields, options, callback) => {
    options = options || {};
    if (!fields.length) {
        return callback(new Error('No arguments provided to "exists" validation function'));
    }
    const requestOptions = fields.map(field => {
        return { key: [ `${field}:${lowerCaseString(doc[field])}` ] };
    });
    if (options.additionalFilter) {
        requestOptions.push({ key: [ lowerCaseString(options.additionalFilter) ] });
    }
    async.map(requestOptions, _executeExistsRequest, (err, responses) => {
        if (err) {
            return callback(err);
        }
        const ids = _getIntersection(responses)
            .filter(id => id !== doc._id);
        if (!ids.length) {
            return callback(null, false);
        }
        db.medic.fetch({ keys: ids }, (err, result) => {
            if (err) {
                return callback(err);
            }
            // filter out docs with errors
            const found = result.rows.some(row => {
                const doc = row.doc;
                return (!doc.errors || doc.errors.length === 0) &&
                       (!options.startDate || doc.reported_date >= options.startDate);
            });
            return callback(null, found);
        });
    });
};

var _formatParam = function(name, value) {
    name = name.replace(/"/g, '');
    if (typeof value === 'string') {
        value = value.replace(/"/g, '\\"');
        return name + ':"' + value + '"';
    }
    if (typeof value === 'number') {
        return name + '<int>:' + value;
    }
    return name + ':' + value;
};

module.exports = {
    _formatParam: _formatParam,
    extractErrors: function(result, messages, ignores) {
        // wrap single item in array; defaults to empty array
        ignores = ignores || [];
        if (!_.isArray(ignores)) {
            ignores = [ ignores ];
        }

        return _.reduce(result, function(memo, valid, key) {
            if (!valid && !_.contains(ignores, key)) {
                memo.push({
                    code: 'invalid_' + key,
                    message: messages[key]
                });
            }
            return memo;
        }, []);
    },
    getMessages: function(validations, locale) {
        return _.reduce(validations, function(memo, validation) {
            if (validation.property &&
               (validation.message || validation.translation_key)) {
                memo[validation.property] = messages.getMessage(validation, locale);
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
        unique: (doc, validation, callback) => {
            _exists(doc, validation.funcArgs, null, (err, result) => {
                if (err) {
                    logger.error('Error running "unique" validation', err);
                }
                callback(err, !result);
            });
        },
        uniqueWithin: (doc, validation, callback) => {
            const fields = _.clone(validation.funcArgs);
            const duration = _parseDuration(fields.pop());
            const startDate = moment().subtract(duration).valueOf();
            _exists(doc, fields, { startDate: startDate }, (err, result) => {
                if (err) {
                    logger.error('Error running "uniqueWithin" validation', err);
                }
                callback(err, !result);
            });
        },
        exists: (doc, validation, callback) => {
            const formName = validation.funcArgs[0];
            const fieldName = validation.funcArgs[1];
            _exists(doc, [ fieldName ], { additionalFilter: `form:${formName}` }, (err, result) => {
                if (err) {
                    logger.error('Error running "exists" validation', err);
                }
                callback(err, result);
            });
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

        callback = callback || ignores;
        validations = validations || [];

        /*
         * Modify validation objects that are calling a custom validation
         * function. Add function name and args and append the function name to
         * the property value so pupil.validate() will still work and error
         * messages can be generated.
         *
         **/
        var names = Object.keys(self.extra_validations);
        _.each(validations, function(config, idx) {
            var entities;
            try {
                logger.debug('validation rule %s', config.rule);
                entities = pupil.parser.parse(pupil.lexer.tokenize(config.rule));
            } catch(e) {
                logger.error('error parsing validation: %s', e);
                return errors.push('Error on pupil validations: ' + JSON.stringify(e));
            }
            _.each(entities, function(entity) {
                logger.debug('validation rule entity %s', entity);
                if (entity.sub && entity.sub.length > 0) {
                    _.each(entity.sub, function(e) {
                        logger.debug('validation rule entity sub %s', e.funcName);
                        if (names.indexOf(e.funcName) >= 0) {
                            var v = validations[idx];
                            // only update the first time through
                            if (v.property.indexOf('_' + e.funcName) === -1) {
                                v.funcName = e.funcName;
                                v.funcArgs = e.funcArgs;
                                v.field = config.property;
                                v.property += '_' + e.funcName;
                            }
                        }
                    });
                }
            });
        });

        // trouble parsing pupil rules
        if (errors.length > 0) {
            return callback(errors);
        }

        var attributes = _.extend({}, doc, doc.fields);

        try {
            result = pupil.validate(self.getRules(validations), attributes);
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
            self.extra_validations[v.funcName].call(this, attributes, v,
                function(err, res) {
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
                }
            );
        }, function() {
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
