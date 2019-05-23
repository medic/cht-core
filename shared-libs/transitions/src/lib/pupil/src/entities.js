(function(undefined) {
	var entities = {};

	var addEntity = function(name) {
		entities[name] = {
			name: name,
			toString: function() {
				return name;
			}
		};
	};

	addEntity('Block');
	addEntity('Func');
	addEntity('Ternary');
	addEntity('LogicalAnd');
	addEntity('LogicalOr');
	addEntity('LogicalNot');

    // Export the module
    if (typeof module !== 'undefined') {
        module.exports = entities;
    } else {
        window.pupil = window.pupil || {};
        window.pupil.entities = entities;
    }
})();