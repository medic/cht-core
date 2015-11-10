/* globals XSLTProcessor */
angular.module('inboxServices').service('XSLT', [
  '$http', '$q', 'BaseUrlService',
  function($http, $q, BaseUrlService) {

    var staticRoot = BaseUrlService() + '/static/dist/xslt/';
    var processors = {};
    var xmlSerializer = new XMLSerializer();

    var getProcessor = function(name) {
      if (processors[name]) {
        return $q.when(processors[name]);
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
        return new Promise(function(resolve, reject) {
          getProcessor(name)
            .then(function(processor) {
              var transformedDoc = processor.transformToDocument(doc);
              var rootElement = transformedDoc.documentElement.firstElementChild;
              resolve(xmlSerializer.serializeToString(rootElement));
            })
            .catch(reject);
        });
      }
    };
  }
]);