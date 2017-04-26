var _ = require('underscore'),
    assert = require('chai').assert,
    request = require('request'),
    urlLib = require('url'),
    utils = require('../utils');

var DB_NAME = require('../../../db').settings.db,
    adminDb = utils.adminDb;

var adminUrl = utils.API_URL;
function userUrl(name) {
  var url = urlLib.parse(adminUrl);
  url.auth = name + ':secret';
  return url;
}

function assertChangeIds(changes) {
  var DEFAULT_EXPECTED = ['appcache',
    'resources',
    '_design/medic-client'];

  changes = changes.results;

  // * filter out deleted entries - we never delete in our production code, but
  // some docs are deleted in the test setup/teardown
  //  * also filter out translation documents and other expected documents
  changes = _.reject(changes, function(change) {
    return change.deleted ||
           change.id.startsWith('messages-') ||
           DEFAULT_EXPECTED.indexOf(change.id) !== -1;
  });

  var expectedIds = Array.prototype.slice.call(arguments, 1);
  assert.deepEqual(_.pluck(changes, 'id').sort(), expectedIds.sort());
}

function requestChanges(username, ids, last_seq) {
  return new Promise(function(resolve, reject) {
    var qs = {
      since: last_seq || 0,
    };
    if(ids) {
      qs = {
        filter: '_doc_ids',
        doc_ids: JSON.stringify(ids),
      };
    }

    var url = userUrl(username);
    url.pathname = '/' + DB_NAME + '/_changes';
    url = urlLib.format(url);
    request({ uri:url, qs:qs, },
    function(err, res, body) {
      if(err) {
        return reject(err);
      }
      if(res.statusCode !== 200) {
        return reject(body);
      }
      return resolve(JSON.parse(body));
    });
  });
}

var AppSettings = {

  get: function() {
    return adminDb.get('_design/medic')
      .then(function(ddoc) {
        AppSettings.original = ddoc.app_settings;
        return JSON.parse(JSON.stringify(ddoc.app_settings));
      });
  },

  set: function(newAppSettings) {
    AppSettings.modified = true;

    return adminDb.get('_design/medic')
      .then(function(ddoc) {
        ddoc.app_settings = newAppSettings;
        return adminDb.put(ddoc);
      });
  },

  restore: function() {
    if(AppSettings.modified) {
      return adminDb.get('_design/medic')
        .then(function(ddoc) {
          ddoc.app_settings = AppSettings.original;
          return adminDb.put(ddoc);
        });
    } else {
      return Promise.resolve();
    }
  }

};

describe('changes handler', function() {

  beforeEach(function(done) {
    AppSettings.modified = false;
    delete AppSettings.original;

    utils.cleanDb()
      .then(function() {
        done();
      })
      .catch(done);
  });

  afterEach(function(done) {
    AppSettings.restore()
      .then(function() {
        done();
      })
      .catch(done);
  });

  it('should filter the changes to relevant ones', function() {
    // given
    // a normal user (bob, from fixtures)

    // and an irrelevant doc is inserted
    return adminDb.post({ type:'clinic', parent:{ _id:'nowhere' } })
      .then(function() {

        // and a relevant doc is inserted
        return adminDb.put({ type:'clinic', _id:'very-relevant', parent:{ _id:'fixture:bobville' } });

      })
      .then(function() {

        // and another irrelevant doc is inserted
        return adminDb.post({ type:'clinic', parent:{ _id:'irrelevant-place' } });

      })
      .then(function() {

        // when
        // full changes feed is requested
        return requestChanges('bob');

      })
      .then(function(changes) {

        // then
        // only change listed is for the relevant doc
        return assertChangeIds(changes,
            'org.couchdb.user:bob',
            'fixture:bobville',
            'very-relevant');
      });
  });

  describe('reports with no associated contact', function() {

    describe('for a user with can_view_unallocated_data_records permission', function() {

      it('should be visible if district_admins_access_unallocated_messages is enabled', function() {
        // given
        // a user with can_view_unallocated_data_records: bob (created in fixtures)

        // and district_admins_access_unallocated_messages is enabled
        return AppSettings.get()
          .then(function(appSettings) {

            appSettings.district_admins_access_unallocated_messages = true;
            return AppSettings.set(appSettings);

          })
          .then(function() {

            // and an unassigned data_record
            return adminDb.post({ _id:'unallocated_report', type:'data_record' });

          })
          .then(function() {

            // when
            // the changes feed is requested
            return requestChanges('bob');

          })
          .then(function(changes) {

            // then
            // it should contain the unassigned data_record
            return assertChangeIds(changes,
              'org.couchdb.user:bob',
              'fixture:bobville',
              'unallocated_report');

          });

        });

      });

      it('should not be visible if district_admins_access_unallocated_messages is disabled', function() {
        // given
        // a user with can_view_unallocated_data_records: bob (created in fixtures)

        // and district_admins_access_unallocated_messages is not enabled

        // and an unassigned data_record
        return adminDb.post({ _id:'unallocated_report', type:'data_record' })
          .then(function() {

            // when
            // the changes feed is requested
            return requestChanges('bob');

          })
          .then(function(changes) {

            // then
            // it should contain the unassigned data_record
            return assertChangeIds(changes,
              'org.couchdb.user:bob',
              'fixture:bobville');

          });
      });

    it('should NOT be supplied for a user without can_view_unallocated_data_records permission', function() {
      // given
      // a user without can_view_unallocated_data_records: clare (created in fixtures)

      // and an unassigned data_record
      return adminDb.post({ _id:'unallocated_report', type:'data_record' })
        .then(function() {

          // when
          // the changes feed is requested
          return requestChanges('clare');

        })
        .then(function(changes) {

          // then
          // it should contain the unassigned data_record
          return assertChangeIds(changes,
            'org.couchdb.user:clare',
            'fixture:clareville');

        });
    });

  });

  describe('replication depth', function() {

    it('should show contacts to a user only if they are within the configured depth', function() {
      // given
      // replication depth is configured
      return AppSettings.get()
        .then(function(appSettings) {
          appSettings.replication_depth = [
            { role:'district_admin', depth:1 },
          ];
          return AppSettings.set(appSettings);

        })
        .then(function() {

          // and a contact exists within the replication depth
          return adminDb.put({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } });

        })
        .then(function() {

          // and a contact exists outside the replication depth
          return adminDb.put({ _id:'should-be-hidden', reported_date: 1, type:'person', parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } } });

        })
        .then(function() {

          // when
          // changes feed is requested
          return requestChanges('chw');

        })
        .then(function(changes) {

          // then
          // changes feed only contains the contact within the configured depth
          return assertChangeIds(changes,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'should-be-visible');

        });
    });

    it('should correspond to the largest number for any role the user has', function() {
      // given
      // replication depth is configured differently for two roles that the same
      // user has
      return AppSettings.get()
        .then(function(appSettings) {
          appSettings.replication_depth = [
            { role:'district_admin', depth:1 },
            { role:'district-manager', depth:2 },
          ];
          return AppSettings.set(appSettings);

        })
        .then(function() {

          // and a contact exists within the replication depth
          return adminDb.put({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } });

        })
        .then(function() {

          // and a contact exists outside the replication depth
          return adminDb.put({ _id:'should-be-visible-too', reported_date: 1, type:'person', parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } } });

        })
        .then(function() {

          // when
          // changes feed is requested
          return requestChanges('chw');

        })
        .then(function(changes) {

          // then
          // changes feed contains both contacts
          return assertChangeIds(changes,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'should-be-visible',
              'should-be-visible-too');

        });
    });

    it('should have no effect if not configured', function() {
      // given
      // replication depth is not configured
      Promise.resolve()
        .then(function() {

          // and a contact exists within replication depth 1
          return adminDb.put({ _id:'should-be-visible', type:'clinic', parent: { _id:'fixture:chwville' } });

        })
        .then(function() {

          // and a contact exists within replication depth 2
          return adminDb.put({ _id:'should-also-be-visible', reported_date: 1, type:'person', parent: { _id:'should-be-visible', parent:{ _id:'fixture:chwville' } } });

        })
        .then(function() {

          // when
          // the changes feed is requested
          return requestChanges('chw');

        })
        .then(function(changes) {

          // then
          // the changes feed contains both the shallow and the deep contacts
          return assertChangeIds(changes,
              'org.couchdb.user:chw',
              'fixture:user:chw',
              'fixture:chwville',
              'should-be-visible',
              'should-also-be-visible');

        });
    });

  });

  it('should not return reports about your place by someone above you in the hierarchy', function() {
    // given
    // a chw user exists (created in fixtures)

    // and a boss user exists (created in fixtures)

    // and the CHW submits a report for his area
    return adminDb.put({ type:'data_record', _id:'chw-report', place_id:'fixture:chwville', contact:{ _id:'fixture:user:chw' }, form:'some-form' })
      .then(function() {

        // and the boss submits a report, also for the CHW's area
        return adminDb.put({ type:'data_record', _id:'chw-boss-report', place_id:'fixture:chwville', contact:{ _id:'fixture:user:chw-boss' }, form:'some-form' });

      })
      .then(function() {

        // when
        // the changes feed is requested by the CHW
        return requestChanges('chw');

      })
      .then(function(changes) {

        // then
        // the changes feed only includes the report from the CHW
        return assertChangeIds(changes,
            'org.couchdb.user:chw',
            'fixture:chwville',
            'fixture:user:chw',
            'chw-report');

      });
  });

  it('should update the feed when the doc is updated', function() {
    var seq_number;

    return Promise.resolve()
      .then(function() {

        // given
        // a doc is created
        return adminDb.put({ _id:'visible', type:'clinic', parent: { _id:'fixture:chwville' } });

      })
      .then(function() {

        // and the doc has already been seen in the changes feed
        return requestChanges('chw');

      })
      .then(function(changes) {
        seq_number = changes.last_seq;

      })
      .then(function() {

        // and subsequently the doc is updated
        return adminDb.get('visible');
      })
      .then(function(doc) {
        doc.udpated = true;
        return adminDb.put(doc);

      })
      .then(function() {

        // when
        // the changes feed is requested since the previously-seen seq_number
        return requestChanges('chw', null, seq_number);

      })
      .then(function(changes) {

        // then
        // the modified doc is included in the changes feed
        return assertChangeIds(changes, 'visible');
      });
  });

});
