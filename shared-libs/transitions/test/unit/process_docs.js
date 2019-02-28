const sinon = require('sinon'),
      config = require('../../src/config'),
      transitions = require('../../src/transitions/index'),
      infodoc = require('../../src/lib/infodoc'),
      chai = require('chai'),
      chaiExclude = require('chai-exclude');

chai.use(chaiExclude);

describe('processDocs', () => {
  afterEach(() => sinon.restore());

  it('should return original docs if no transitions are present', () => {
    sinon.stub(config, 'get').withArgs('transitions').returns({});
    transitions.loadTransitions();

    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }];
    return transitions.processDocs(docs).then(result => {
      chai.expect(result).to.deep.equal(docs);
    });
  });

  it('should return original docs when lineage throws errors', () => {
    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }];

    sinon.stub(config, 'get').withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').rejects({ some: 'err' });

    transitions.loadTransitions();
    return transitions.processDocs(docs).then(result => {
      chai.expect(result).to.deep.equal(docs);
      chai.expect(transitions._lineage.hydrateDocs.callCount).to.equal(1);
      chai.expect(transitions._lineage.hydrateDocs.args[0]).to.deep.equal([docs]);
    });
  });

  it('should return original docs when infodoc throws errors', () => {
    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }],
          hydratedDocs = [{ from: 1, patient: 'a' }, { from: 2, patient: 'b' }, { from: 3, patient: 'c' }];

    sinon.stub(config, 'get').withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').resolves(hydratedDocs);
    sinon.stub(infodoc, 'bulkGet').rejects({ some: 'err' });

    transitions.loadTransitions();
    return transitions.processDocs(docs).then(result => {
      chai.expect(transitions._lineage.hydrateDocs.callCount).to.equal(1);
      chai.expect(infodoc.bulkGet.callCount).to.equal(1);
      const changes = infodoc.bulkGet.args[0][0];
      chai.expect(changes[0]).to.deep.equal({ id: hydratedDocs[0]._id, doc: hydratedDocs[0], seq: null });
      chai.expect(changes[1]).to.deep.equal({ id: hydratedDocs[1]._id, doc: hydratedDocs[1], seq: null });
      chai.expect(changes[2]).to.deep.equal({ id: hydratedDocs[2]._id, doc: hydratedDocs[2], seq: null });
      chai.expect(changes.every(change => change.id && change.id.length === 36)).to.equal(true);

      chai.expect(result).to.deep.equal(docs);
      chai.expect(result.every(doc => !doc._id)).to.equal(true);
    });
  });

  it('should apply transitions over every doc', () => {
    const docs = [{ _id: '1', from: 1 }, { _id: '2', from: 2 }, { _id: '3', from: 3 }],
          hydratedDocs = [{ from: 1, patient: 'a' }, { from: 2, patient: 'b' }, { from: 3, patient: 'c' }],
          infoDocs = [{ _id: '1-info', doc_id: '1' }, { _id: '2-info', doc_id: '2' }, { _id: '3-info', doc_id: '3' }];

    sinon.stub(config, 'get').withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').resolves(hydratedDocs);

    sinon.stub(infodoc, 'bulkGet').resolves(infoDocs);
    sinon.stub(transitions, 'applyTransitions').resolves([]);

    transitions.loadTransitions();
    return transitions.processDocs(docs);

  });
});
