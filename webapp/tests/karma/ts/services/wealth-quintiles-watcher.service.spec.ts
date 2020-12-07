import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { WealthQuintilesWatcherService } from '@mm-services/wealth-quintiles-watcher.service';
import { ChangesService } from '@mm-services/changes.service';
import { DbService } from '@mm-services/db.service';

describe('WealthQuintilesWatcherService', () => {
  let service: WealthQuintilesWatcherService;
  let dbService;
  let changesService;
  let changesFilter;
  let changesCallback;
  let dbInstance;

  beforeEach(() => {
    dbInstance = {
      get: sinon.stub(),
      query: sinon.stub(),
      bulkDocs: sinon.stub()
    };
    dbService = {
      get: () => dbInstance
    };
    changesService = {
      subscribe: sinon
        .stub()
        .callsFake((opts) => {
          changesCallback = opts.callback;
          changesFilter = opts.filter;
          return { unsubscribe: sinon.stub() };
        })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChangesService, useValue: changesService },
        { provide: DbService, useValue: dbService }
      ]
    });
    service = TestBed.inject(WealthQuintilesWatcherService);
  });

  it('should be created', () => {
    expect(service).to.exist;
  });

  it('should start watching changes', () => {
    service.start();

    expect(changesService.subscribe.callCount).to.equal(1);
    expect(changesService.subscribe.args[0][0].key).to.equal('wealth-quintiles');
    expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
    expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
  });

  it('should filter relevant changes', () => {
    const irrelevantNoField = { doc: { fields: { field: '123' } } };
    const irrelevantIncompleteDoc = { doc: { } };
    const relevantChange = { doc: { fields: { NationalQuintile: '10' } } };

    service.start();

    expect(changesFilter(irrelevantNoField)).to.equal(false);
    expect(changesFilter(irrelevantIncompleteDoc)).to.equal(false);
    expect(changesFilter(relevantChange)).to.equal(true);
  });

  it('should update docs if new national quintile is different from the docs', fakeAsync(() => {
    const docs = {
      rows: [
        {
          doc: {
            _id: '1',
            place_id: '123',
            wealth_quintile_national: 50,
            wealth_quintile_urban: 50
          }
        },
        {
          doc: { // without quintiles
            _id: '2',
            place_id: '123'
          }
        }
      ]
    };
    const quintileChange = { doc: { fields: {
      place_id: '123',
      NationalQuintile: 90,
      UrbanQuintile: 50,
    } } };
    dbInstance.query.resolves(docs);

    service.start();

    changesCallback(quintileChange);
    tick();

    expect(dbInstance.query.callCount).to.equal(1);
    expect(dbInstance.query.args[0][0]).to.equal('medic-client/contacts_by_parent');
    expect(dbInstance.query.args[0][1]).to.deep.equal({
      startkey: [ '123' ],
      endkey: [ '123', {} ],
      include_docs: true
    });
    expect(dbInstance.bulkDocs.callCount).to.equal(1);
    expect(dbInstance.bulkDocs.args[0][0]).to.have.deep.members([
      {
        _id: '1',
        place_id: '123',
        wealth_quintile_national: 90,
        wealth_quintile_urban: 50
      },
      {
        _id: '2',
        place_id: '123',
        wealth_quintile_national: 90,
        wealth_quintile_urban: 50
      }
    ]);
  }));

  it('should update docs if new urban quintile is different from the docs', fakeAsync(() => {
    const docs = {
      rows: [
        {
          doc: {
            _id: '1',
            place_id: '123',
            wealth_quintile_national: 50,
            wealth_quintile_urban: 50
          }
        },
        {
          doc: { // without quintiles
            _id: '2',
            place_id: '123'
          }
        }
      ]
    };
    const quintileChange = { doc: { fields: {
      place_id: '123',
      NationalQuintile: 50,
      UrbanQuintile: 70,
    } } };
    dbInstance.query.resolves(docs);

    service.start();

    changesCallback(quintileChange);
    tick();

    expect(dbInstance.query.callCount).to.equal(1);
    expect(dbInstance.query.args[0][0]).to.equal('medic-client/contacts_by_parent');
    expect(dbInstance.query.args[0][1]).to.deep.equal({
      startkey: [ '123' ],
      endkey: [ '123', {} ],
      include_docs: true
    });
    expect(dbInstance.bulkDocs.callCount).to.equal(1);
    expect(dbInstance.bulkDocs.args[0][0]).to.have.deep.members([
      {
        _id: '1',
        place_id: '123',
        wealth_quintile_national: 50,
        wealth_quintile_urban: 70
      },
      {
        _id: '2',
        place_id: '123',
        wealth_quintile_national: 50,
        wealth_quintile_urban: 70
      }
    ]);
  }));

  it('should not update docs if quintiles are the same from the docs', fakeAsync(() => {
    const docs = {
      rows: [
        {
          doc: {
            _id: '1',
            place_id: '123',
            wealth_quintile_national: 50,
            wealth_quintile_urban: 50
          }
        },
        {
          doc: {
            _id: '2',
            place_id: '123',
            wealth_quintile_national: 50,
            wealth_quintile_urban: 50
          }
        }
      ]
    };
    const quintileChange = { doc: { fields: {
      place_id: '123',
      NationalQuintile: 50,
      UrbanQuintile: 50,
    } } };
    dbInstance.query.resolves(docs);

    service.start();

    changesCallback(quintileChange);
    tick();

    expect(dbInstance.query.callCount).to.equal(1);
    expect(dbInstance.query.args[0][0]).to.equal('medic-client/contacts_by_parent');
    expect(dbInstance.query.args[0][1]).to.deep.equal({
      startkey: [ '123' ],
      endkey: [ '123', {} ],
      include_docs: true
    });
    expect(dbInstance.bulkDocs.callCount).to.equal(1);
    expect(dbInstance.bulkDocs.args[0][0]).to.have.length(0);
  }));
});
