<?xml version="1.0"?>
<!--
This stylesheet extends the default one to allow for additional input types.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 
  <xsl:import href="../../node_modules/enketo-transformer/src/xsl/openrosa2html5form.xsl"/>
   
  <xsl:template name="html_type">
    <xsl:param name="xml_type" />
    <xsl:choose>
      <xsl:when test="local-name(..) = 'select1' or $xml_type='select1' or local-name(.) = 'trigger'">radio</xsl:when>
      <xsl:when test="local-name(..) = 'select' or $xml_type='select'">checkbox</xsl:when>
      <xsl:when test="local-name() = 'bind'">hidden</xsl:when>
      <xsl:when test="$xml_type = 'dateTime'">datetime</xsl:when>
      <xsl:when test="$xml_type = 'date'">date</xsl:when>
      <!-- note, it may not actually be possible to support 'file' with offline storage -->
      <xsl:when test="$xml_type = 'binary'">file</xsl:when>
      <xsl:when test="$xml_type = 'time'">time</xsl:when>
      <xsl:when
        test="$xml_type = 'decimal' or $xml_type = 'float' or $xml_type = 'double' or $xml_type = 'int' or $xml_type = 'integer'"
        >number</xsl:when>
      <xsl:when test="$xml_type = 'string' and contains(./@appearance, 'numbers')">tel</xsl:when>
      <xsl:when test="$xml_type = 'string'">text</xsl:when>
      <xsl:when test="$xml_type = 'barcode' or $xml_type = 'geopoint' or $xml_type = 'geotrace' or $xml_type = 'geoshape'" >
        <xsl:value-of select="string('text')" />
      </xsl:when>
      <!-- Medic specific section start -->
      <xsl:when test="$xml_type = 'tel'">tel</xsl:when>
      <xsl:otherwise>text</xsl:otherwise>
      <!-- Medic specific section end -->
    </xsl:choose>
  </xsl:template>
 
</xsl:stylesheet>
