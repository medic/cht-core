/**
 * Filter version of TranslateFrom service.
 *
 * Example of use :
 * // In controller :
 * $scope.task = {
 *	intructionsLabel: [ { locale: 'en', content: 'Go visit {{task.patient.name}}' }],
 *	patient: { name: 'Estelle'}
 * };
 *
 * // In template : (yields 'Go visit Estelle')
 * {{task.intructionsLabel | translateFrom:task}}
 */
(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('translateFrom', ['TranslateFrom',
    function(TranslateFrom) {
      return TranslateFrom;
    }
  ]);

}());
