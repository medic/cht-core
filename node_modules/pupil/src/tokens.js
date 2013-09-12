(function(undefined) {
	var tokens = {};

	var addToken = function(name) {
		tokens[name] = {
			name: name,
			toString: function() {
				return name;
			}
		};
	};

	addToken('Identifier');
	addToken('Colon');
	addToken('Comma');
	addToken('LogicalAnd');
	addToken('LogicalOr');
	addToken('LogicalNot');
	addToken('BracketOpen');
	addToken('BracketClose');

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = tokens;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.tokens = tokens;
    }
})();