var utils = require('./utils');

describe('drop-audit-doc-index migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('should change id to match doc id and remove unnecessary fields', function() {

    // given
    return utils.initDb({ audit: [
      { // expected 1
        _id: 'a',
        record_id: 'x',
        type: 'audit_record',
        history: [{
          action: 'create',
          user: 'jim',
          timestamp: '2016-05-24T04:20:42.052Z',
          doc: {
            _id: 'x',
            _rev: '4',
            external_id: 53
          }
        }]
      },
      { // expected 2
        _id: 'b',
        record_id: 'y',
        type: 'audit_record',
        history: [{
          action: 'create',
          user: 'jack',
          timestamp: '2015-05-24T04:20:42.052Z',
          doc: {
            _id: 'y',
            _rev: '4',
            external_id: 1
          }
        }]
      },
      { // duplicate
        _id: 'c',
        record_id: 'dupe',
        type: 'audit_record',
        history: [{
          action: 'create',
          user: 'jack',
          timestamp: '2015-05-24T04:20:42.052Z',
          doc: {
            _id: 'dupe',
            _rev: '4',
            external_id: 1
          }
        }]
      },
      { // duplicate #2
        _id: 'd',
        record_id: 'dupe',
        type: 'audit_record',
        history: [{
          action: 'update',
          user: 'jack',
          timestamp: '2016-05-24T04:20:42.052Z',
          doc: {
            _id: 'dupe',
            _rev: '4',
            external_id: 2
          }
        }]
      },
      { // duplicate #3 from a previous batch
        _id: 'dupe-audit',
        type: 'audit_record',
        history: [{
          action: 'create',
          user: 'jack',
          timestamp: '2014-05-24T04:20:42.052Z',
          doc: {
            _id: 'dupe',
            _rev: '4',
            external_id: 3
          }
        }]
      },
      { // design doc
        _id: '_design/medic',
        views: [ { audit_records_by_doc: { map: 'something' } } ]
      }
    ]})
    .then(function() {

      // when
      return utils.runMigration('drop-audit-doc-index');

    })
    .then(function() {

      // expect
      return utils.assertDb({ audit: [
        {
          _id: '_design/medic'
        },
        {
          _id: 'x-audit',
          type: 'audit_record',
          history: [{
            action: 'create',
            user: 'jim',
            timestamp: '2016-05-24T04:20:42.052Z',
            doc: {
              _id: 'x',
              _rev: '4',
              external_id: 53
            }
          }]
        },
        {
          _id: 'y-audit',
          type: 'audit_record',
          history: [{
            action: 'create',
            user: 'jack',
            timestamp: '2015-05-24T04:20:42.052Z',
            doc: {
              _id: 'y',
              _rev: '4',
              external_id: 1
            }
          }]
        },
        { // duplicates merged
          _id: 'dupe-audit',
          type: 'audit_record',
          history: [{
            action: 'create',
            user: 'jack',
            timestamp: '2014-05-24T04:20:42.052Z',
            doc: {
              _id: 'dupe',
              _rev: '4',
              external_id: 3
            }
          }, {
            action: 'create',
            user: 'jack',
            timestamp: '2015-05-24T04:20:42.052Z',
            doc: {
              _id: 'dupe',
              _rev: '4',
              external_id: 1
            }
          }, {
            action: 'update',
            user: 'jack',
            timestamp: '2016-05-24T04:20:42.052Z',
            doc: {
              _id: 'dupe',
              _rev: '4',
              external_id: 2
            }
          }]
        }
      ]});

    });
  });

});
