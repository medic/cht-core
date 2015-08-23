var path = require('path'),
    db = require('../db');

var DEFAULT_PERMISSIONS = [
  {
    name: 'can_export_messages',
    roles: [
      'national_admin',
      'district_admin',
      'analytics'
    ]
  },
  {
    name: 'can_export_forms',
    roles: [
      'national_admin',
      'district_admin',
      'analytics'
    ]
  },
  {
    name: 'can_export_contacts',
    roles: [
      'national_admin',
      'district_admin'
    ]
  },
  {
    name: 'can_export_audit',
    roles: [
      'national_admin'
    ]
  },
  {
    name: 'can_export_feedback',
    roles: [
      'national_admin'
    ]
  },
  {
    name: 'can_export_server_logs',
    roles: [
      'national_admin'
    ]
  },
  {
    name: 'can_access_directly',
    roles: [
      'national_admin'
    ]
  },
  {
    name: 'can_view_analytics',
    roles: [
      'national_admin',
      'district_admin',
      'analytics'
    ]
  },
  {
    name: 'can_view_data_records',
    roles: [
      'national_admin',
      'district_admin',
      'analytics',
      'gateway'
    ]
  },
  {
    name: 'can_view_unallocated_data_records',
    roles: [
      'national_admin',
      'district_admin',
      'gateway'
    ]
  },
  {
    name: 'can_edit',
    roles: [
      'national_admin',
      'district_admin',
      'gateway'
    ]
  },
  {
    name: 'can_update_messages',
    roles: [
      'national_admin',
      'district_admin',
      'gateway'
    ]
  },
  {
    name: 'can_create_records',
    roles: [
      'national_admin',
      'district_admin',
      'date_entry',
      'gateway'
    ]
  },
  {
    name: 'can_view_tasks',
    roles: [
      'national_admin'
    ]
  },
  {
    name: 'can_configure',
    roles: [
      'national_admin'
    ]
  },
  {
    name: 'can_view_messages',
    roles: [
      'national_admin',
      'district_admin'
    ]
  },
  {
    name: 'can_view_reports',
    roles: [
      'national_admin',
      'district_admin'
    ]
  },
  {
    name: 'can_view_analytics',
    roles: [
      'national_admin',
      'district_admin'
    ]
  },
  {
    name: 'can_view_contacts',
    roles: [
      'national_admin',
      'district_admin'
    ]
  }
];

module.exports = {
  name: 'add-permissions-configuration',
  created: new Date(2015, 8, 11, 10, 0, 0, 0),
  run: function(callback) {
    db.getSettings(function(err, data) {
      if (err) {
        return callback(err);
      }
      var settings = data.settings;
      if (settings.permissions && settings.permissions.length) {
        // permissions already defined - don't overwrite
        return callback();
      }
      var opts = {
        path: path.join(db.getPath(), 'update_settings', db.settings.ddoc),
        method: 'put',
        body: { permissions: DEFAULT_PERMISSIONS }
      };
      db.request(opts, callback);
    });
  }
};