/* globals XSLTProcessor */
angular.module('inboxServices').service('XSLT',
  function(
    $http,
    $q,
    Location
  ) {

    'use strict';
    'ngInject';

    var staticRoot = Location.path + '/xslt/';
    var processors = {};
    var xmlSerializer = new XMLSerializer();

    var getProcessor = function(name) {
      if (processors[name]) {
        return $q.resolve(processors[name]);
      }
      return $http
        .get(staticRoot + name, { responseType: 'document' })
        .then(function(response) {
          var processor = new XSLTProcessor();
          processor.importStylesheet(response.data);
          processors[name] = processor;
          return processor;
        });
    };

    return {
      transform: function(name, doc) {
        return getProcessor(name).then(function(processor) {
          var transformedDoc = processor.transformToDocument(doc);
          var rootElement = transformedDoc.documentElement.firstElementChild;
          return xmlSerializer.serializeToString(rootElement);
        });
      }
    };
  }
);
