import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { HttpClient } from '@angular/common/http';

import { ReplicationService } from '@mm-services/replication.service';
import { DbService } from '@mm-services/db.service';
import { of, throwError } from 'rxjs';


describe('ContactTypes service', () => {
  let service:ReplicationService;
  let localDb;
  let remoteDb;
  let dbService;
  let http;

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
    };

    dbService = sinon.stub();
    dbService.withArgs().returns(localDb);
    dbService.withArgs({ remote: true }).returns(remoteDb);

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: dbService } },
        { provide: HttpClient, useValue: http },
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
      }]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [
          { _id: 'd3', _rev: 2, f: 1 },
          { _id: 'd4', _rev: 1, f: 1 },
          { _id: 'd5', _rev: 1, f: 1 },
        ],
        { new_edits: false },
      ]]);
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
        }],
        [{
          docs: Array
            .from({ length: 100 })
            .map((_, idx) => ({ id: `d${idx + 100}`, rev: 1 })),
          attachments: true,
        }],
        [{
          docs: Array
            .from({ length: 50 })
            .map((_, idx) => ({ id: `d${idx + 200}`, rev: 1 })),
          attachments: true,
        }]
      ]);

      expect(localDb.bulkDocs.args).to.deep.equal([
        [
          Array
            .from({ length: 100 })
            .map((_, idx) => ({ _id: `d${idx}`, _rev: 1, f: 1 })),
          { new_edits: false },
        ],
        [
          Array
            .from({ length: 100 })
            .map((_, idx) => ({ _id: `d${idx + 100}`, _rev: 1, f: 1 })),
          { new_edits: false },
        ],
        [
          Array
            .from({ length: 50 })
            .map((_, idx) => ({ _id: `d${idx + 200}`, _rev: 1, f: 1 })),
          { new_edits: false },
        ]
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
  });
});
