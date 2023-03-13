const sinon = require('sinon');
const config = require('../../src/config');
const db = require('../../src/db');
const transitions = require('../../src/transitions/index');
const infodoc = require('@medic/infodoc');
const chai = require('chai');
const chaiExclude = require('chai-exclude');

chai.use(chaiExclude);

describe('processDocs', () => {
  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
    });
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('should save original docs if no transitions are present', () => {
    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }];
    config.get.withArgs('transitions').returns({});
    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }, { ok: true }, { ok: true }]);
    transitions.loadTransitions();

    return transitions.processDocs(docs).then(result => {
      chai.expect(result).to.deep.equal([{ ok: true }, { ok: true }, { ok: true }]);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0]).excludingEvery('_id').to.deep.equal([docs]);
      chai.expect(db.medic.bulkDocs.args[0][0].every(doc => doc._id));
    });
  });

  it('should save original docs when lineage throws errors', () => {
    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }];

    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }, { ok: true }, { ok: true }]);
    config.get.withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').rejects({ some: 'err' });

    transitions.loadTransitions();
    return transitions.processDocs(docs).then(result => {
      chai.expect(transitions._lineage.hydrateDocs.callCount).to.equal(1);
      chai.expect(transitions._lineage.hydrateDocs.args[0]).excludingEvery('_id').to.deep.equal([docs]);

      chai.expect(result).to.deep.equal([{ ok: true }, { ok: true }, { ok: true }]);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0]).excludingEvery('_id').to.deep.equal([docs]);
      chai.expect(db.medic.bulkDocs.args[0][0].every(doc => doc._id));
    });
  });

  it('should save original docs when infodoc throws errors', () => {
    const docs = [{ from: 1 }, { from: 2 }, { from: 3 }];
    let hydratedDocs;

    sinon.stub(db.medic, 'bulkDocs').resolves([{ ok: true }, { ok: true }, { ok: true }]);
    config.get.withArgs('transitions').returns({ update_clinics: true });
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

      chai.expect(result).to.deep.equal([{ ok: true }, { ok: true }, { ok: true }]);
      chai.expect(db.medic.bulkDocs.callCount).to.equal(1);
      chai.expect(db.medic.bulkDocs.args[0]).excludingEvery('_id').to.deep.equal([docs]);
      chai.expect(db.medic.bulkDocs.args[0][0].every(doc => doc._id));
    });
  });

  it('should apply transitions over every doc and save correctly changed docs', () => {
    const docs = [{ _id: '1', from: 1 }, { _id: '2', from: 2 }, { _id: '3', from: 3 }];
    const hydratedDocs = [
      { _id: '1', from: 1, patient: 'a' }, {_id: '2', from: 2, patient: 'b' }, { _id: '3', from: 3, patient: 'c' }
    ];
    const infoDocs = [
      { _id: '1-info', doc_id: '1' }, { _id: '2-info', doc_id: '2' }, { _id: '3-info', doc_id: '3' }
    ];

    config.get.withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').resolves(hydratedDocs);

    sinon.stub(infodoc, 'bulkGet').resolves(infoDocs);
    sinon.stub(infodoc, 'bulkUpdate').resolves();
    sinon.stub(transitions, 'applyTransition');
    sinon.stub(db.medic, 'put').callsArgWith(1, null, { ok: true });
    sinon.stub(infodoc, 'saveTransitions').resolves();

    // first doc is updated by at least one transition
    transitions.applyTransition
      .withArgs(sinon.match({ change: { id: '1' } }))
      .callsFake(({ change }, cb) => (change.doc.contact = true && delete change.doc.patient) && cb(null, true));
    // second doc is not touched by any transition
    transitions.applyTransition
      .withArgs(sinon.match({ change: { id: '2' } }))
      .callsFake((params, cb) => cb());
    // third doc just has errors, and no successful transitions
    transitions.applyTransition
      .withArgs(sinon.match({ change: { id: '3' } }))
      .callsFake(({ change }, cb) => (change.doc.errors = true && delete change.doc.patient) && cb(null, false));

    transitions.loadTransitions();
    return transitions.processDocs(docs).then(results => {
      chai.expect(transitions._lineage.hydrateDocs.callCount).to.equal(1);
      chai.expect(infodoc.bulkGet.callCount).to.equal(1);
      chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
      chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([infoDocs]);
      chai.expect(transitions.applyTransition.callCount).to.equal(3);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '1', doc: hydratedDocs[0], info: infoDocs[0] }}
      )).to.equal(true);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '2', doc: docs[1], info: infoDocs[1] }}
      )).to.equal(true);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '3', doc: docs[2], info: infoDocs[2] }}
      )).to.equal(true);

      chai.expect(results).to.deep.equal([{ ok: true }, { ok: true }, { ok: true }]);
      chai.expect(db.medic.put.callCount).to.equal(3);
      chai.expect(db.medic.put.calledWith({ _id: '1', from: 1, contact: true })).to.equal(true);
      chai.expect(db.medic.put.calledWith({ _id: '2', from: 2 })).to.equal(true);
      chai.expect(db.medic.put.calledWith({ _id: '3', from: 3 })).to.equal(true);

      chai.expect(infodoc.saveTransitions.callCount).to.equal(3);
      chai.expect(infodoc.saveTransitions.calledWithMatch({ id: '1' })).to.equal(true);
    });
  });

  it('should return errors as results when saving fails', () => {
    const docs = [{ _id: '1', from: 1 }, { _id: '2', from: 2 }, { _id: '3', from: 3 }, { _id: '4', from: 4 }];
    const hydratedDocs = [
      { _id: '1', from: 1, patient: 'a' },
      { _id: '2', from: 2, patient: 'b' },
      { _id: '3', from: 3, patient: 'c' },
      { _id: '4', from: 4, patient: 'd' },
    ];
    const infoDocs = [
      { _id: '1-info', doc_id: '1' },
      { _id: '2-info', doc_id: '2' },
      { _id: '3-info', doc_id: '3' },
      { _id: '4-info', doc_id: '4' }
    ];

    config.get.withArgs('transitions').returns({ update_clinics: true });
    sinon.stub(transitions._lineage, 'hydrateDocs').resolves(hydratedDocs);

    sinon.stub(infodoc, 'bulkGet').resolves(infoDocs);
    sinon.stub(infodoc, 'bulkUpdate').resolves();
    sinon.stub(transitions, 'applyTransition');
    sinon.stub(db.medic, 'put')
      .withArgs(sinon.match({ _id: '1' })).callsArgWith(1, null, { ok: true })
      .withArgs(sinon.match({ _id: '2' })).callsArgWith(1, { error: 'error' })
      .withArgs(sinon.match({ _id: '3' })).callsArgWith(1, null, { ok: true })
      .withArgs(sinon.match({ _id: '4' })).callsArgWith(1, { error: 'error' });
    sinon.stub(infodoc, 'saveTransitions').resolves();

    // first doc is updated by at least one transition
    transitions.applyTransition
      .withArgs(sinon.match({ change: ({ id: '1' }) }))
      .callsFake(({ change }, cb) => (change.doc.contact = true && delete change.doc.patient) && cb(null, true));
    transitions.applyTransition
      .withArgs(sinon.match({ change: { id: '2' } }))
      .callsFake(({ change }, cb) => (change.doc.contact = true && delete change.doc.patient) && cb(null, true));
    transitions.applyTransition
      .withArgs(sinon.match({ change: { id: '3' } }))
      .callsFake((params, cb) => cb());
    transitions.applyTransition
      .withArgs(sinon.match({ change: { id: '4' } }))
      .callsFake((params, cb) => cb());


    transitions.loadTransitions();
    return transitions.processDocs(docs).then(results => {
      chai.expect(transitions._lineage.hydrateDocs.callCount).to.equal(1);
      chai.expect(infodoc.bulkGet.callCount).to.equal(1);
      chai.expect(infodoc.bulkUpdate.callCount).to.equal(1);
      chai.expect(infodoc.bulkUpdate.args[0]).to.deep.equal([infoDocs]);
      chai.expect(transitions.applyTransition.callCount).to.equal(4);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '1', doc: hydratedDocs[0], info: infoDocs[0] }}
      )).to.equal(true);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '2', doc: hydratedDocs[1], info: infoDocs[1] }}
      )).to.equal(true);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '3', doc: docs[2], info: infoDocs[2] }}
      )).to.equal(true);
      chai.expect(transitions.applyTransition.calledWithMatch(
        { change: { id: '4', doc: docs[3], info: infoDocs[3] }}
      )).to.equal(true);

      chai.expect(results).to.deep.equal([{ ok: true }, { error: 'error' }, { ok: true }, { error: 'error' }]);
      chai.expect(db.medic.put.callCount).to.equal(4);
      chai.expect(db.medic.put.calledWith({ _id: '1', from: 1, contact: true })).to.equal(true);
      chai.expect(db.medic.put.calledWith({ _id: '2', from: 2, contact: true })).to.equal(true);
      chai.expect(db.medic.put.calledWith({ _id: '3', from: 3 })).to.equal(true);
      chai.expect(db.medic.put.calledWith({ _id: '4', from: 4 })).to.equal(true);

      chai.expect(infodoc.saveTransitions.callCount).to.equal(3);
      chai.expect(infodoc.saveTransitions.calledWithMatch({ id: '1' })).to.equal(true);
    });
  });
});
