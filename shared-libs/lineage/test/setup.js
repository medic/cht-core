const chai = require('chai');
const chaiExclude = require('chai-exclude');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');

chai.use(chaiExclude);
chai.use(chaiShallowDeepEqual);
chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
