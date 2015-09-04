angular.module('inboxServices').service('Enketo', [
  'DbNameService',
  function(DbNameService) {
    var processors = {};

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

    this.transformXml = function(doc) {
      if(!processors.html || !processors.model) {
        return console.log('[enketo] processors are not ready');
      }
      return {
        html: processors.html.transformToDocument(doc),
        model: processors.model.transformToDocument(doc),
      };
    };
  }
]);

