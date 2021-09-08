const ExtendedXpathEvaluator = require('extended-xpath');
const openrosaExtensions = require('openrosa-extensions');
const medicExtensions = require('./medic-xpath-extensions');
const translator = require('./translator');

module.exports = function() {
  const ore = openrosaExtensions(translator.t);
  ore.func = Object.assign(ore.func, medicExtensions.func);
  ore.process = Object.assign(ore.process, medicExtensions.process);
  const wrappedXpathEvaluator = new XPathEvaluator();

  const evaluator = new ExtendedXpathEvaluator(wrappedXpathEvaluator, ore);

  this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
    wrappedXpathEvaluator.evaluate = (v) => {
      // Node requests (i.e. result types greater than 3 (BOOLEAN)
      // should be processed unaltered, as they are passed this
      // way from the ExtendedXpathEvaluator.  For anything else,
      // we will be ask for the most appropriate result type, and
      // handle as best we can.
      const wrappedResultType = resultType > XPathResult.BOOLEAN_TYPE ? resultType : XPathResult.ANY_TYPE;
      const doc = contextPath.ownerDocument;
      return doc.evaluate(v, contextPath, namespaceResolver, wrappedResultType, result);
    };
    return evaluator.evaluate(e, contextPath, namespaceResolver, resultType, result);
  };
};
