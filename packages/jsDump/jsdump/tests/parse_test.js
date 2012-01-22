require('./helper');


var TESTS = {};


TESTS.strings = [
	{
		input:  "The quick brown fox jumps over the lazy dog",
		result:'"The quick brown fox jumps over the lazy dog"'
	},
	{
		input:  "",
		result:'""'
	},
	{
		input:  " ",
		result:'" "'
	},
	{
		input:  "\t\n",
		result:'"\t\n"'
	},
	{
		input:  "Съешь же ещё этих мягких французских булок, да выпей чаю",
		result:'"Съешь же ещё этих мягких французских булок, да выпей чаю"'
	},
	{
		input:  "„Fix, Schwyz!“ quäkt Jürgen blöd vom Paß",
		result:'"„Fix, Schwyz!“ quäkt Jürgen blöd vom Paß"'
	},
	{
		input:   "Either the well was very deep, or she fell very slowly, for she had plenty of time as \n\
	she went down to look about her and to wonder what was going to happen next. First, she tried to look down and \n\
	make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, \n\
	and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung \n\
	upon pegs. She took down a jar from one of the shelves as she passed; it was labelled `ORANGE MARMALADE', but to \n\
	her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody, so managed \n\
	to put it into one of the cupboards as she fell past it.",
		result:"\"Either the well was very deep, or she fell very slowly, for she had plenty of time as \n\
	she went down to look about her and to wonder what was going to happen next. First, she tried to look down and \n\
	make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, \n\
	and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung \n\
	upon pegs. She took down a jar from one of the shelves as she passed; it was labelled `ORANGE MARMALADE', but to \n\
	her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody, so managed \n\
	to put it into one of the cupboards as she fell past it.\""
	},
	{
		input: new String('Z'),
		result: '{\n   "0": "Z"\n}'
	}
];


TESTS.numbers = [
	{
		input:  1,
		result:"1"
	},
	{
		input:  0,
		result:"0"
	},
	{
		input:  98.7654321,
		result:"98.7654321"
	},
	{
		input:  0.12345,
		result:"0.12345"
	},
	{
		input:  NaN,
		result:"NaN"
	},
	{
		input:  Infinity,
		result:"Infinity"
	},
	{
		input:  -Infinity,
		result:"-Infinity"
	},
	{
		input:  new Number(42),
		result: '{}'
	}
];


TESTS.arrays = [
	{
		input:  [],
		result:"[]"
	},
	{
		input:  [
			[]
		],
		result:
						"[\n   []\n]"
	},
	{
		input:  [
			[
				[]
			]
		],
		result:"[\n   [\n      []\n   ]\n]"
	},
	{
		input:  [
			[],
			[],
			[]
		],
		result:"[\n   [],\n   [],\n   []\n]"
	},
	{
		input:  ["Down", ["to", ["the", ["Rabbit", ["Hole"]]]]],
		result:
'[\n\
   "Down",\n\
   [\n\
      "to",\n\
      [\n\
         "the",\n\
         [\n\
            "Rabbit",\n\
            [\n\
               "Hole"\n\
            ]\n\
         ]\n\
      ]\n\
   ]\n\
]'
	},
	{
		input:  new Array(3, 0, -1),
		result: '[\n   3,\n   0,\n   -1\n]'
	}
];


TESTS.functions = [
	{
		input:  function empty() {
		},
		result:'function empty(){\n   [code]\n}'
	},
	{
		input:  function makeArray() {
			return Array.prototype.slice.call(arguments)
		},
		result:'function makeArray(){\n   [code]\n}'
	},
	{
		input:  function square(x) {
			return x * x;
		},
		result:'function square( a ){\n   [code]\n}'
	},
	{
		input:  function max(a, b) {
			return a > b ? a : b;
		},
		result: 'function max( a, b ){\n   [code]\n}'
	}
];


TESTS['undefined'] = [
	{
		input:  undefined,
		result:'undefined'
	}
];


TESTS['null'] = [
	{
		input:  null,
		result:'null'
	}
];


TESTS.booleans = [
	{
		input:  true,
		result:'true'
	},
	{
		input:  false,
		result:'false'
	},
	{
		input:  new Boolean(true),
		result: '{}'
	},
	{
		input:  new Boolean(false),
		result: '{}'
	}
];


TESTS.regexps = [
	{
		input:  /<[^<>]*>/,
		result:'/<[^<>]*>/'
	},
	{
		input:  /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
		result:'/^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/'
	},
	{
		input: /(bb|[^b]{2})/i,
		result: '/(bb|[^b]{2})/i'
	},
	{
		input: /(bb|[^b]{2})/m,
		result: '/(bb|[^b]{2})/m'
	},
	{
		input: new RegExp('(bb|[^b]{2})', 'g'),
		result: '/(bb|[^b]{2})/g'
	}
];


TESTS.objects = [
	{
		input:  {"x": 1},
		result:'{\n   "x": 1\n}'
	},
	{
		input:  {},
		result:'{}'
	},
	{
		input:  {"roses": "red", "grass": "green", "violets": "blue"},
		result:'{\n   "roses": "red",\n   "grass": "green",\n   "violets": "blue"\n}'
	},
	{
		input:  {"list": [1, 2, 3]},
		result:'{\n   "list": [\n      1,\n      2,\n      3\n   ]\n}'
	},
	{
		input:  {"length": 0, "width": 0},
		result:'{\n   "length": 0,\n   "width": 0\n}'
	},
	{
		input: {
			a: [
				"string", null, 0, "1", 1, {
					prop: null,
					foo: [1,2,null,{}, [], [1,2,3]],
					bar: undefined
				}, 3, "Hey!", "Κάνε πάντα γνωρίζουμε ας των, μηχανής επιδιόρθωσης επιδιορθώσεις ώς μια. Κλπ ας"
			],
			unicode: "老 汉语中存在 港澳和海外的华人圈中 贵州 我去了书店 现在尚有争",
			b: "b",
			c: function() {
				return this.a
			}
		},
		result:
'{\n\
   "a": [\n\
      "string",\n\
      null,\n\
      0,\n\
      "1",\n\
      1,\n\
      {\n\
         "prop": null,\n\
         "foo": [\n\
            1,\n\
            2,\n\
            null,\n\
            {},\n\
            [],\n\
            [\n\
               1,\n\
               2,\n\
               3\n\
            ]\n\
         ],\n\
         "bar": undefined\n\
      },\n\
      3,\n\
      "Hey!",\n\
      "Κάνε πάντα γνωρίζουμε ας των, μηχανής επιδιόρθωσης επιδιορθώσεις ώς μια. Κλπ ας"\n\
   ],\n\
   "unicode": "老 汉语中存在 港澳和海外的华人圈中 贵州 我去了书店 现在尚有争",\n\
   "b": "b",\n\
   "c": function(){\n\
      [code]\n\
   }\n\
}'
	}
];


for (var key in TESTS) (function(key) {
	test(key, function() {
		for (var i = 0; i < TESTS[key].length; i++) {
			var a = jsDump.parse(TESTS[key][i].input);
			var b = TESTS[key][i].result;
			strictEqual(a, b);
		}
	})
})(key);


if (module === require.main) {
	require("test").run(tests);
}
