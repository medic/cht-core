const chai = require('chai');
const chaiExclude = require('chai-exclude');
const chaiShallowDeepEqual = require('chai-shallow-deep-equal');
const ddocExtraction = require('../api/src/ddoc-extraction');

chai.use(chaiExclude);
chai.use(chaiShallowDeepEqual);

before(function() {
  this.timeout(10000);
  return ddocExtraction.run();
});
