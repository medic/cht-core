var dust = require('dust'),
    app_settings = require('views/lib/appinfo').getAppInfo(),
    _ = require('underscore');

// add helpers
_.extend(dust.helpers, {
    translate: function(chunk, context, bodies, params) {
        var value = this.tap(params.value, chunk, context);
        return chunk.write(app_settings.translate(value));
    },
    formatDate: function(chunk, context, bodies, params) {
        var timestamp = Number(this.tap(params.timestamp, chunk, context)),
            format = this.tap(params.format, chunk, context);

        if (_.isNaN(timestamp)) {
            timestamp = this.tap(params.timestamp, chunk, context);
        }

        // todo use data_format setting if format is not passed in
        format = format || 'DD, MMM YYYY, HH:mm:ss ZZ';

        return chunk.write(moment(timestamp).format(format));
    },
    formName: function(chunk, context, bodies, params) {
        var form = this.tap(params.form, chunk, context);

        return chunk.write(sms_utils.getFormTitle(form));
    },
    contact: function(chunk, context, bodies, params) {
        var entities = this.tapObject(params.entities, chunk, context),
            to = this.tap(params.to, chunk, context),
            verbose = this.tap(params.verbose, chunk, context),
            from = this.tap(params.from, chunk, context),
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
            contact = '<i class="icon-question-sign" title="Unknown"></i>';
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
        var array = this.tapArray(params.array, chunk, context),
            state = this.tap(params.state, chunk, context),
            matches;

        matches = _.filter(array, function(item) {
            return item.state === state;
        });

        return bodies.block(chunk, context.push(matches));
    },
    ifHasState: function(chunk, context, bodies, params) {
        var array = this.tapArray(params.array, chunk, context),
            state = this.tap(params.state, chunk, context),
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
        var array1 = this.tapArray(params.array1, chunk, context),
            state = this.tap(params.state, chunk, context),
            matches,
            array = [];

        if (params.array2) {
            array1 = array1.concat(
                this.tapArray(params.array2, chunk, context)
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
            permission = this.tap(params.permission, chunk, context);

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

            cond = this.tap(cond, chunk, context);

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
