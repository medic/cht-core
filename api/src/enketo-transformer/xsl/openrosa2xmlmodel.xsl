<?xml version="1.0" encoding="UTF-8"?>

<!-- This is an identical copy to https://github.com/enketo/enketo-transformer/blob/2.1.5/src/xsl/openrosa2xmlmodel.xsl -->
<!-- committed because of https://github.com/medic/cht-core/issues/7771 -->

<!--
*****************************************************************************************************
XSLT Stylesheet that transforms OpenRosa style (X)Forms instance to an xml instance that can be used
inside Enketo Smart Paper.
*****************************************************************************************************
-->

<!--
These namespace-declarations have been carefully crafted to produce a fairly clean output.
This includes the duplicate default namespace and xf: prefixed namespace.
Edit with care!
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xf="http://www.w3.org/2002/xforms"
                xmlns:h="http://www.w3.org/1999/xhtml"
                xmlns:ev="http://www.w3.org/2001/xml-events"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns="http://www.w3.org/2002/xforms" version="1.0">
  <xsl:output method="xml" indent="yes" omit-xml-declaration="yes" version="1.0" encoding="UTF-8" />

  <xsl:template match="/">
    <root>
      <model>
        <xsl:apply-templates select="//xf:model/@*" mode="include-namespace-declarations"/>
        <xsl:apply-templates select="//xf:model/xf:instance" />
      </model>
    </root>
  </xsl:template>

  <xsl:template match="xf:instance">
    <instance>
      <xsl:apply-templates select="@*"/>
      <!--
      This forces namespace declarations on the child of instance, which makes it easier to
      serialize that child for a submission without duplications of namespace declarations.
      -->
      <xsl:copy-of select="node()" />
    </instance>
  </xsl:template>

  <xsl:template match="@*">
    <xsl:attribute name="{name()}">
      <xsl:value-of select="." />
    </xsl:attribute>
  </xsl:template>

  <xsl:template match="@*" mode="include-namespace-declarations">
    <xsl:copy-of select="."/>
  </xsl:template>

</xsl:stylesheet>
