var Parser = require('parser/lib/Parser');
var Tokenizer = require('./JsonTokenizer');
var util = require('util');
var assert = require('assert');


/**
 * The constuctor for Json parsing streams.
 * @inherits Parser
 */
function ParseStream () {
    Parser.call(this, new Tokenizer());

    this.depth = 0;
    this.initialHandler(this.root());
    // TODO set a default handler which is stricter than `ignore`
    this.defaultHandler(function(token, type, next) {
        if(type !== 'eof') {
            throw new SyntaxError("unexpected token "+token+". expected eof");
        }
    });
}
util.inherits(ParseStream, Parser);

/**
 * Factory. Returns a handler able to parse any JSON value
 * @param set a function to be called when the value has to be set
 *          on its parent object or array.
 * @return a handler expanding to the correct handlers depending on the 
 *          token we get
 */
ParseStream.prototype.value = function(set) {
    return function value(token, type, next) {
        switch(type) {
            case 'begin-object':
                next(this.object(set));
                break;
            case 'begin-array':
                next(this.array(set));
                break;
            case 'string':
            case 'boolean':
            case 'number':
            case 'null':
                next(this.native(set));
                break;
            default:
                throw new SyntaxError("unexpected token "+token);
                break;
        }
        return true;
    };
}

/**
 * Factory. Returns a handler able to parse any non-composed value
 *          (string, boolean, number, null)
 *  @param set the function to set the value on its parent
 *  @return a handler
 */
ParseStream.prototype.native = function Native(set) {
    return function Native(token, type, next) {
        switch(type) {
            case 'boolean':
                if(token[0] === 't') {
                    set(true);
                }
                else set(false);
                break;
            case 'null':
                set(null);
                break;
            case 'number':
                var int = (token.indexOf('.') === -1);
                set(int ? parseInt(token) : parseFloat(token));
                break;
            case 'string':
                set(JSON.parse(token));
                break;
            default:
                throw new SyntaxError("unexpected token "+token+". expecting native");
        }
    }
};

/**
 * Replaces Parser.expect('begin-array'), only it emits an event
 */

ParseStream.prototype.beginArray = function (arr) {
    var that = this;
    return function expecting(token, type, next) {
        if (type !== 'begin-array') {
            throw new Error(
                'unexpected token ' + token + '. expecting begin-array'
            );
        }
        //that.emit('begin-array', arr, that.depth);
        that.depth++;
    };
};

/**
 * Replaces Parser.expect('end-array'), only it emits an event
 */

ParseStream.prototype.endArray = function (arr) {
    var that = this;
    return function expecting(token, type, next) {
        if (type !== 'end-array') {
            throw new Error(
                'unexpected token ' + token + '. expecting end-array'
            );
        }
        that.depth--;
        //that.emit('end-array', arr, that.depth);
    };
};

/**
 * Replaces Parser.expect('begin-object'), only it emits an event
 */

ParseStream.prototype.beginObject = function (obj) {
    var that = this;
    return function expecting(token, type, next) {
        if (type !== 'begin-object') {
            throw new Error(
                'unexpected token ' + token + '. expecting begin-object'
            );
        }
        //that.emit('begin-object', obj, that.depth);
        that.depth++;
    };
};

/**
 * Replaces Parser.expect('end-object'), only it emits an event
 */

ParseStream.prototype.endObject = function (obj) {
    var that = this;
    return function expecting(token, type, next) {
        if (type !== 'end-object') {
            throw new Error(
                'unexpected token ' + token + '. expecting end-object'
            );
        }
        that.depth--;
        //that.emit('end-object', obj, that.depth);
        if (that.depth === 0) {
            // now at the level of the the root array, so this is a complete doc
            that.emit('doc', obj);
        }
    };
};

/**
 * Factory. Returns a handler able to parse a the root object, unlike the
 * array and object methods, this will not create an object to store
 * sub-objects. instead, subobjects are emitted individually.
 *
 * @return a handler expanding to the correct handlers
 */
ParseStream.prototype.root = function root() {
    var that = this;
    var o = {};
    function objectSet (label, value) {
        o[label] = value;
    }
    return function root (token, type, next) {
        if (type === 'begin-array') {
            that.emit('type', 'array');
            next(
                //that.beginArray(),
                Parser.expect('begin-array'),
                Parser.list(
                    'comma',                    // array
                    this.value(function () {}), // values
                    'end-array'                 // token ending the list
                ),
                Parser.expect('end-array')
                //that.endArray()
            );
        }
        else if (type === 'begin-object') {
            that.emit('type', 'object');
            next(
                that.beginObject(o),
                Parser.list(
                    'comma',                      // separator
                    this.labeledValue(objectSet), // values
                    'end-object'                  // token ending the list
                ),
                that.endObject(o)
            );
        }
        return true; //expand this
    }
};

/**
 * Factory. Returns a handler able to parse an array
 * @param set a function to set this array on its parent
 * @return a handler expanding to the correct handlers
 */
ParseStream.prototype.array = function array(set) {
    var a = [];
    set(a);
    function arraySet (value) {
        a.push(value);
    }
    var that = this;
    return function array (token, type, next) {
        next(
            that.beginArray(a),
            Parser.list(
                'comma',                // array
                this.value(arraySet),   // values
                'end-array'             // token ending the list
            ),
            that.endArray(a)
        );
        return true; //expand this
    }
};

/**
 * Factory. Returns a handler able to parse a javascript object
 * @param set the function to set this object on its parent
 * @return a handler expanding to the correct handler to parse an object
 */
ParseStream.prototype.object = function object(set) {
    var o = {};
    set(o);
    function objectSet (label, value) {
        o[label] = value;
    }
    var that = this;
    return function object (token, type, next) {
        next(
            that.beginObject(o),
            Parser.list(
                'comma',                        // separator
                this.labeledValue(objectSet),   // values
                'end-object'                    // token ending the list
            ),
            that.endObject(o)
        )
        return true;
    }
};

/**
 * Factory. returns a handler able to parse labeled value (as in JS objects)
 * @param objectSet the function to set the labeled value on the parent object
 * @return a handler expanding to the correct handlers to parse a labeled value
 */
ParseStream.prototype.labeledValue = function labeledValue(objectSet) {
    var label;
    /**
     * this handler reads the label and sets the closured var `label`
     */
    function readLabel (token, type, next) {
        assert.equal(type, 'string', "unexpected token "+token+". expected string");
        label = JSON.parse(token);
    }
    /**
     * this is the function that should be called when the value part has
     * to be set
     */
    function set (value) {
        objectSet(label, value);
    }

    /**
     * the actual handler
     */
    return function labeledValue (token, type, next) {
        next(
            readLabel,
            Parser.expect('end-label'),
            this.value(set)
        );
        return true;
    }
};

ParseStream.prototype._reachedEnd = function _reachedEnd() {
    this.emit('end', this._object);
};

ParseStream.prototype.writable = true;

ParseStream.prototype.destroy = function destroy() {
    // do not emit anymore
};


module.exports = ParseStream;
