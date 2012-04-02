var File = require('file');
var dir = File.dirname(module);
require.loader.paths.unshift(File.join(dir, '..'));
global.jsDump = require('jsDump').jsDump;

function extend(a, b) {
	for (var key in b) {
		a[key] = b[key];
	}
	return a;
}

function require_all(id) {
	for (var i=0; i<arguments.length; i++) {
		extend(global, require(arguments[i]));
	}
}

require_all('assert');

global.tests = {};
global.test = function test (description, func) {
	global.tests['test '+ description] = func;
};