const { expect } = require('chai');
const utils = require('../utils');

const docs = [];
const iterations = 500;

const getRowsLength = (result) => {
  return result.rows.filter(({ doc }) => doc).length;
};

const requestView = () => {
  // return utils.db.query('medic-client/reports_by_form', { include_docs: true, reduce: false }),
  return utils.request({
    path: '/medic/_design/medic-client/_view/reports_by_form',
    qs: {
      include_docs: true,
      reduce: false,
      r: 2,
    },
  });
};

const getThing = () => {
  return utils.request({ path: '/_node/_local/_config' });
};

const getChanges = (docs) => {
  return utils.request({
    path: '/medic/_changes',
    qs: {
      filter: '_doc_ids',
      doc_ids: JSON.stringify(docs.map(doc => doc._id)),
    },
  });
};

describe('view test', () => {
  it('should ', async () => {
    console.log((await getThing()).cluster);
  });

  for (let i = 0; i < iterations; i++) {
    it(`should get correct query results ${i}`, async () => {
      const doc = {
        _id: `doc_${i}`,
        type: 'data_record',
        reported_date: Date.now(),
        form: `form_${i}`,
        fields: {
          some_data: 'hello',
          a_number: i * i,
        }
      };

      await utils.saveDocs([doc]);
      docs.push(doc);

      const viewResults = await Promise.all([
        requestView(),
        requestView(),
        requestView(),
      ]);

      expect(viewResults[0].rows.length).to.equal(docs.length);
      expect(viewResults[1].rows.length).to.equal(docs.length);
      expect(viewResults[2].rows.length).to.equal(docs.length);
    });
  }

  for (let i = 0; i < iterations; i++) {
    xit(`should get correct changes results ${i}`, async () => {
      const doc = {
        _id: `doc_${i}`,
        type: 'data_record',
        reported_date: Date.now(),
        form: `form_${i}`,
        fields: {
          some_data: 'hello',
          a_number: i * i,
        }
      };

      await utils.saveDocs([doc]);
      docs.push(doc);

      const changesResults = await Promise.all([
        getChanges(docs),
        getChanges(docs),
        getChanges(docs),
      ]);

      expect(changesResults[0].results.length).to.equal(docs.length);
      expect(changesResults[1].results.length).to.equal(docs.length);
      expect(changesResults[2].results.length).to.equal(docs.length);
    });
  }

  for (let i = 0; i < iterations; i++) {
    it(`should get correct query results after delete ${i}`, async () => {
      const [{ _id: docId }] = docs.splice(0, 1);
      await utils.deleteDoc(docId);

      const viewResults = await Promise.all([
        requestView(),
        requestView(),
        requestView(),
      ]);

      expect(getRowsLength(viewResults[0])).to.equal(docs.length);
      expect(getRowsLength(viewResults[1])).to.equal(docs.length);
      expect(getRowsLength(viewResults[2])).to.equal(docs.length);
    });
  }

});
