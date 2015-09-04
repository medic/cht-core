angular.module('inboxServices').service('Enketo', [
  'DbNameService',
  function(DbNameService) {
    var processors = {},
        xmlSerializer = new XMLSerializer();

    (function constructor() {
      (function initProcessors() {
        var static_root = '/' + DbNameService() + '/_design/medic/static';
        $.get(static_root + '/xslt/openrosa2html5form.xsl').done(function(doc) {
          var processor = new XSLTProcessor();
          processor.importStylesheet(doc);
          processors.html = processor;
        });
        $.get(static_root + '/xslt/openrosa2xmlmodel.xsl').done(function(doc) {
          var processor = new XSLTProcessor();
          processor.importStylesheet(doc);
          processors.model = processor;
        });
      }());
    }());

    function transformTo(processorName, doc) {
      var transformedDoc = processors[processorName].transformToDocument(doc),
          rootElement = transformedDoc.documentElement.firstElementChild;
      return xmlSerializer.serializeToString(rootElement);
    }

    this.transformXml = function(doc) {
      if(!processors.html || !processors.model) {
        return console.log('[enketo] processors are not ready');
      }
      return {
        html: transformTo('html', doc),
        model: transformTo('model', doc)
      };
    };
  }
]);

