var dust = require('dust-core'),
    app_settings = require('views/lib/appinfo').getAppInfo(),
    _ = require('underscore');

// add helpers
_.extend(dust.helpers, {
    // Stolen from: https://github.com/linkedin/dustjs-helpers/blob/master/dist/dust-helpers.js
    tap: function(input, chunk, context) {
        // return given input if there is no dust reference to resolve
        // dust compiles a string/reference such as {foo} to a function
        if (typeof input !== "function") {
            return input;
        }

        var dustBodyOutput = '',
            returnValue;

        //use chunk render to evaluate output. For simple functions result will be returned from render call,
        //for dust body functions result will be output via callback function
        returnValue = chunk.tap(function(data) {
            dustBodyOutput += data;
            return '';
        }).render(input, context);

        chunk.untap();

        //assume it's a simple function call if return result is not a chunk
        if (returnValue.constructor !== chunk.constructor) {
            //use returnValue as a result of tap
            return returnValue;
        } else if (dustBodyOutput === '') {
            return false;
        } else {
            return dustBodyOutput;
        }
    },
    translate: function(chunk, context, bodies, params) {
        var value = dust.helpers.tap(params.value, chunk, context);
        return chunk.write(app_settings.translate(value));
    },
    formatDate: function(chunk, context, bodies, params) {
        var timestamp = Number(dust.helpers.tap(params.timestamp, chunk, context)),
            format = dust.helpers.tap(params.format, chunk, context);

        if (_.isNaN(timestamp)) {
            timestamp = dust.helpers.tap(params.timestamp, chunk, context);
        }

        // todo use data_format setting if format is not passed in
        format = format || 'DD, MMM YYYY, HH:mm:ss ZZ';

        return chunk.write(moment(timestamp).format(format));
    },
    formName: function(chunk, context, bodies, params) {
        var form = dust.helpers.tap(params.form, chunk, context);

        return chunk.write(sms_utils.getFormTitle(form));
    },
    contact: function(chunk, context, bodies, params) {
        var entities = dust.helpers.tapObject(params.entities, chunk, context),
            to = dust.helpers.tap(params.to, chunk, context),
            verbose = dust.helpers.tap(params.verbose, chunk, context),
            from = dust.helpers.tap(params.from, chunk, context),
            contact,
            clinic;

        if (!contact && entities) {
            contact = objectpath.get(
                    entities,
                    app_settings.contact_display_short
            );
            if (!contact) {
                contact = entities.clinic && entities.clinic.name;
            }
            if (!contact && entities.contact && entities.contact.name) {
                contact = entities.contact.name;
            }
        }

        if (!contact) {
            contact = from;
        }
        if (!contact) {
            contact = to;
        }
        if (!contact) {
            contact = '<i class="fa fa-question-circle" title="Unknown"></i>';
        }

        if (verbose && entities) {
            var names = [],
                sep = '&raquo;',
                str = '';
            /*
             * Supports the following structures:
             *
             *  <entities>
             *  {clinic: <entities>}
             *  {health_center: <entities>}
             *
             */
            if (entities.clinic) {
                entities = entities.clinic;
            } else if (entities.health_center) {
                entities = entities.health_center;
            }
            str = objectpath.get(entities, 'parent.parent.name');
            if (str) {
                names = names.concat(str, sep);
            }
            str = objectpath.get(entities, 'parent.name');
            if (str) {
                names = names.concat(str, sep);
            }
            if (entities.name) {
                names = names.concat(entities.name, sep);
            }
            str = objectpath.get(entities, 'contact.rc_code');
            names = str ? names.concat('['+str+']') : names;
            str = objectpath.get(entities, 'contact.name');
            names = str ? names.concat(str) : names;
            if (to) {
                names.push(to);
            } else {
                str = objectpath.get(entities, 'contact.phone');
                names = str ? names.concat(str) : names;
            }
            contact = names.length ? names.join(' ') : contact;
        }

        return chunk.write(contact);
    },
    tasksByState: function(chunk, context, bodies, params) {
        var array = dust.helpers.tapArray(params.array, chunk, context),
            state = dust.helpers.tap(params.state, chunk, context),
            matches;

        matches = _.filter(array, function(item) {
            return item.state === state;
        });

        return bodies.block(chunk, context.push(matches));
    },
    ifHasState: function(chunk, context, bodies, params) {
        var array = dust.helpers.tapArray(params.array, chunk, context),
            state = dust.helpers.tap(params.state, chunk, context),
            body = bodies.block,
            skip = bodies['else'],
            cond;

        cond = _.find(array, function(item) {
            return item && item.state === state;
        });


        if (cond) {
            return chunk.render( bodies.block, context );
        } else if (skip) {
            return chunk.render( bodies['else'], context );
        } else {
            return chunk;
        }
    },
    countByState: function(chunk, context, bodies, params) {
        var array1 = dust.helpers.tapArray(params.array1, chunk, context),
            state = dust.helpers.tap(params.state, chunk, context),
            matches,
            array = [];

        if (params.array2) {
            array1 = array1.concat(
                dust.helpers.tapArray(params.array2, chunk, context)
            );
        }

        matches = _.filter(array1, function(item) {
            return item && item.state === state;
        });

        return chunk.write(matches.length);
    },
    isAdmin: function(chunk, context, bodies, params) {
        var body = bodies.block,
            skip = bodies['else'];

        if (data_records.isAdmin) {
            return chunk.render(bodies.block, context);
        } else if (skip) {
            return chunk.render(skip, context);
        } else {
            return chunk;
        }
    },
    hasPermission: function(chunk, context, bodies, params) {
        var body = bodies.block,
            skip = bodies['else'],
            permission = dust.helpers.tap(params.permission, chunk, context);

        if (utils.hasPerm(data_records.userCtx, permission)) {
            return chunk.render(bodies.block, context);
        } else if (skip) {
            return chunk.render(skip, context);
        } else {
            return chunk;
        }
    },
    idx: function(chunk, context, bodies) {
        if (bodies.block) {
            return bodies.block(chunk, context.push(context.stack.index));
        }
        else {
            return chunk;
        }
    },
    if: function(chunk, context, bodies, params) {
        var body = bodies.block,
            skip = bodies['else'];

        if( params && params.cond){
            var cond = params.cond;

            cond = dust.helpers.tap(cond, chunk, context);

            // strip all new line characters as they break eval
            if (cond) {
                cond = cond.replace(/\r?\n/g, '');
            }

            // eval expressions with given dust references
            if(eval(cond)){
                if(body) {
                    return chunk.render( bodies.block, context );
                }
                else {
                    _console.log( "Missing body block in the if helper!" );
                    return chunk;
                }
            }
            if(skip){
                return chunk.render( bodies['else'], context );
            }
        }
        // no condition
        else {
            _console.log( "No condition given in the if helper!" );
        }
        return chunk;
    },
    eq: function(chunk, context, bodies, params) {
        var actual = context.get(params.key) + '';
        var expected = params.value;
        if (actual === expected) {
            return chunk.render(bodies.block, context);
        } else if (bodies['else']) {
            return chunk.render(bodies['else'], context);
        } else {
            return chunk;
        }
    }
});

module.exports = dust;
