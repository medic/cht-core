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
angular.module('filters').filter('translateFrom',
  function(TranslateFrom) {
    'use strict';
    'ngInject';
    return TranslateFrom;
  });
