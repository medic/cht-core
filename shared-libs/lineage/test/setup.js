const chai = require('chai');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');

chai.use(chaiShallowDeepEqual);
chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
