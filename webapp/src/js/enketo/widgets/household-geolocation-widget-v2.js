/* global globalThis */
'use strict';
const Widget = require('enketo-core/src/js/widget').default;
const $ = require('jquery');
require('enketo-core/src/js/plugins');

const TRANSLATION_KEYS = {
  // Shared
  PROGRESS: 'geolocation.progress',
  RESULT_LABEL: 'geolocation.result.label',
  FAILURE: 'geolocation.failure',
  SIGNAL_WEAK: 'geolocation.signal.weak',
  RETRY: 'geolocation.retry',
  SUCCESS: 'geolocation.success',
  PERMISSION_DENIED: 'geolocation.permission.denied',
  UNAVAILABLE: 'geolocation.unavailable',
  // Create flow
  CANT_RECORD: 'geolocation.cant.record',
  AT_HOUSEHOLD: 'geolocation.at.household',
  SOMEWHERE_ELSE: 'geolocation.somewhere.else',
  NO_LOCATION_RECORDED: 'geolocation.no.location.recorded',
  // Edit flow
  EDIT_BADGE: 'geolocation.edit.badge',
  EDIT_CONTEXT_HOME: 'geolocation.edit.context.home',
  EDIT_CONTEXT_OTHER: 'geolocation.edit.context.other',
  EDIT_KEEP: 'geolocation.edit.keep.saved',
  EDIT_RECORD_NEW: 'geolocation.edit.record.new',
  EDIT_REMOVE: 'geolocation.edit.remove',
};

const WEAK_SIGNAL_CODES = new Set([2, 3, -2]);

class HouseholdGeolocationWidget extends Widget {
  static get selector() {
    return '.or-appearance-geolocation-capture input';
  }

  _init() {
    // Implementation added in phases 2–4.
  }
}

module.exports = HouseholdGeolocationWidget;
