var Tokenizer = require('./Tokenizer');

module.exports = function JsonTokenizer() {
    var t = new Tokenizer();

    t.addRule(/^,$/, 'comma');
    t.addRule(/^:$/, 'end-label');
    t.addRule(/^\{$/, 'begin-object');
    t.addRule(/^\}$/, 'end-object');
    t.addRule(/^\[$/, 'begin-array');
    t.addRule(/^\]$/, 'end-array');

    t.addRule(/^"([^"]|\\")*"$/, 'string');
    t.addRule(/^"([^"]|\\")*$/, 'maybe-string');
    t.addRule(/^null$/, 'null');
    t.addRule(/^(true|false)$/, 'boolean');
    t.addRule(/^-?\d+?(\.\d+)?$/, 'number');
    t.addRule(/^-?(\d+\.)?$/, 'maybe-number');
    t.addRule(/^\w+$/, 'symbol');
    t.addRule(Tokenizer.whitespace);
    t.ignore('whitespace');
    // if we had comments tokens, we would ignore them as well
    // but the JSON spec doesn't allow comments!

    return t;
}
