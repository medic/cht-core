const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../../src/db');
const service = require('../../../../src/services/export/feedback-mapper');

describe('Feedback mapper', () => {

  afterEach(() => sinon.restore());

  describe('getDocIds', () => {
    it('queries task-messages and returns message ids', () => {
      const options = { some: 'option' };
      const queryOptions = {
        some: 'option',
        descending: true,
        endkey: 'feedback-',
        include_docs: false,
        startkey: 'feedback-\ufff0'     
      };
      const allDocs = sinon.stub(db.medicUsersMeta, 'allDocs').returns(Promise.resolve({
        rows: [{ id: 1, value: 1 }, { id: 1, value: 2 }, { id: 1, value: 3 }, { id: 2, value: 1 }]
      }));
      return service.getDocIds(options).then(result => {
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0]).to.deep.equal([ queryOptions ]);
        chai.expect(result).to.deep.equal([1, 1, 1, 2]);
      });
    });
  });

  describe('map', () => {
    it('should return correct headers', () => {
      return service.map().then(result => {
        chai.expect(result.header).to.deep.equal([
          'id',
          'reported_date',
          'user',
          'app_version',
          'url',
          'info',
        ]);
      });
    });

    describe('getRows', () => {
      it('works', () => {
        const doc = {
          _id: 1,
          meta: {
            time: 1234567,
            user: { name: 'gareth' },
            version: '3.3.3',
            url: 'http://myapp.com/brokenpage',
          },
          info: {
            stack: [ 'hello', 'goodbye' ],
            error: 'kabloowie',
          },
        };

        return service.map().then(({ getRows }) => {
          const [id, date, user, version, url, info] = getRows(doc)[0];
          chai.expect(id).to.equal(1);
          chai.expect(date).to.equal(1234567);
          chai.expect(user).to.equal('gareth');
          chai.expect(version).to.equal('3.3.3');
          chai.expect(url).to.equal('http://myapp.com/brokenpage');
          chai.expect(info).to.equal('{"stack":["hello"\\,"goodbye"]\\,"error":"kabloowie"}');
        });
      });

    });
  });
});
