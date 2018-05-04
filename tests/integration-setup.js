const chai = require('chai');
const chaiExclude = require('chai-exclude');
const { db } = require('./utils');
const ddocExtraction = require('../api/src/ddoc-extraction');

chai.use(chaiExclude);

before(function(done) {
  this.timeout(10000);
  ddocExtraction.run(db, done);
});
