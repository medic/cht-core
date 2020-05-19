const chai = require('chai');
const chaiExclude = require('chai-exclude');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiExclude);
chai.use(chaiShallowDeepEqual);
chai.use(chaiAsPromised);
chai.assert.checkDeepProperties = chai.assert.shallowDeepEqual;
