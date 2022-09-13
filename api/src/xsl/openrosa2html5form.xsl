<?xml version="1.0"?>
<!--
This stylesheet extends the default one to allow for additional input types.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xf="http://www.w3.org/2002/xforms"
                xmlns:enk="http://enketo.org/xforms"
                xmlns:jr="http://openrosa.org/javarosa"
                xmlns:orx="http://openrosa.org/xforms">

  <xsl:import href="../enketo-transformer/xsl/openrosa2html5form.xsl"/>

  <!-- Overwrite binding-attributes declaration from openrosa2html5form.xsl to include custom code -->
  <!-- Prevent notes from ever being required -->
  <xsl:template name="binding-attributes">
    <xsl:param name="binding"/>
    <xsl:param name="nodeset"/>
    <xsl:param name="type"/>
    <xsl:variable name="xml-type">
      <xsl:call-template name="xml_type">
        <xsl:with-param name="nodeset" select="$nodeset"/>
        <!--<xsl:with-param name="binding" select="$binding"/>-->
      </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="html-input-type">
      <xsl:call-template name="html_type">
        <xsl:with-param name="xml_type" select="$xml-type" />
      </xsl:call-template>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="$type = 'select_multiple'">
        <xsl:attribute name="multiple">multiple</xsl:attribute>
      </xsl:when>
      <xsl:when test="$type = 'select_one'"></xsl:when>
      <xsl:when test="$type = 'textarea'"></xsl:when>
      <xsl:when test="$type = 'rank'">
        <xsl:attribute name="type">rank</xsl:attribute>
      </xsl:when>
      <xsl:otherwise>
        <xsl:attribute name="type">
          <xsl:value-of select="$html-input-type"/>
        </xsl:attribute>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:attribute name="name">
      <xsl:value-of select="normalize-space($nodeset)" />
    </xsl:attribute>
    <xsl:if test="$html-input-type = 'radio'">
      <xsl:attribute name="data-name">
        <xsl:value-of select="normalize-space($nodeset)" />
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="local-name() = 'item'">
      <xsl:attribute name="value">
        <xsl:value-of select="./xf:value"/>
      </xsl:attribute>
    </xsl:if>
    <!-- Medic specific section start -->
    <!-- Do not copy the required attribute for notes -->
    <xsl:if test="(string-length($binding/@required) &gt; 0) and not($binding/@required = 'false()') and not(local-name() = 'bind') and not($binding/@type='string' and $binding/@readonly='true()' and not(string-length($binding/@calculate) &gt; 0))">
    <!-- Medic specific section end -->
      <xsl:attribute name="data-required">
        <xsl:value-of select="$binding/@required" />
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="$binding/@constraint">
      <xsl:attribute name="data-constraint">
        <xsl:value-of select="$binding/@constraint" />
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="$binding/@relevant">
      <xsl:attribute name="data-relevant">
        <xsl:value-of select="$binding/@relevant"/>
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="$binding/@calculate">
      <xsl:attribute name="data-calculate">
        <xsl:value-of select="$binding/@calculate" />
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="$binding/@jr:preload">
      <xsl:attribute name="data-preload">
        <xsl:value-of select="$binding/@jr:preload"/>
      </xsl:attribute>
      <xsl:attribute name="data-preload-params">
        <xsl:value-of select="$binding/@jr:preloadParams"/>
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="$binding/@enk:for">
      <xsl:attribute name="data-for">
        <xsl:value-of select="normalize-space($binding/@enk:for)" />
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="$openclinica = 1">
      <xsl:for-each select="$binding/@*[starts-with(name(), 'oc:') and not(substring-before(name(), 'Msg'))]" >
        <xsl:attribute name="{concat('data-oc-', local-name(.))}">
          <xsl:value-of select="normalize-space(.)" />
        </xsl:attribute>
      </xsl:for-each>
    </xsl:if>
    <xsl:if test="$binding/@orx:max-pixels">
      <xsl:attribute name="data-max-pixels">
        <xsl:value-of select="normalize-space($binding/@orx:max-pixels)" />
      </xsl:attribute>
    </xsl:if>
    <xsl:attribute name="data-type-xml">
      <xsl:value-of select="$xml-type" />
    </xsl:attribute>
    <xsl:if test="$xml-type = 'decimal'">
      <xsl:attribute name="step">any</xsl:attribute>
    </xsl:if>
    <xsl:if test="$binding/@readonly = 'true()' and not($html-input-type = 'hidden')" >
      <!--
          This also adds a readonly attribute to <select> which is not valid HTML.
          We could add some logic to avoid that (the <option>s already get the disabled attribute),
          but it's an extra line of defence and doesn't really hurt. The input change handler in
          Enketo Core ignores changes on a <select readonly>.
      -->
      <xsl:attribute name="readonly">readonly</xsl:attribute>
    </xsl:if>
    <xsl:if test="local-name() = 'range'">
      <!-- note that due to the unhelpful default value behavior of input type=range in HTML, we use type=number -->
      <xsl:if test="@start">
        <xsl:attribute name="min">
          <xsl:value-of select="@start" />
        </xsl:attribute>
      </xsl:if>
      <xsl:if test="@end">
        <xsl:attribute name="max">
          <xsl:value-of select="@end" />
        </xsl:attribute>
      </xsl:if>
      <xsl:if test="@step">
        <xsl:attribute name="step">
          <xsl:value-of select="@step" />
        </xsl:attribute>
      </xsl:if>
    </xsl:if>
    <xsl:if test="$html-input-type = 'file'">
      <xsl:attribute name="accept">
        <xsl:choose>
          <xsl:when test="@accept">
            <xsl:value-of select="@accept" />
          </xsl:when>
          <xsl:when test="@mediatype">
            <xsl:value-of select="@mediatype" />
          </xsl:when>
        </xsl:choose>
      </xsl:attribute>
      <!-- Note, this test captures new, new-front, new-rear -->
      <xsl:if test="contains(@appearance, 'new')">
        <xsl:attribute name="capture">
          <xsl:choose>
            <xsl:when test="contains(@appearance, 'new-front')">
              <xsl:value-of select="'user'"/>
            </xsl:when>
            <xsl:when test="contains(@appearance, 'new-rear')">
              <xsl:value-of select="'environment'"/>
            </xsl:when>
            <!-- else (if appearance="new"), the capture attribute remains empty, by design -->
          </xsl:choose>
        </xsl:attribute>
      </xsl:if>
    </xsl:if>
  </xsl:template>

  <!-- Overwrite html_type declaration from openrosa2html5form.xsl to include custom code -->
  <!-- Allow custom Medic types -->
  <xsl:template name="html_type">
    <xsl:param name="xml_type" />
    <xsl:choose>
      <xsl:when test="local-name(..) = 'select1' or $xml_type='select1' or local-name(.) = 'trigger'">radio</xsl:when>
      <xsl:when test="local-name(..) = 'select' or $xml_type='select'">checkbox</xsl:when>
      <xsl:when test="local-name() = 'bind'">hidden</xsl:when>
      <xsl:when test="local-name() = 'range'">number</xsl:when>
      <xsl:when test="$xml_type = 'dateTime'">datetime-local</xsl:when>
      <xsl:when test="$xml_type = 'date'">date</xsl:when>
      <!-- note, it may not actually be possible to support 'file' with offline storage -->
      <xsl:when test="$xml_type = 'binary'">file</xsl:when>
      <xsl:when test="$xml_type = 'time'">time</xsl:when>
      <xsl:when test="$xml_type = 'rank'">text</xsl:when>
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
