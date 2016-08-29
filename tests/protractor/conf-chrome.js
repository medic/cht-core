var conf = require('./conf');

if (!conf.config.capabilities) {
	conf.config.capabilities = {};
}
conf.config.capabilities.browserName = 'chrome';

exports.config = conf.config;