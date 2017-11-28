var renderDateModule = require('./../modules/render-date');

/**
 * Is responsible for making code for rendering date available
 * as Angular service to share between directive and filters.
 */
angular.module('inboxServices').factory('RenderDate',
  function() {
    'use strict';

    return renderDateModule;
});
