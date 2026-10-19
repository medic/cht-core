import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { HttpClient } from '@angular/common/http';

import { ReplicationService } from '@mm-services/replication.service';
import { DbService } from '@mm-services/db.service';
import { of, throwError } from 'rxjs';
import { RulesEngineService } from '@mm-services/rules-engine.service';


describe('ContactTypes service', () => {
  let service:ReplicationService;
  let localDb;
  let remoteDb;
  let dbService;
  let http;
  let rulesEngineService;

  beforeEach(() => {
    http = {
      get: sinon.stub(),
      post: sinon.stub(),
    };
    localDb = {
      allDocs: sinon.stub(),
      bulkDocs: sinon.stub().callsFake(docs => Promise.resolve(docs.map(doc => ({ id: doc._id, ok: true })))),
    };
    remoteDb = {
      bulkGet: sinon.stub(),
    };
    rulesEngineService = {
      monitorExternalChanges: sinon.stub(),
      monitorPurgedDocs: sinon.stub().resolves(),
    };

    dbService = sinon.stub();
    dbService.withArgs().returns(localDb);
    dbService.withArgs({ remote: true }).returns(remoteDb);

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: dbService } },
        { provide: HttpClient, useValue: http },
        { provide: RulesEngineService, useValue: rulesEngineService },
      ]
    });

    service = TestBed.inject(ReplicationService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('replicate from', () => {
    it('should notify the rules engine with report context after purging', async () => {
      const report = {
        _id: 'report', _rev: '1-report', type: 'data_record', form: 'follow_up',
        fields: { patient_id: 'patient' },
      };
      localDb.allDocs.withArgs().resolves({ rows: [{ id: report._id, value: { rev: report._rev } }] });
      localDb.allDocs.withArgs({ keys: ['report'], include_docs: true }).resolves({ rows: [{ doc: report }] });
      localDb.bulkDocs.resolves([{ id: report._id, ok: true, rev: '2-report' }]);
      http.get.returns(of({ doc_ids_revs: [] }));
      http.post.returns(of({ doc_ids: ['report'] }));

      await service.replicateFrom();

      expect(rulesEngineService.monitorPurgedDocs.args).to.deep.equal([[ [report] ]]);
      expect(rulesEngineService.monitorPurgedDocs.calledAfter(localDb.bulkDocs)).to.equal(true);
      expect(localDb.bulkDocs.args).to.deep.equal([[[
        { _id: 'report', _rev: '1-report', _deleted: true, purged: true },
      ]]]);
    });

    it('should do nothing when no updates are required', async () => {
      localDb.allDocs.resolves({
        rows: [
          { id: '1', value: { rev: 1 } },
          { id: '2', value: { rev: 1 } },
          { id: '3', value: { rev: 1 } },
        ]
      });
      http.get.returns(of({
        doc_ids_revs: [
          { id: '1', rev: 1 },
          { id: '2', rev: 1 },
          { id: '3', rev: 1 },
        ]
      }));
      const resp = await service.replicateFrom();

      expect(resp).to.deep.equal( { read_docs: 0 });
      expect(localDb.allDocs.args).to.deep.equal([[]]);
      expect(http.get.args).to.deep.equal([[
        '/api/v1/replication/get-ids',
        { responseType: 'json' },
      ]]);
      expect(remoteDb.bulkGet.callCount).to.equal(0);
      expect(localDb.bulkDocs.callCount).to.equal(0);
    });

    it('should download one batch of missing docs', async () => {
      localDb.allDocs.resolves({
        rows: [
          { id: 'd1', value: { rev: 1 } },
          { id: 'd2', value: { rev: 1 } },
          { id: 'd3', value: { rev: 1 } },
        ]
      });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'd1', rev: 1 },
          { id: 'd2', rev: 1 },
          { id: 'd3', rev: 2 },
          { id: 'd4', rev: 1 },
          { id: 'd5', rev: 1 },
        ]
      }));
      remoteDb.bulkGet.resolves({
        results: [
          { docs: [{ ok: { _id: 'd3', _rev: 2, f: 1 } }] },
          { docs: [{ ok: { _id: 'd4', _rev: 1, f: 1 } }] },
          { docs: [{ ok: { _id: 'd5', _rev: 1, f: 1 } }] },
        ]
      });

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: 3 });

      expect(localDb.allDocs.args).to.deep.equal([[]]);
      expect(http.get.args).to.deep.equal([[
        '/api/v1/replication/get-ids',
        { responseType: 'json' },
      ]]);
      expect(remoteDb.bulkGet.args).to.deep.equal([[{
        docs: [
          { id: 'd3', rev: 2 },
          { id: 'd4', rev: 1 },
          { id: 'd5', rev: 1 },
        ],
        attachments: true,
        revs: true,
      }]]);
      const updatedDocs = [
        { _id: 'd3', _rev: 2, f: 1 },
        { _id: 'd4', _rev: 1, f: 1 },
        { _id: 'd5', _rev: 1, f: 1 },
      ];
      expect(localDb.bulkDocs.args).to.deep.equal([[ updatedDocs, { new_edits: false } ]]);
      expect(rulesEngineService.monitorExternalChanges.args).to.deep.equal([[{ docs: updatedDocs }]]);
    });

    it('should download multiple batches of missing docs', async () => {
      const nbr = 250;
      localDb.allDocs.resolves({
        rows: [
          { id: 'doc1', value: { rev: 1 } },
          { id: 'doc2', value: { rev: 1 } },
          { id: 'doc3', value: { rev: 1 } },
        ]
      });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'doc1', rev: 1 },
          { id: 'doc2', rev: 1 },
          { id: 'doc3', rev: 1 },
          ...Array
            .from({ length: nbr })
            .map((_, idx) => ({ id: `d${idx}`, rev: 1 })),
        ]
      }));
      remoteDb.bulkGet
        .onCall(0).resolves({
          results: Array
            .from({ length: 100 })
            .map((_, idx) => ({ docs: [{ ok: { _id: `d${idx}`, _rev: 1, f: 1 } }] }))
        })
        .onCall(1).resolves({
          results: Array
            .from({ length: 100 })
            .map((_, idx) => ({ docs: [{ ok: { _id: `d${idx + 100}`, _rev: 1, f: 1 } }] }))
        })
        .onCall(2).resolves({
          results: Array
            .from({ length: 50 })
            .map((_, idx) => ({ docs: [{ ok: { _id: `d${idx + 200}`, _rev: 1, f: 1 } }] }))
        });

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: nbr });

      expect(localDb.allDocs.args).to.deep.equal([[]]);
      expect(http.get.args).to.deep.equal([[
        '/api/v1/replication/get-ids',
        { responseType: 'json' },
      ]]);
      expect(remoteDb.bulkGet.args).to.deep.equal([
        [{
          docs: Array
            .from({ length: 100 })
            .map((_, idx) => ({ id: `d${idx}`, rev: 1 })),
          attachments: true,
          revs: true,
        }],
        [{
          docs: Array
            .from({ length: 100 })
            .map((_, idx) => ({ id: `d${idx + 100}`, rev: 1 })),
          attachments: true,
          revs: true,
        }],
        [{
          docs: Array
            .from({ length: 50 })
            .map((_, idx) => ({ id: `d${idx + 200}`, rev: 1 })),
          attachments: true,
          revs: true,
        }]
      ]);

      const docBatches = [
        Array.from({ length: 100 }).map((_, idx) => ({ _id: `d${idx}`, _rev: 1, f: 1 })),
        Array.from({ length: 100 }).map((_, idx) => ({ _id: `d${idx + 100}`, _rev: 1, f: 1 })),
        Array.from({ length: 50 }).map((_, idx) => ({ _id: `d${idx + 200}`, _rev: 1, f: 1 }))
      ];

      expect(localDb.bulkDocs.args).to.deep.equal([
        [ docBatches[0], { new_edits: false } ],
        [ docBatches[1], { new_edits: false } ],
        [ docBatches[2], { new_edits: false } ],
      ]);
      expect(rulesEngineService.monitorExternalChanges.args).to.deep.equal([
        [{ docs: docBatches[0] }],
        [{ docs: docBatches[1] }],
        [{ docs: docBatches[2] }],
      ]);
    });

    it('should purge one batch of deletes', async () => {
      localDb.allDocs.resolves({
        rows: [
          { id: '1', value: { rev: 1 } },
          { id: '2', value: { rev: 1 } },
          { id: '3', value: { rev: 1 } },
          { id: '4', value: { rev: 1 } },
          { id: '5', value: { rev: 1 } },
          { id: '6', value: { rev: 1 } },
        ]
      });
      http.get.returns(of({
        doc_ids_revs: [
          { id: '1', rev: 1 },
          { id: '3', rev: 1 },
          { id: '5', rev: 1 },
        ]
      }));
      http.post.returns(of({ doc_ids: ['2', '6'] }));
      const resp = await service.replicateFrom();

      expect(resp).to.deep.equal( { read_docs: 2 });
      expect(localDb.allDocs.args).to.deep.equal([[], [{ keys: ['2', '6'], include_docs: true }]]);
      expect(http.get.args).to.deep.equal([[
        '/api/v1/replication/get-ids',
        { responseType: 'json' },
      ]]);
      expect(remoteDb.bulkGet.callCount).to.equal(0);
      expect(http.post.args).to.deep.equal([[
        '/api/v1/replication/get-deletes',
        { doc_ids: ['2', '4', '6'] },
        { responseType: 'json' },
      ]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [
          { _id: '2', _rev: 1, _deleted: true, purged: true },
          { _id: '6', _rev: 1, _deleted: true, purged: true },
        ]
      ]]);
    });

    it('should purge multiple batches of deletes', async () => {
      localDb.allDocs.resolves({
        rows: [
          { id: '1', value: { rev: 1 } },
          { id: '2', value: { rev: 1 } },
          { id: '3', value: { rev: 1 } },
          ...Array
            .from({ length: 285 })
            .map((_, idx) => ({ id: `d${idx}`, value: { rev: 1 } })),
        ]
      });
      http.get.returns(of({
        doc_ids_revs: [
          { id: '1', rev: 1 },
          { id: '2', rev: 1 },
          { id: '3', rev: 1 },
        ]
      }));
      http.post.onCall(0).returns(of({
        doc_ids: Array.from({ length: 100 }).map((_, idx) => `d${idx}`),
      }));
      http.post.onCall(1).returns(of({
        doc_ids: Array.from({ length: 100 }).map((_, idx) => `d${idx + 100}`),
      }));
      http.post.onCall(2).returns(of({
        doc_ids: Array.from({ length: 85 }).map((_, idx) => `d${idx + 200}`),
      }));

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: 285 });
      expect(localDb.allDocs.args.slice(1)).to.deep.equal([0, 100, 200].map(start => [{
        keys: Array.from({ length: Math.min(100, 285 - start) }).map((_, idx) => `d${start + idx}`),
        include_docs: true,
      }]));

      expect(http.post.args).to.deep.equal([
        [
          '/api/v1/replication/get-deletes',
          { doc_ids: Array.from({ length: 100 }).map((_, idx) => `d${idx}`) },
          { responseType: 'json' },
        ],
        [
          '/api/v1/replication/get-deletes',
          { doc_ids: Array.from({ length: 100 }).map((_, idx) => `d${idx + 100}`) },
          { responseType: 'json' },
        ],
        [
          '/api/v1/replication/get-deletes',
          { doc_ids: Array.from({ length: 85 }).map((_, idx) => `d${idx + 200}`) },
          { responseType: 'json' },
        ]
      ]);
      expect(localDb.bulkDocs.args).to.deep.equal([
        [
          Array
            .from({ length: 100 })
            .map((_, idx) => ({ _id: `d${idx}`, _rev: 1, _deleted: true, purged: true })),
        ],
        [
          Array
            .from({ length: 100 })
            .map((_, idx) => ({ _id: `d${idx + 100}`, _rev: 1, _deleted: true, purged: true })),
        ],
        [
          Array
            .from({ length: 85 })
            .map((_, idx) => ({ _id: `d${idx + 200}`, _rev: 1, _deleted: true, purged: true }))
        ]
      ]);
    });

    it('should not fetch documents or notify the rules engine when the server returns no deletes', async () => {
      localDb.allDocs.resolves({ rows: [{ id: 'local', value: { rev: '1-local' } }] });
      http.get.returns(of({ doc_ids_revs: [] }));
      http.post.returns(of({ doc_ids: [] }));

      expect(await service.replicateFrom()).to.deep.equal({ read_docs: 0 });
      expect(localDb.allDocs.args).to.deep.equal([[]]);
      expect(localDb.bulkDocs.called).to.equal(false);
      expect(rulesEngineService.monitorPurgedDocs.called).to.equal(false);
    });

    it('should only notify about successful purges and reject partial failures', async () => {
      const removed = { _id: 'removed', type: 'data_record', form: 'follow_up', patient_id: 'patient' };
      const conflict = { _id: 'conflict', type: 'person' };
      localDb.allDocs.withArgs().resolves({ rows: [removed, conflict].map(doc => ({
        id: doc._id, value: { rev: '1-original' },
      })) });
      localDb.allDocs.withArgs({ keys: ['removed', 'conflict'], include_docs: true }).resolves({
        rows: [{ doc: removed }, { doc: conflict }],
      });
      http.get.returns(of({ doc_ids_revs: [] }));
      http.post.returns(of({ doc_ids: ['removed', 'conflict'] }));
      localDb.bulkDocs.resolves([{ id: 'removed', ok: true }, { id: 'conflict', error: true, status: 409 }]);

      await expect(service.replicateFrom()).to.be.rejectedWith('Not all documents purged successfully');

      expect(rulesEngineService.monitorPurgedDocs.args).to.deep.equal([[[removed]]]);
    });

    it('should ignore missing local document bodies when notifying the rules engine', async () => {
      localDb.allDocs.withArgs().resolves({ rows: [{ id: 'missing', value: { rev: '1-old' } }] });
      localDb.allDocs.withArgs({ keys: ['missing'], include_docs: true }).resolves({
        rows: [{ key: 'missing', error: 'not_found' }],
      });
      http.get.returns(of({ doc_ids_revs: [] }));
      http.post.returns(of({ doc_ids: ['missing'] }));

      expect(await service.replicateFrom()).to.deep.equal({ read_docs: 1 });
      expect(rulesEngineService.monitorPurgedDocs.args).to.deep.equal([[[]]]);
    });

    describe('errors', () => {
      it('should not purge when fetching the document context fails', async () => {
        localDb.allDocs.withArgs().resolves({ rows: [{ id: 'report', value: { rev: '1-report' } }] });
        localDb.allDocs.withArgs({ keys: ['report'], include_docs: true }).rejects(new Error('read failed'));
        http.get.returns(of({ doc_ids_revs: [] }));
        http.post.returns(of({ doc_ids: ['report'] }));

        await expect(service.replicateFrom()).to.be.rejectedWith('read failed');

        expect(localDb.bulkDocs.called).to.equal(false);
        expect(rulesEngineService.monitorPurgedDocs.called).to.equal(false);
      });

      it('should throw remote docs errors', async () => {
        http.get.returns(throwError(() => new Error('omg')));
        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('omg');
          expect(localDb.allDocs.callCount).to.equal(0);
          expect(localDb.bulkDocs.callCount).to.equal(0);
          expect(remoteDb.bulkGet.callCount).to.equal(0);
          expect(http.post.callCount).to.equal(0);
        }
      });

      it('should throw local docs errors', async () => {
        http.get.returns(of({
          doc_ids_revs: [
            { id: '1', rev: 1 },
            { id: '2', rev: 1 },
            { id: '3', rev: 1 },
          ]
        }));
        localDb.allDocs.rejects(new Error('alldocsfail'));
        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('alldocsfail');
          expect(localDb.bulkDocs.callCount).to.equal(0);
          expect(remoteDb.bulkGet.callCount).to.equal(0);
          expect(http.post.callCount).to.equal(0);
        }
      });

      it('should throw download docs errors', async () => {
        localDb.allDocs.resolves({
          rows: [
            { id: 'd1', value: { rev: 1 } },
            { id: 'd2', value: { rev: 1 } },
            { id: 'd3', value: { rev: 1 } },
          ]
        });
        http.get.returns(of({
          doc_ids_revs: [
            { id: 'd1', rev: 1 },
            { id: 'd2', rev: 1 },
            { id: 'd3', rev: 2 },
            { id: 'd4', rev: 1 },
            { id: 'd5', rev: 1 },
          ]
        }));
        remoteDb.bulkGet.rejects(new Error('bulkgeterror'));

        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('bulkgeterror');
          expect(localDb.bulkDocs.callCount).to.equal(0);
          expect(http.post.callCount).to.equal(0);
        }
      });

      it('should throw local save errors', async () => {
        localDb.allDocs.resolves({
          rows: [
            { id: 'd1', value: { rev: 1 } },
            { id: 'd2', value: { rev: 1 } },
            { id: 'd3', value: { rev: 1 } },
          ]
        });
        http.get.returns(of({
          doc_ids_revs: [
            { id: 'd1', rev: 1 },
            { id: 'd2', rev: 1 },
            { id: 'd3', rev: 2 },
            { id: 'd4', rev: 1 },
            { id: 'd5', rev: 1 },
          ]
        }));
        remoteDb.bulkGet.resolves({
          results: [
            { docs: [{ ok: { _id: 'd3', _rev: 2, f: 1 } }] },
            { docs: [{ ok: { _id: 'd4', _rev: 1, f: 1 } }] },
            { docs: [{ ok: { _id: 'd5', _rev: 1, f: 1 } }] },
          ]
        });
        localDb.bulkDocs.rejects(new Error('bulkdocserr'));
        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('bulkdocserr');
          expect(http.post.callCount).to.equal(0);
        }
      });

      it('should throw download deletes errors', async () => {
        localDb.allDocs.resolves({
          rows: [
            { id: '1', value: { rev: 1 } },
            { id: '2', value: { rev: 1 } },
            { id: '3', value: { rev: 1 } },
            { id: '4', value: { rev: 1 } },
            { id: '5', value: { rev: 1 } },
            { id: '6', value: { rev: 1 } },
          ]
        });
        http.get.returns(of({
          doc_ids_revs: [
            { id: '1', rev: 1 },
            { id: '3', rev: 1 },
            { id: '5', rev: 1 },
          ]
        }));
        http.post.returns(throwError(() => new Error('getdeleteserror')));
        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('getdeleteserror');
          expect(localDb.bulkDocs.callCount).to.equal(0);
        }
      });

      it('should throw save deletes errors', async () => {
        localDb.allDocs.resolves({
          rows: [
            { id: '1', value: { rev: 1 } },
            { id: '2', value: { rev: 1 } },
            { id: '3', value: { rev: 1 } },
            { id: '4', value: { rev: 1 } },
            { id: '5', value: { rev: 1 } },
            { id: '6', value: { rev: 1 } },
          ]
        });
        http.get.returns(of({
          doc_ids_revs: [
            { id: '1', rev: 1 },
            { id: '3', rev: 1 },
            { id: '5', rev: 1 },
          ]
        }));
        http.post.returns(of({ doc_ids: ['2', '6'] }));
        localDb.bulkDocs.rejects(new Error('bulkdocserror2'));

        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('bulkdocserror2');
          expect(rulesEngineService.monitorPurgedDocs.called).to.equal(false);
        }
      });
    });
  });
});
