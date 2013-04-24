var EventEmitter = require('events').EventEmitter;
var util = require('util');
var assert = require('assert');

/**
 * Factory which returns a handler counting the tokens which have been
 * ignored. This is the default handler.
 */
function makeIgnore(ignored) {
    return function ignore(token, type, next) {
        if(type === 'eof') {
            this._ignored = ignored;
            if(ignored.length) {
                console.warn('ignored %d tokens', ignored.length);
            }
            return;
        }
        ignored.push(token);
        next(makeIgnore(ignored));
    }
}

/**
 * A generic parser acting like a writable stream
 * @param tokenizer the tokenizer to use for this parser
 */
function Parser (tokenizer) {
    EventEmitter.apply(this);
    if(!tokenizer) throw Error("you must specify a tokenizer");
    this._tokenizer = tokenizer;
    this._queue = []; // queue of functions to be called on the next token

    var self = this;
    this._tokenizer.on('end', function() {
        self._newToken('', 'eof');
    });
    this._tokenizer.on('token', function(token, type) {
        self._newToken(token, type);
    });
}
util.inherits(Parser, EventEmitter);

/**
 * this function should be called before the parsing begins to specify
 * the first handler of the queue
 * @param h the handler to add at the head of the queue or an array of them
 */
Parser.prototype.initialHandler = function initialHandler(h) {
    // if we get called with an array, then add them to the queue as well
    if(typeof h === 'array') {
        for (var i = 0; i < h.length; ++i) {
            assert.equal(typeof h[i], 'function', "a handler should be a function");
        };
    }
    else {
        assert.equal(typeof h, 'function');
    }
    this._queue.unshift(h);
};

/**
 * Set the default handler for this parser. The default handler is at the
 * very end of the queue and is never removed. By default this is `ignore`
 * @param h the handler to be set as default
 */
Parser.prototype.defaultHandler = function defaultHandler(h) {
    assert.equal(typeof h, 'function', "a handler should be a function");
    function DEFAULT(token, type, next) {
        next(DEFAULT);
        h.apply(this, arguments);
    }
    this._queue.push(DEFAULT);
    this._haveDefault = true;
};

/**
 * Private method. Gets called when a new token is emitted from the tokenizer
 */
Parser.prototype._newToken = function _newToken(token, type) {
    // check that a default handler has been added, if not add one.
    if(!this._haveDefault) this.defaultHandler(makeIgnore([]));
    // if the handler asked to be 'expanded'. It means that the token
    // should be passed to the next handler that's all. However they
    // might have queued up several other handler in the meantime
    var expand = false;
    do {
        // get the handler from the queue
        var f = this._queue.shift();

        // if we don't have any handler something has gone very wrong
        if(!f) {
            this.emit('error', new SyntaxError("no handler for "+token));
            return;
        }

        // define the function allowing the handler to add other handlers
        // after itself (no support for arrays)
        queue = this._queue;
        function next() {
            queue.unshift.apply(queue, arguments);
        }

        // actually call the handler. the scope is the parser
        try {
            expand = f.call(this, token, type, next);
        } catch(e) {
            this.emit('error', e);
            expand = false;
        }
    } while(expand === true) // the handler is expandable, let's roll again

    // too bad that was the end of it...
    if(type === 'eof') {
        this._reachedEnd();
    }
};

/**
 * Private method. Gets called when the end of the stream has been reached
 */
Parser.prototype._reachedEnd = function _reachedEnd() {
    this.emit('end');
};

/**
 * Write to the parser. Haha! We're not even writing! We pass all this stuff
 * to the tokenizer. It's his problem now.
 */
Parser.prototype.write = function write(data, encoding) {
    this._tokenizer.write(data, encoding);
};
/**
 * yeah well, it's an end function of a writable stream, what do you expect?
 */
Parser.prototype.end = function end(data, encoding) {
    this._tokenizer.end(data, encoding);
};

module.exports = Parser;

/**
 * define some useful primitive useful when parsing pretty much anything
 */

/**
 * This return a handler that check if the token is of the specified type
 * and the acts transparently by passing it to the next handler
 * this save the tedious redaction of error messages
 * TODO add supports for multiple types
 * @param type_to_check the type for which to check
 * @return a handler
 */
Parser.checkType = function checkType(type_to_check) {
    return function checkType(token, type, next) {
        assert.equal(type, type_to_check,
            "unexpect token "+token+"("+type+"). expected "+type_to_check);

        return true; // expand this
    }
}

/**
 * Sometimes tokens must be there although they have close to no meaning
 * for example you're probably expecting a parenthesis after a 'if' in many
 * programming languages. This returns a handler doing this type checking
 * @param expected the type of token you expect
 * @return a handler
 */
Parser.expect = function expect(expected) {
    return function expecting(token, type, next) {
        assert.equal(type, expected,
                    "unexpected token "+token+". expecting "+expected);
    }
}

/**
 * This one is very helpful. It helps parsing list of elements that should
 * be parsed by the same handler (rememeber, those can expand). I wanted
 * to call it 'commaSeparated' but... it can do more than that
 * TODO lists with no separators... wow!
 * @param separator the separator between what you want to parse.
 *          separator are *between* elements, not around ; use expect for
 *          this
 * @param handler the handler which will be called for each element of the
 *                you might want to use an expandable handler if you're
 *                expecting complex elements
 * @param end the token that should end the list (be it ')' or '\n' or whatever)
 *            this must be specified so that the handler for separators
 *            doesn't treat it as an unexpected token
 * @param forbidEmpty  forbid empty lists, defaults to false
 * @return your handler, ready to use
 */
Parser.list = function list(separator, handler, end, forbidEmpty) {
    function checkIfEmpty(token, type, next) {
        if(type !== end) {
            // the list is not empty
            next(handler, expectSeparator);
            return true;
        } else {
            // the list is empty
            if(forbidEmpty === true) {
                throw new SyntaxError('unexpected '+ token+ '. empty lists not allowed');
            }
            else {
                return true;
            }
        }
    }
    function expectSeparator(token, type, next) {
        if(type === separator) {
            // if we have our separator
            next(handler, expectSeparator);
            return;
        }
        if(type === end) {
            // if we reached the token ending the list
            // then our job is done
            return true;
        }
        // if it's something else then it is an unexpected token
        throw new SyntaxError("unexpected token "+token+". expecting "+separator);
    }
    return function listExpander(token, type, next) {
        next(checkIfEmpty);
        return true;
    }
}
