const chai = require('chai');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');
// Pre-load ESM-only dependency so rewire does not try to compile it as CommonJS
require('url-join');

chai.use(chaiShallowDeepEqual);
chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
