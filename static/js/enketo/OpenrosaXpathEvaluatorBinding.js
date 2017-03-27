var ExtendedXpathEvaluator = require('extended-xpath');
var openrosa_xpath_extensions = require('openrosa-xpath-extensions');

module.exports = function() {
    // re-implement XPathJS ourselves!
    var evaluator = new XPathEvaluator();
    this.xml.jsCreateExpression = function() {
        return evaluator.createExpression.apply( evaluator, arguments );
    };
    this.xml.jsCreateNSResolver = function() {
        return evaluator.createNSResolver.apply( evaluator, arguments );
    };
    this.xml.jsEvaluate = function(e, contextPath, namespaceResolver, resultType, result) {
        var evaluator = new ExtendedXpathEvaluator(
                function wrappedXpathEvaluator(v) {
                    // Node requests (i.e. result types greater than 3 (BOOLEAN)
                    // should be processed unaltered, as they are passed this
                    // way from the ExtendedXpathEvaluator.  For anything else,
                    // we will be ask for the most appropriate result type, and
                    // handle as best we can.
                    var wrappedResultType = resultType > XPathResult.BOOLEAN_TYPE ? resultType : XPathResult.ANY_TYPE;
                    var doc = contextPath.ownerDocument;
                    return doc.evaluate(v, contextPath, namespaceResolver, wrappedResultType, result);
                },
                openrosa_xpath_extensions);
        return evaluator.evaluate(e, contextPath, namespaceResolver, resultType, result);
    };
    window.JsXPathException =
            window.JsXPathExpression =
            window.JsXPathNSResolver =
            window.JsXPathResult =
            window.JsXPathNamespace = true;
};
