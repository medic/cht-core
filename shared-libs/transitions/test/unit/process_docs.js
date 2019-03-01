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
      chai.expect(transitions._lineage.hydrateDocs.args[0]).excludingEvery('_id').to.deep.equal([docs]);
    });
  });

  it('should return original docs when infodoc throws errors', () => {
    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }];
    let hydratedDocs;

    sinon.stub(config, 'get').withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').callsFake(docs => {
      docs.forEach(doc => doc.patient = `patient_${doc.from}`);
      hydratedDocs = docs;
      return Promise.resolve(docs);
    });
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

  it('should apply transitions over every doc and return correctly changed docs', () => {
    const docs = [{ _id: '1', from: 1 }, { _id: '2', from: 2 }, { _id: '3', from: 3 }],
          hydratedDocs = [{ _id: '1', from: 1, patient: 'a' }, {_id: '2', from: 2, patient: 'b' }, { _id: '3', from: 3, patient: 'c' }],
          infoDocs = [{ _id: '1-info', doc_id: '1' }, { _id: '2-info', doc_id: '2' }, { _id: '3-info', doc_id: '3' }];

    sinon.stub(config, 'get').withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').resolves(hydratedDocs);

    sinon.stub(infodoc, 'bulkGet').resolves(infoDocs);
    sinon.stub(infodoc, 'bulkUpdate').resolves();
    sinon.stub(transitions, 'applyTransitions');

    // first doc is updated by at least one transition, also simulate
    transitions.applyTransitions
      .withArgs(sinon.match({ id: '1' }))
      .callsFake((change, cb) => (change.doc.updated = true && delete change.doc.patient) && cb(null, true));
    // second doc is not touched by any transition
    transitions.applyTransitions
      .withArgs(sinon.match({ id: '2' }))
      .callsFake((change, cb) => cb());

    // third doc just has errors, and no successful transitions
    transitions.applyTransitions
      .withArgs(sinon.match({ id: '3' }))
      .callsFake((change, cb) => (change.doc.errors = true && delete change.doc.patient) && cb(null, false));

    transitions.loadTransitions();
    return transitions.processDocs(docs).then(results => {
      chai.expect(transitions._lineage.hydrateDocs.callCount).to.equal(1);
      chai.expect(infodoc.bulkGet.callCount).to.equal(1);
      chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
      chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([infoDocs]);
      chai.expect(transitions.applyTransitions.callCount).to.equal(3);
      chai.expect(transitions.applyTransitions.calledWithMatch({ id: '1', doc: hydratedDocs[0], info: infoDocs[0] })).to.equal(true);
      chai.expect(transitions.applyTransitions.calledWithMatch({ id: '2', doc: hydratedDocs[1], info: infoDocs[1] })).to.equal(true);
      chai.expect(transitions.applyTransitions.calledWithMatch({ id: '3', doc: hydratedDocs[2], info: infoDocs[2] })).to.equal(true);

      chai.expect(results).to.deep.equal([
        { _id: '1', from: 1, updated: true },
        { _id: '2', from: 2 },
        { _id: '3', from: 3 }
      ]);
    });
  });
});
