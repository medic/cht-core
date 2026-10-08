const chai = require('chai');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');
const chaiAsPromised = require('chai-as-promised').default;

chai.use(chaiShallowDeepEqual);
chai.use(chaiAsPromised);
chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
