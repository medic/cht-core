const chai = require('chai');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');
const chaiAsPromised = require('chai-as-promised').default;
// Pre-load ESM-only dependency so rewire does not try to compile it as CommonJS
require('url-join');

chai.use(chaiShallowDeepEqual);
chai.use(chaiAsPromised);
chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
