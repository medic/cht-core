window.MMXSLT = {
  header: '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa" xmlns:exsl="http://exslt.org/common" xmlns:str="http://exslt.org/strings" xmlns:dyn="http://exslt.org/dynamic" extension-element-prefixes="exsl str dyn" version="2.0" ><xsl:template match="/">',
  footer: '</xsl:template></xsl:stylesheet>',
};

// Mock for PhantomJS
window.XSLTProcessor = window.XSLTProcessor || function() {
  var _stylesheet;

  this.importStylesheet = function(stylesheet) {
    _stylesheet = stylesheet;
  };
  this.transformToDocument = function() {
    var s = new XMLSerializer().serializeToString(_stylesheet);
    var xsltOutput = s.substring(window.MMXSLT.header.length - 1,
        s.length - window.MMXSLT.footer.length);
    var parsed = $.parseXML(xsltOutput);
    return parsed;
  };
};
