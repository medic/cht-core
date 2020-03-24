const ExtendedXpathEvaluator = require('extended-xpath');
const openrosaExtensions = require('openrosa-xpath-extensions');
const medicExtensions = require('./medic-xpath-extensions');
const translator = require('./translator');

module.exports = function() {
  // re-implement XPathJS ourselves!
  const evaluator = new XPathEvaluator();
  this.xml.jsCreateExpression = function() {
    return evaluator.createExpression.apply( evaluator, arguments );
  };
  this.xml.jsCreateNSResolver = function() {
    return evaluator.createNSResolver.apply( evaluator, arguments );
  };
  this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
    const extensions = openrosaExtensions(translator.t);
    extensions.func = Object.assign(extensions.func, medicExtensions.func);
    extensions.process = Object.assign(extensions.process, medicExtensions.process);
    const wrappedXpathEvaluator = function(v) {
      // Node requests (i.e. result types greater than 3 (BOOLEAN)
      // should be processed unaltered, as they are passed this
      // way from the ExtendedXpathEvaluator.  For anything else,
      // we will be ask for the most appropriate result type, and
      // handle as best we can.
      const wrappedResultType = resultType > XPathResult.BOOLEAN_TYPE ? resultType : XPathResult.ANY_TYPE;
      const doc = contextPath.ownerDocument;
      return doc.evaluate(v, contextPath, namespaceResolver, wrappedResultType, result);
    };
    const evaluator = new ExtendedXpathEvaluator(wrappedXpathEvaluator, extensions);
    return evaluator.evaluate(e, contextPath, namespaceResolver, resultType, result);
  };
  window.JsXPathException =
            window.JsXPathExpression =
            window.JsXPathNSResolver =
            window.JsXPathResult =
            window.JsXPathNamespace = true;
};
