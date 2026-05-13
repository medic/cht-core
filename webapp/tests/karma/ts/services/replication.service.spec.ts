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
      bulkDocs: sinon.stub(),
    };
    remoteDb = {
      bulkGet: sinon.stub(),
      get: sinon.stub(),
    };
    rulesEngineService = { monitorExternalChanges: sinon.stub() };

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
      expect(localDb.allDocs.args).to.deep.equal([[]]);
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

    describe('errors', () => {
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
        }
      });
    });

    describe('form doc download errors', () => {
      it('should throw when form doc download fails', async () => {
        localDb.allDocs.resolves({
          rows: [
            { id: 'd1', value: { rev: 1 } },
          ]
        });
        http.get.returns(of({
          doc_ids_revs: [
            { id: 'd1', rev: 1 },
            { id: 'form:myform', rev: 1 },
          ]
        }));
        remoteDb.get.rejects(new Error('form_download_failed'));
        try {
          await service.replicateFrom();
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err.message).to.equal('form_download_failed');
          expect(remoteDb.bulkGet.callCount).to.equal(0);
        }
      });
    });
  });

  describe('form docs download separately', () => {
    it('should download form docs individually, not via bulkGet', async () => {
      localDb.allDocs.resolves({ rows: [] });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'form:contact:clinic', rev: '1-abc' },
          { id: 'form:training:onboard', rev: '2-def' },
        ]
      }));
      remoteDb.get
        .onCall(0).resolves({ _id: 'form:contact:clinic', _rev: '1-abc', type: 'form' })
        .onCall(1).resolves({ _id: 'form:training:onboard', _rev: '2-def', type: 'form' });
      localDb.bulkDocs.resolves();

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: 2 });

      expect(remoteDb.bulkGet.callCount).to.equal(0);

      expect(remoteDb.get.callCount).to.equal(2);
      expect(remoteDb.get.args[0]).to.deep.equal(['form:contact:clinic', { attachments: true, rev: '1-abc', revs: true }]);
      expect(remoteDb.get.args[1]).to.deep.equal(['form:training:onboard', { attachments: true, rev: '2-def', revs: true }]);

      expect(localDb.bulkDocs.callCount).to.equal(2);
      expect(localDb.bulkDocs.args[0]).to.deep.equal([
        [{ _id: 'form:contact:clinic', _rev: '1-abc', type: 'form' }],
        { new_edits: false }
      ]);
      expect(localDb.bulkDocs.args[1]).to.deep.equal([
        [{ _id: 'form:training:onboard', _rev: '2-def', type: 'form' }],
        { new_edits: false }
      ]);

      expect(rulesEngineService.monitorExternalChanges.callCount).to.equal(2);
      expect(rulesEngineService.monitorExternalChanges.args[0]).to.deep.equal([
        { docs: [{ _id: 'form:contact:clinic', _rev: '1-abc', type: 'form' }] }
      ]);
      expect(rulesEngineService.monitorExternalChanges.args[1]).to.deep.equal([
        { docs: [{ _id: 'form:training:onboard', _rev: '2-def', type: 'form' }] }
      ]);
    });

    it('should split mixed form and non-form docs correctly', async () => {
      localDb.allDocs.resolves({ rows: [] });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'report1', rev: '1-a' },
          { id: 'form:pregnancy', rev: '1-b' },
          { id: 'contact:person1', rev: '1-c' },
          { id: 'form:delivery', rev: '1-d' },
        ]
      }));

      remoteDb.bulkGet.resolves({
        results: [
          { docs: [{ ok: { _id: 'report1', _rev: '1-a' } }] },
          { docs: [{ ok: { _id: 'contact:person1', _rev: '1-c' } }] },
        ]
      });
      remoteDb.get
        .onCall(0).resolves({ _id: 'form:pregnancy', _rev: '1-b', type: 'form' })
        .onCall(1).resolves({ _id: 'form:delivery', _rev: '1-d', type: 'form' });
      localDb.bulkDocs.resolves();

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: 4 });

      expect(remoteDb.bulkGet.callCount).to.equal(1);
      expect(remoteDb.bulkGet.args[0]).to.deep.equal([{
        docs: [
          { id: 'report1', rev: '1-a' },
          { id: 'contact:person1', rev: '1-c' },
        ],
        attachments: true,
        revs: true,
      }]);

      expect(remoteDb.get.callCount).to.equal(2);
      expect(remoteDb.get.args[0]).to.deep.equal(['form:pregnancy', { attachments: true, rev: '1-b', revs: true }]);
      expect(remoteDb.get.args[1]).to.deep.equal(['form:delivery', { attachments: true, rev: '1-d', revs: true }]);

      expect(localDb.bulkDocs.callCount).to.equal(3);
    });

    it('should not call remoteDb.get when there are no form docs', async () => {
      localDb.allDocs.resolves({ rows: [] });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'report1', rev: '1-a' },
          { id: 'contact:person1', rev: '1-b' },
        ]
      }));
      remoteDb.bulkGet.resolves({
        results: [
          { docs: [{ ok: { _id: 'report1', _rev: '1-a' } }] },
          { docs: [{ ok: { _id: 'contact:person1', _rev: '1-b' } }] },
        ]
      });
      localDb.bulkDocs.resolves();

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: 2 });

      expect(remoteDb.bulkGet.callCount).to.equal(1);
      expect(remoteDb.get.callCount).to.equal(0);
    });

    it('should not call bulkGet when there are only form docs', async () => {
      localDb.allDocs.resolves({ rows: [] });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'form:assessment', rev: '3-xyz' },
        ]
      }));
      remoteDb.get.resolves({ _id: 'form:assessment', _rev: '3-xyz', type: 'form' });
      localDb.bulkDocs.resolves();

      const resp = await service.replicateFrom();
      expect(resp).to.deep.equal({ read_docs: 1 });

      expect(remoteDb.bulkGet.callCount).to.equal(0);
      expect(remoteDb.get.callCount).to.equal(1);
      expect(remoteDb.get.args[0]).to.deep.equal(['form:assessment', { attachments: true, rev: '3-xyz', revs: true }]);
    });

    it('should propagate error when a single form doc fetch fails', async () => {
      localDb.allDocs.resolves({ rows: [] });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'report1', rev: '1-a' },
          { id: 'form:broken', rev: '1-b' },
        ]
      }));
      remoteDb.bulkGet.resolves({
        results: [
          { docs: [{ ok: { _id: 'report1', _rev: '1-a' } }] },
        ]
      });
      localDb.bulkDocs.resolves();
      remoteDb.get.rejects(new Error('form_fetch_error'));

      try {
        await service.replicateFrom();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('form_fetch_error');
      }
    });

    it('should propagate error when saving form doc locally fails', async () => {
      localDb.allDocs.resolves({ rows: [] });
      http.get.returns(of({
        doc_ids_revs: [
          { id: 'form:test', rev: '1-a' },
        ]
      }));
      remoteDb.get.resolves({ _id: 'form:test', _rev: '1-a', type: 'form' });
      localDb.bulkDocs.rejects(new Error('local_save_failed'));

      try {
        await service.replicateFrom();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err.message).to.equal('local_save_failed');
      }
    });
  });
});
