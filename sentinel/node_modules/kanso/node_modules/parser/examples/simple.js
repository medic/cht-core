var Tokenizer = require('tokenizer');
var Parser = require('../lib/Parser.js');
var assert = require('assert');
var sys = require('sys');

/**
 * in this example we create a parser that reads a number then reads the
 * [number] words following. whitespaces are ignored
 */

function createTokenizer () {
    var t = new Tokenizer();
    // we only use built-in rules
    t.addRule(Tokenizer.number);
    t.addRule(Tokenizer.word);
    t.addRule(Tokenizer.whitespace);
    t.ignore('whitespace');
    t.on('token', function(token, type) {
      //console.log('got token %s of type ', JSON.stringify(token), type);
    });
    return t;
}

function MyParser () {
    Parser.call(this, createTokenizer());
    //this.initialHander(this.number); // this could be, but let's use
                                     // the 'default handler' method
    this.defaultHandler(this.number);
}
sys.inherits(MyParser, Parser);

MyParser.prototype.number = function number(token, type, next) {
    //console.log('current queue in number', this._queue);
    assert.equal(type, 'number', "unexpected token "+token+"("+type+"). expecting number");
    var nb = parseInt(token);
    for (var i = 0; i < nb; ++i) {
        next(this.word);
    };
    console.log('expecting %d words', nb);
};

MyParser.prototype.word = function word(token, type, next) {
    //console.log('current queue in word', this._queue);
    assert.equal(type, 'word', "unexpected token "+token+". expecting word");
    console.log('read %s', token);
};

// entry point
var file = process.argv[2];
if(!file) file = __dirname+'/simple.txt';

var fs = require('fs');
var ss = fs.createReadStream(file);
ss.setEncoding('utf8');

var p = new MyParser();

ss.on('data', function(data) {
    p.write(data);
});
ss.on('end', function() {
    p.end();
});
