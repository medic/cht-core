var Tokenizer = require('../lib/Tokenizer');
var t = new Tokenizer();
t.on('token', function(token, type) {
    console.log('%s(%s)', token, type);
});
t.addRule(/^"([^"]|\\")*"$/, 'string');
t.addRule(/^"([^"]|\\")*$/, 'maybe-string'); // same as above without the ending "
t.addRule(/^\d+(\.\d+)?$/, 'number');
t.addRule(/^\d+\.$/, 'maybe-float');
t.addRule(/^(true|false)$/, 'bool');
t.addRule(/^null$/, 'null');
t.addRule(/^\{$/, 'begin-object');
t.addRule(/^\}$/, 'end-object');
t.addRule(/^\[$/, 'begin-array');
t.addRule(/^\]$/, 'end-array');
t.addRule(/^:$/, 'end-label');
t.addRule(/^,$/, 'comma');
t.addRule(/^\w+$/, "symbol");
t.addRule(/^(\s)+$/, 'whitespace');

var o = {
    coucou: 'salut',
    complicated: "haha 안녕,; :! {fdf} ' \' \" ",
    nombre: 8,
    bool: false,
    gn: null,
    oo: {
        a: [
            'coucou',
            888.3,
            false
        ]
    }
}

var str = JSON.stringify(o);
console.log('parsing %s', str);
t.write(str);
