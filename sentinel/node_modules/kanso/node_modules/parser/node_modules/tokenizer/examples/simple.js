var Tokenizer = require('../lib/Tokenizer');
var t = new Tokenizer(function(token, match) {
    // change the type of the token before emitting it
    if(match.type == 'word' && token == "coucou") return "coucou";
    // this help reduce the number of RegExps needed
});

t.addRule(/^"[^"]*"$/, 'citation');
t.addRule(/^"[^"]*$/, 'maybe citation');
// the 'maybe citation' rule is here to continue matching until
// the closing quote is found

t.addRule(/^salut$/i, 'salut');
t.addRule(/^[',;.:!?-]$/, 'ponctuation');
t.addRule(/^\w+$/, "word");
t.addRule(/^(\s)+$/, 'whitespace');

t.write("coucou Salut\t les \n amis. On m'a dit \"ca va bien?\" ");
t.end();

