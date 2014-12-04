var dust = require('dust'),
    templates = require('duality/templates'),
    app_settings = require('views/lib/appinfo').getAppInfo(),
    _ = require('underscore');

templates.addHelpers({
    translate: function(chunk, context, bodies, params) {
        var value = dust.helpers.tap(params.value, chunk, context);
        return chunk.write(app_settings.translate(value));
    },
    getMessage: function(chunk, context, bodies, params) {
        var value = dust.helpers.tap(params.value, chunk, context);
        return chunk.write(app_settings.getMessage(value));
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
