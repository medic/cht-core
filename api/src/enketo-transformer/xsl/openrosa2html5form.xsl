<?xml version="1.0" encoding="UTF-8"?>

<!-- This is an identical copy to https://github.com/enketo/enketo-transformer/blob/2.1.5/src/xsl/openrosa2html5form.xsl -->
<!-- committed because of https://github.com/medic/cht-core/issues/7771 -->
<!--
*****************************************************************************************************
XSLT Stylesheet that transforms OpenRosa style (X)Forms into valid HTMl5 forms
(exception: when non-IANA lang attributes are used the form will not validate (but that's not serious))
*****************************************************************************************************
-->
<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xf="http://www.w3.org/2002/xforms"
  xmlns:orx="http://openrosa.org/xforms"
  xmlns:enk="http://enketo.org/xforms"
  xmlns:odk="http://www.opendatakit.org/xforms"
  xmlns:kb="http://kobotoolbox.org/xforms"
  xmlns:esri="http://esri.com/xforms"
  xmlns:oc="http://openclinica.org/xforms"
  xmlns:h="http://www.w3.org/1999/xhtml"
  xmlns:ev="http://www.w3.org/2001/xml-events"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:jr="http://openrosa.org/javarosa"
  xmlns:exsl="http://exslt.org/common"
  xmlns:str="http://exslt.org/strings"
  xmlns:dyn="http://exslt.org/dynamic"
  extension-element-prefixes="exsl str dyn"
  version="1.0"
>
  <xsl:param name="openclinica"/>
  <xsl:output method="html" omit-xml-declaration="yes" encoding="UTF-8" indent="yes"/><!-- for xml: version="1.0" -->

  <xsl:variable name="upper-case" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'" />
  <xsl:variable name="lower-case" select="'abcdefghijklmnopqrstuvwxyz'" />
  <xsl:variable name="undefined">undefined</xsl:variable>
  <xsl:variable name="warning">warning</xsl:variable>
  <xsl:variable name="error">error</xsl:variable>
  <xsl:variable name="translated"><!-- assumes that either a whole form is translated or nothing (= real life) -->
    <xsl:if test="count(/h:html/h:head/xf:model/xf:itext/xf:translation) &gt; 1" >
      <xsl:value-of select="string('true')" /><!-- no time to figure out how to use real boolean values -->
    </xsl:if>
  </xsl:variable>
  <xsl:variable name="default-lang">
    <xsl:choose>
      <xsl:when test="h:html/h:head/xf:model/xf:itext/xf:translation[@default]/@lang">
        <xsl:value-of select="h:html/h:head/xf:model/xf:itext/xf:translation[@default]/@lang" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="''" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="first-lang">
    <!-- first language or empty if itext was not used -->
    <xsl:value-of select="h:html/h:head/xf:model/xf:itext/xf:translation[1]/@lang" />
  </xsl:variable>
  <xsl:variable name="current-lang">
    <xsl:choose>
      <xsl:when test="string-length($default-lang) > 0">
        <xsl:value-of select="$default-lang" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$first-lang" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <xsl:template match="/">
    <xsl:if test="not(function-available('exsl:node-set'))">
      <xsl:message terminate="yes">FATAL ERROR: exsl:node-set function is not available in this XSLT processor</xsl:message>
    </xsl:if>
    <xsl:if test="not(function-available('str:replace'))">
      <xsl:message terminate="yes">FATAL ERROR: str:replace function is not available in this XSLT processor</xsl:message>
    </xsl:if>
    <xsl:if test="not(function-available('dyn:evaluate'))">
      <xsl:message terminate="yes">FATAL ERROR: dyn:evaluate function is not available in this XSLT processor</xsl:message>
    </xsl:if>
    <xsl:if test="not(function-available('str:tokenize'))">
      <xsl:message terminate="yes">FATAL ERROR: str:tokenize function is not available in this XSLT processor</xsl:message>
    </xsl:if>
    <xsl:for-each select="/h:html/h:head/xf:model/xf:bind">
      <xsl:if test="not(substring(./@nodeset, 1, 1) = '/')">
        <xsl:message terminate="no">WARNING: Found binding(s) with relative nodeset attribute <!--on element: <xsl:value-of select="./@nodeset" />--> (form may work correctly if relative nodesets were used consistently throughout xml form in bindings as well as body, otherwise it will certainly be messed up). </xsl:message>
      </xsl:if>
    </xsl:for-each>
    <!--> <xsl:text disable-output-escaping='yes'>&lt;!DOCTYPE html&gt;</xsl:text>
     <html>
         <head>
             <title>
                 <xsl:text>Transformation of JR (X)Form to HTML5</xsl:text>
             </title>
             <script src="jquery.min.js" type="text/javascript" ><xsl:text> </xsl:text></script>
             <script type="text/javascript">
                 <xsl:text disable-output-escaping='yes'>
                   $(function() {
                         $('#form-languages a').click(function(){
                            $('form [lang]').show().not('[lang="'+$(this).attr('lang')+'"], [lang=""], #form-languages a').hide();
                         });
                   });</xsl:text>
             </script>
         </head>-->
    <root>
      <form autocomplete="off" novalidate="novalidate" class="clearfix" dir="ltr">
        <xsl:attribute name="class">
          <xsl:value-of select="'or clearfix'" />
          <xsl:if test="/h:html/h:body/@class">
            <xsl:value-of select="concat(' ', /h:html/h:body/@class)" />
          </xsl:if>
        </xsl:attribute>
        <xsl:attribute name="data-form-id">
          <xsl:choose>
            <xsl:when test="/h:html/h:head/xf:model/xf:instance[1]/child::node()/@id">
              <xsl:value-of select="/h:html/h:head/xf:model/xf:instance/child::node()/@id" />
            </xsl:when>
            <xsl:when test="/h:html/h:head/xf:model/xf:instance/child::node()/@xmlns">
              <xsl:value-of select="/h:html/h:head/xf:model/xf:instance/child::node()/@xmlns" />
            </xsl:when>
            <xsl:otherwise>
              <xsl:text>_</xsl:text>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:attribute>
        <xsl:if test="/h:html/h:head/xf:model/xf:submission/@action">
          <xsl:attribute name="action">
            <xsl:value-of select="/h:html/h:head/xf:model/xf:submission/@action"/>
          </xsl:attribute>
        </xsl:if>
        <xsl:if test="/h:html/h:head/xf:model/xf:submission/@method">
          <xsl:attribute name="method">
            <xsl:choose>
              <xsl:when test="/h:html/h:head/xf:model/xf:submission/@method = 'form-data-post'">
                <xsl:value-of select="'post'"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="/h:html/h:head/xf:model/xf:submission/@method"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
        </xsl:if>
        <xsl:if test="/h:html/h:head/xf:model/xf:submission/@base64RsaPublicKey">
          <xsl:attribute name="data-base64RsaPublicKey">
            <xsl:value-of select="/h:html/h:head/xf:model/xf:submission/@base64RsaPublicKey"/>
          </xsl:attribute>
        </xsl:if>
        <xsl:text>&#10;</xsl:text>
        <xsl:comment>This form was created by transforming an ODK/OpenRosa-flavored (X)Form using an XSL stylesheet created by Enketo LLC.</xsl:comment>
        <section class="form-logo">
          <xsl:text></xsl:text>
        </section>
        <h3 dir="auto" id="form-title">
          <xsl:choose>
            <xsl:when test="/h:html/h:head/h:title">
              <xsl:value-of select="/h:html/h:head/h:title"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:text>No Title</xsl:text>
            </xsl:otherwise>
          </xsl:choose>
        </h3>
        <!--
            <div id="stats" style="display: none;">
                <span id="jrSelect"><xsl:value-of select="count(/h:html/h:body//xf:select)"/></span>
                <span id="jrSelect1"><xsl:value-of select="count(/h:html/h:body//xf:select1)"/></span>
                <span id="jrItemset"><xsl:value-of select="count(/h:html/h:body//xf:itemset)"/></span>
                <span id="jrItem"><xsl:value-of select="count(/h:html/h:body//xf:item)"/></span>
                <span id="jrInput"><xsl:value-of select="count(/h:html/h:body//xf:input)"/></span>
                <span id="jrUpload"><xsl:value-of select="count(/h:html/h:body//xf:upload)"/></span>
                <span id="jrTrigger"><xsl:value-of select="count(/h:html/h:body//xf:trigger)"/></span>
                <span id="jrRepeat"><xsl:value-of select="count(/h:html/h:body//xf:repeat)"/></span>
                <span id="jrRelevant"><xsl:value-of select="count(/h:html/h:head/xf:model/xf:bind[@relevant])"/></span>
                <span id="jrConstraint"><xsl:value-of select="count(/h:html/h:head/xf:model/xf:bind[@constraint])"/></span>
                <span id="jrCalculate"><xsl:value-of select="count(/h:html/h:head/xf:model/xf:bind[@calculate])"/></span>
                <span id="jrPreload"><xsl:value-of select="count(/h:html/h:head/xf:model/xf:bind[@jr:preload])"/></span>
            </div>
        -->
        <xsl:if test="//*/@lang" >
          <select id="form-languages">
            <xsl:if test="$translated != 'true'">
              <xsl:attribute name="style">display:none;</xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-default-lang">
              <xsl:value-of select="$default-lang" />
            </xsl:attribute>
            <xsl:call-template name="languages" />
          </select>
        </xsl:if>

        <xsl:apply-templates />

        <!-- Create hidden input fields for preload items that do not have a form control. -->
        <xsl:if test="/h:html/h:head/xf:model/xf:bind[@jr:preload]" >
          <fieldset id="or-preload-items" style="display:none;">
            <xsl:apply-templates select="/h:html/h:head/xf:model/xf:bind[@jr:preload]"/>
          </fieldset>
        </xsl:if>

        <!-- Create hidden input fields for calculated items that do not have a form control. -->
        <!-- the template will exclude those that have an input field -->
        <xsl:if test="/h:html/h:head/xf:model/xf:bind[@calculate]">
          <fieldset id="or-calculated-items" style="display:none;">
            <xsl:apply-templates select="/h:html/h:head/xf:model/xf:bind[@calculate]" />
          </fieldset>
        </xsl:if>


        <!-- Create hidden input fields for calculated items that do not have a form control. -->
        <!-- the template will exclude those that have an input field -->
        <xsl:if test="/h:html/h:head/xf:model/xf:setvalue[@event]">
          <fieldset id="or-setvalue-items" style="display:none;">
            <xsl:apply-templates select="/h:html/h:head/xf:model/xf:setvalue[@event]" />
          </fieldset>
        </xsl:if>
        <xsl:if test="/h:html/h:head/xf:model/odk:setgeopoint[@event]">
          <fieldset id="or-setgeopoint-items" style="display:none;">
            <xsl:apply-templates select="/h:html/h:head/xf:model/odk:setgeopoint[@event]" />
          </fieldset>
        </xsl:if>
        <!--
        <xsl:if test="/h:html/h:body//xf:output">
            <xsl:message>WARNING: Output element(s) added but note that only /absolute/path/to/node is properly supported as "value" attribute of outputs. Please test to make sure they do what you want.</xsl:message>
        </xsl:if>
        <xsl:if test="/h:html/h:body//xf:itemset">
            <xsl:message>WARNING: Itemset support is experimental. Make sure to test whether they do what you want.</xsl:message>
        </xsl:if>
        -->
        <xsl:if test="//xf:submission">
          <xsl:message>ERROR: Submissions element(s) not supported.</xsl:message>
        </xsl:if>
      </form>
    </root>
  </xsl:template>
  <xsl:template match="h:head"/> <!--[not(self::xf:model/xf:bind[@jr:preload])]" />-->

  <xsl:template match="xf:group">
    <!-- NOTE: TO IMPROVE PERFORMANCE, SUPPORT FOR RELATIVE NODESET BINDINGS HAS BEEN SWITCHED OFF
        To turn this back on:
        - uncomment the variable nodeset_used
        - revert back to commented-out code for variable nodeset
        - revert back to commented-out code for variable binding
        - all this takes place in the next 10 lines
    <xsl:variable name="nodeset_used">
        <xsl:call-template name="nodeset_used" />
    </xsl:variable>
-->
    <xsl:variable name="nodeset">
      <!--<xsl:call-template name="nodeset_absolute">
          <xsl:with-param name="nodeset_u" select="$nodeset_used"/>
      </xsl:call-template>-->
      <xsl:call-template name="nodeset_used" />
    </xsl:variable>

    <!-- note that bindings are not required -->
    <!--<xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset_used] | /h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]"/>-->
    <xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]"/>

    <section>
      <xsl:attribute name="class">
        <!-- only add or-group if label is present or if it has a repeat as child-->
        <xsl:choose>
          <xsl:when test="string(./xf:label/@ref) or string(./xf:label)">
            <xsl:value-of select="'or-group '" />
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="'or-group-data '" />
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$binding/@relevant">
          <xsl:value-of select="'or-branch pre-init '"/>
        </xsl:if>
        <xsl:call-template name="appearance" />
        <!-- Workaround for XLSForm limitation: add "compact" to group if the immediate repeat child has this appearance -->
        <!-- This should actually be fixed in pyxform instead -->
        <xsl:if test="contains(./xf:repeat/@appearance, 'compact')">
          <xsl:value-of select="'or-appearance-compact '"/>
        </xsl:if>
        <!-- same workaround for "no-collapse" -->
        <xsl:if test="contains(./xf:repeat/@appearance, 'no-collapse')">
          <xsl:value-of select="'or-appearance-no-collapse '"/>
        </xsl:if>
      </xsl:attribute>

      <xsl:if test="string($nodeset)">
        <!--<xsl:variable name="nodeset" select="@ref" />-->
        <xsl:attribute name="name">
          <xsl:value-of select="$nodeset"/>
        </xsl:attribute>

        <xsl:if test="$binding/@relevant">
          <xsl:attribute name="data-relevant">
            <!--<xsl:value-of select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]/@relevant" />-->
            <xsl:value-of select="$binding/@relevant"/>
          </xsl:attribute>
        </xsl:if>
      </xsl:if>
      <xsl:if test="string(./xf:label/@ref) or string (./xf:label)">
        <h4>
          <xsl:apply-templates select="xf:label" />
        </h4>
      </xsl:if>
      <xsl:apply-templates select="*[not(self::xf:label or self::xf:hint)]"/>
      <xsl:call-template name="constraint-and-required-msg" >
        <xsl:with-param name="binding" select="$binding"/>
      </xsl:call-template>
      <xsl:text>
      </xsl:text>
    </section><xsl:comment>end of group <xsl:value-of select="@nodeset" /> </xsl:comment>
  </xsl:template>

  <xsl:template match="xf:repeat">
    <!-- NOTE: TO IMPROVE PERFORMANCE, SUPPORT FOR RELATIVE NODESET BINDINGS HAS BEEN SWITCHED OFF
            To turn this back on:
            - uncomment the variable nodeset_used
            - revert back to commented-out code for variable nodeset
            - revert back to commented-out code for variable binding
            - all this takes place in the next 10 lines
        <xsl:variable name="nodeset_used">
            <xsl:call-template name="nodeset_used" />
        </xsl:variable>
    -->

    <!-- the correct absolute nodeset as used in HTML -->
    <xsl:variable name="nodeset">
      <!--<xsl:call-template name="nodeset_absolute">
          <xsl:with-param name="nodeset_u" select="$nodeset_used"/>
      </xsl:call-template>-->
      <xsl:call-template name="nodeset_used" />
    </xsl:variable>

    <!-- note that bindings are not required -->
    <!--<xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset_used] | /h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]" />-->
    <xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]" />

    <section>
      <xsl:attribute name="class">
        <xsl:value-of select="'or-repeat '" />
        <!-- watch out or-branch pre-init added to or-group parent! -->
        <!--<xsl:if test="$binding/@relevant">
            <xsl:value-of select="'or-branch pre-init '"/>
        </xsl:if>-->
        <xsl:call-template name="appearance" />
      </xsl:attribute>
      <xsl:attribute name="name">
        <xsl:value-of select="$nodeset"/>
      </xsl:attribute>
      <xsl:if test="string(./xf:label/@ref) or string (./xf:label)">
        <h4>
          <xsl:apply-templates select="xf:label" />
        </h4>
      </xsl:if>

      <xsl:apply-templates select="*[not(self::xf:label or self::xf:hint)]"/>
      <xsl:text>
      </xsl:text>
    </section>
    <!-- Add a repeat-info node -->
    <div>
      <xsl:attribute name="class">
        <xsl:value-of select="'or-repeat-info'" />
      </xsl:attribute>
      <xsl:attribute name="data-name">
        <xsl:value-of select="$nodeset"/>
      </xsl:attribute>
      <xsl:if test="@jr:count">
        <xsl:attribute name="data-repeat-count">
          <xsl:value-of select="@jr:count" />
        </xsl:attribute>
      </xsl:if>
      <xsl:if test="@jr:noAddRemove">
        <xsl:attribute name="data-repeat-fixed">
          <xsl:value-of select="string('fixed')"/>
        </xsl:attribute>
      </xsl:if>
    </div>
  </xsl:template>

  <xsl:template name="appearance">
    <xsl:variable name="select-type">
      <xsl:if test="local-name() = 'select' or local-name() = 'select1'">
        <xsl:value-of select="'true'"/>
      </xsl:if>
    </xsl:variable>
    <xsl:if test="@appearance">
      <xsl:variable name="appearances" select="str:tokenize(@appearance)" />
      <xsl:for-each select="exsl:node-set($appearances)">
        <xsl:variable name="appearance">
          <xsl:value-of select="normalize-space(translate(., $upper-case, $lower-case))"/>
        </xsl:variable>
        <xsl:value-of select="concat('or-appearance-', $appearance, ' ')"/>
        <!-- convert deprecated appearances, but leave the deprecated ones -->
        <xsl:if test="$select-type = 'true'">
          <xsl:if test="$appearance = 'horizontal'">
            <xsl:value-of select="'or-appearance-columns '" />
          </xsl:if>
          <xsl:if test="$appearance = 'horizontal-compact'">
            <xsl:value-of select="'or-appearance-columns-pack '" />
          </xsl:if>
          <xsl:if test="$appearance = 'compact'">
            <xsl:value-of select="'or-appearance-columns-pack or-appearance-no-buttons '" />
          </xsl:if>
          <xsl:if test="starts-with($appearance, 'compact-')">
            <xsl:value-of select="concat('or-appearance-columns-', substring-after($appearance, '-'), ' or-appearance-no-buttons ')" />
          </xsl:if>
        </xsl:if>
      </xsl:for-each>
    </xsl:if>
    <!-- turn rows attribute into an appearance (which is what it should have been in the first place imho)-->
    <xsl:if test="./@rows">
      <xsl:value-of select="concat('or-appearance-rows-', ./@rows, ' ')" />
    </xsl:if>
  </xsl:template>


  <xsl:template match="xf:input | xf:upload | xf:range | xf:item | xf:bind[@jr:preload] | xf:bind[@calculate] | xf:setvalue[@event] | odk:setgeopoint[@event]">
    <!-- NOTE: TO IMPROVE PERFORMANCE, SUPPORT FOR RELATIVE NODESET BINDINGS HAS BEEN SWITCHED OFF
            To turn this back on:
            - uncomment the variable nodeset_used
            - revert back to commented-out code for variable nodeset
            - revert back to commented-out code for variable binding
            - all this takes place in the next 10 lines
        <xsl:variable name="nodeset_used">
            <xsl:call-template name="nodeset_used" />
        </xsl:variable>
    -->
    <!-- the correct absolute nodeset as used in HTML -->
    <xsl:variable name="nodeset">
      <!--<xsl:call-template name="nodeset_absolute">
          <xsl:with-param name="nodeset_u" select="$nodeset_used"/>
      </xsl:call-template>-->
      <xsl:call-template name="nodeset_used" />
    </xsl:variable>

    <!-- note that bindings are not required -->
    <!--<xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset_used] | /h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]" />-->
    <xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]" />

    <!-- If this is a bind element that also has an input, do nothing as it will be dealt with by the corresponding xf:input -->
    <!-- Note that this test is not fully spec-compliant. It will work with XLS-form produced forms that have no relative nodes
         and use the ref atribute only -->
    <xsl:if test="not( local-name() = 'bind' and (
            /h:html/h:body//xf:input[@ref=$nodeset] or
            /h:html/h:body//xf:upload[@ref=$nodeset] or
            /h:html/h:body//xf:select[@ref=$nodeset] or
            /h:html/h:body//xf:select1[@ref=$nodeset] ) )">
      <xsl:choose>
        <xsl:when test="(local-name() = 'range' and  contains(@appearance, 'picker'))">
          <xsl:call-template name="select-select">
            <xsl:with-param name="nodeset" select="$nodeset" />
            <xsl:with-param name="binding" select="$binding" />
          </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
          <label>
            <xsl:attribute name="class">
              <xsl:if test="local-name() = 'input' or local-name() = 'upload' or local-name() = 'range'">
                <xsl:value-of select="'question '"/>
              </xsl:if>
              <xsl:if test="(local-name() = 'input' or local-name() = 'upload' or local-name() = 'range' or local-name() = 'bind') and $binding/@relevant">
                <xsl:value-of select="'or-branch pre-init '"/>
              </xsl:if>
              <xsl:if test="local-name() = 'bind'">
                <xsl:value-of select="'calculation '"/>
              </xsl:if>
              <xsl:if test="local-name() = 'setvalue'">
                <xsl:value-of select="'setvalue '"/>
              </xsl:if>
              <xsl:if test="local-name() = 'setgeopoint'">
                <xsl:value-of select="'setgeopoint '"/>
              </xsl:if>
              <!--<xsl:if test="local-name() = 'item'">
                  <xsl:value-of select="'clearfix '"/>
              </xsl:if>-->
              <xsl:if test="local-name() != 'item'">
                <xsl:value-of select="'non-select '"/>
              </xsl:if>
              <xsl:call-template name="appearance" />
            </xsl:attribute>

            <xsl:apply-templates select="./@kb:image-customization"/>

            <xsl:if test="not(local-name() = 'item' or local-name() = 'bind' or local-name() = 'setvalue' or local-name() = 'setgeopoint')">
              <xsl:apply-templates select="xf:label" />
              <xsl:if test="not($binding/@readonly = 'true()')">
                <xsl:apply-templates select="$binding/@required"/>
              </xsl:if>
            </xsl:if>
            <!--
                note: Hints should actually be placed in title attribute (of input) as it is semantically nicer.
                However, to support multiple languages and parse all of them (to be available offline)
                they are placed in the label instead.
            -->
            <xsl:apply-templates select="xf:hint" />

            <xsl:variable name="appearance">
              <xsl:value-of select="translate(@appearance, $upper-case, $lower-case)"/>
            </xsl:variable>
            <xsl:variable name="element">
              <xsl:choose>
                <xsl:when test="$binding/@type = 'string' and contains($appearance, 'multi-line') or contains($appearance, 'multiline') or contains($appearance, 'text-area') or contains($appearance, 'textarea') or ./@rows">
                  <xsl:value-of select="string('textarea')" />
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="string('input')" />
                </xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:variable name="type">
              <xsl:if test="$element = 'textarea'">
                <xsl:value-of select="$element"/>
              </xsl:if>
            </xsl:variable>
            <xsl:element name="{$element}">
              <xsl:choose>
                <xsl:when test="not(local-name() = 'setvalue' or local-name() = 'setgeopoint') and ancestor::odk:rank">
                  <xsl:call-template name="rank-item-attributes"/>
                </xsl:when>
                <xsl:when test="local-name() = 'setvalue' or local-name() = 'setgeopoint'">
                  <xsl:call-template name="action-attributes">
                    <xsl:with-param name="binding" select="$binding"/>
                    <xsl:with-param name="nodeset" select="$nodeset"/>
                  </xsl:call-template>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:call-template name="binding-attributes">
                    <xsl:with-param name="binding" select="$binding"/>
                    <xsl:with-param name="nodeset" select="$nodeset"/>
                    <xsl:with-param name="type" select="$type"/>
                  </xsl:call-template>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:element>
            <xsl:if test="local-name() = 'item'">
              <xsl:apply-templates select="xf:label" />
            </xsl:if>

            <xsl:if test="not(local-name() = 'item' or local-name() = 'bind' or local-name() = 'setvalue' or local-name() = 'setgeopoint')">
              <!-- the only use case at the moment is a <setvalue> and <odk:setgeopoint> child with xforms-value-changed event-->
              <xsl:if test="./xf:setvalue[@event] or ./odk:setgeopoint[@event]">
                <xsl:apply-templates select="./xf:setvalue[@event] | ./odk:setgeopoint[@event]" />
              </xsl:if>
              <xsl:call-template name="constraint-and-required-msg" >
                <xsl:with-param name="binding" select="$binding"/>
              </xsl:call-template>
            </xsl:if>
          </label>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
  </xsl:template>

  <xsl:template match="*" mode="range-option-picker">
    <xsl:param name="start" />
    <xsl:param name="end" />
    <xsl:param name="step" />
    <xsl:param name="readonly" />
    <xsl:param name="limit" />
    <xsl:if test="not($start > $end)">
      <option>
        <xsl:if test="$readonly">
          <xsl:attribute name="disabled">
            <xsl:value-of select="'disabled'"/>
          </xsl:attribute>
        </xsl:if>
        <xsl:attribute name="value">
          <xsl:choose>
            <xsl:when test="string($start)">
              <xsl:value-of select="$start" />
            </xsl:when>
            <xsl:otherwise>
              <xsl:message>ERROR: Could not determine value of select option.</xsl:message>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:attribute>
        <xsl:value-of select="$start" />
      </option>
      <span>
        <xsl:attribute name="data-option-value">
          <xsl:value-of select="$start" />
        </xsl:attribute>
        <xsl:value-of select="."/>
      </span>
      <xsl:variable name="next" select="$start + $step"/>
      <xsl:choose>
        <xsl:when test="$limit > 1">
          <xsl:apply-templates select="current()" mode="range-option-picker">
            <xsl:with-param name="start" select="$next"/>
            <xsl:with-param name="end" select="$end"/>
            <xsl:with-param name="step" select="$step"/>
            <xsl:with-param name="readonly" select="$readonly"/>
            <xsl:with-param name="limit" select="$limit - 1"/>
          </xsl:apply-templates>
        </xsl:when>
        <xsl:otherwise>
          <xsl:message>ERROR: Exceed maximum iterations allowed.</xsl:message>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
  </xsl:template>

  <xsl:template match="xf:item" mode="select-option">
    <xsl:param name="tolerate-spaces" />
    <xsl:param name="readonly" />
    <xsl:variable name="label_translations">
      <xsl:apply-templates select="xf:label" />
    </xsl:variable>
    <xsl:variable name="value">
      <xsl:value-of select="xf:value" />
      <xsl:if test="not($tolerate-spaces) and contains(xf:value, ' ')">
        <xsl:message terminate="yes">ERROR: (Multi-)select item found with a value that contains spaces!</xsl:message>
      </xsl:if>
      <xsl:if test="not(string(xf:value))">
        <xsl:message terminate="no">WARNING: Select item found without a value!</xsl:message>
      </xsl:if>
    </xsl:variable>
    <option>
      <xsl:if test="$readonly">
        <xsl:attribute name="disabled">
          <xsl:value-of select="'disabled'"/>
        </xsl:attribute>
      </xsl:if>
      <xsl:attribute name="value">
        <xsl:choose>
          <xsl:when test="string($value)">
            <xsl:value-of select="$value" />
          </xsl:when>
          <xsl:otherwise>
            <xsl:message>ERROR: Could not determine value of select option.</xsl:message>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <!-- better to use default language if defined and otherwise span[1] -->
      <xsl:choose>
        <!-- TODO: IT WOULD BE MORE EFFICIENT TO EXTRACT THIS FROM exsl:node-set($label_translations) -->
        <xsl:when test="exsl:node-set($label_translations)/span[@lang=$current-lang]">
          <xsl:value-of select="exsl:node-set($label_translations)/span[@lang=$current-lang] " />
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="exsl:node-set($label_translations)/span[1] " />
        </xsl:otherwise>
      </xsl:choose>
    </option>
    <xsl:for-each select="exsl:node-set($label_translations)/span" >
      <span>
        <xsl:attribute name="data-option-value">
          <xsl:value-of select="$value" />
        </xsl:attribute>
        <xsl:attribute name="lang">
          <xsl:value-of select="@lang" />
        </xsl:attribute>
        <xsl:value-of select="."/>
      </span>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="xf:itemset" mode="templates">
    <xsl:param name="nodeset" />
    <xsl:param name="binding"/>
    <xsl:param name="type"/>
    <xsl:choose>
      <xsl:when test="not($type = 'option')">
        <label class="itemset-template">
          <xsl:attribute name="data-items-path">
            <xsl:value-of select="@nodeset"/>
          </xsl:attribute>
          <!--<xsl:value-of select="'__LABEL__'" />-->
          <input>
            <xsl:choose>
              <xsl:when test="ancestor::odk:rank">
                <xsl:call-template name="rank-item-attributes"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:call-template name="binding-attributes">
                  <xsl:with-param name="binding" select="$binding"/>
                  <xsl:with-param name="nodeset" select="$nodeset"/>
                </xsl:call-template>
              </xsl:otherwise>
            </xsl:choose>
            <xsl:attribute name="value"></xsl:attribute>
          </input>
        </label>
      </xsl:when>
      <xsl:otherwise>
        <option class="itemset-template" value="">
          <xsl:attribute name="data-items-path">
            <xsl:value-of select="@nodeset"/>
          </xsl:attribute>
          <xsl:if test="$binding/@readonly = 'true()'">
            <xsl:attribute name="disabled"/>
          </xsl:if>
          <xsl:value-of select="'...'"/>
        </option>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="xf:itemset" mode="labels">
    <xsl:variable name="value-ref" select="./xf:value/@ref" />
    <xsl:variable name="label-ref" select="./xf:label/@ref" />
    <xsl:variable name="iwq" select="substring-before(substring-after(@nodeset, 'instance('),')/')" />
    <!-- Needs to also deal with randomize(instance("id")/path/to/node), randomize(instance("id")/path/to/node, 3) -->
    <!-- Super inelegant and not robust without regexp:match -->
    <xsl:variable name="instance-path-temp">
      <xsl:choose>
        <xsl:when test="contains(@nodeset, 'randomize(') and contains(@nodeset, ',')">
          <xsl:value-of select="substring-before(substring-after(@nodeset, ')'), ',')"/>
        </xsl:when>
        <xsl:when test="contains(@nodeset, 'randomize(')">
          <xsl:value-of select="substring-before(substring-after(@nodeset, ')'), ')')"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="substring-after(@nodeset, ')')"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="instance-path" select="str:replace($instance-path-temp, '/', '/xf:')" />
    <xsl:variable name="instance-path-nofilter">
      <xsl:call-template name="strip-filter">
        <xsl:with-param name="string" select="$instance-path"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="instance-id" select="substring($iwq, 2, string-length($iwq)-2)" />
    <span class="itemset-labels">
      <xsl:attribute name="data-value-ref">
        <xsl:value-of select="$value-ref"/>
      </xsl:attribute>
      <xsl:choose>
        <xsl:when test="contains($label-ref, 'jr:itext(')">
          <xsl:attribute name="data-label-type">
            <xsl:value-of select="'itext'"/>
          </xsl:attribute>
          <xsl:variable name="label-node-name"
                        select="substring(substring-after($label-ref, 'itext('),1,string-length(substring-after($label-ref, 'itext('))-1)"/>
          <xsl:attribute name="data-label-ref">
            <xsl:value-of select="$label-node-name"/>
          </xsl:attribute>
          <xsl:for-each select="dyn:evaluate(concat('/h:html/h:head/xf:model/xf:instance[@id=&quot;', $instance-id, '&quot;]', $instance-path-nofilter))">
            <!-- so this is support for itext(node) (not itext(path/to/node)), but only 'ad-hoc' for itemset labels for now -->
            <xsl:variable name="id" select="./*[name()=$label-node-name]" />
            <xsl:call-template name="translations">
              <xsl:with-param name="id" select="$id"/>
              <xsl:with-param name="class" select="'option-label'"/>
            </xsl:call-template>
          </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
          <xsl:attribute name="data-label-ref">
            <xsl:value-of select="$label-ref"/>
          </xsl:attribute>
        </xsl:otherwise>
      </xsl:choose>
      <xsl:text>
      </xsl:text>
    </span>
  </xsl:template>

  <!--
      turns: /path/to/node[value=/some/other/node] into: /path/to/node
      this function is probably way too aggressive but will work for xls-form generated forms
      to do this properly a regexp:replace is required, but not supported in libXML
      kept the recursion in, even though it is not being used right now
  -->
  <xsl:template name="strip-filter">
    <xsl:param name="string"/>
    <xsl:choose>
      <xsl:when test="contains($string, '[') and contains($string, ']')">
        <xsl:value-of select="substring-before($string, '[')"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$string"/>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="string-length(substring-after($string, ']')) > 0">
      <xsl:call-template name="strip-filter">
        <xsl:with-param name="string" select="substring-after($string,']')"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!--
     turns STRING: '/path/to/node' into: /*[name()='path'/*[name()='to']/*[name()='node'
  -->
  <!--
  <xsl:template name="string-to-path">
      <xsl:param name="path-string"/>
      <xsl:if test="starts-with($path-string, '/')">
          <xsl:value-of select="'/'"/>
      </xsl:if>
      <xsl:choose>
          <xsl:when test="contains($path-string, '/')">
              <xsl:value-of select="substring-before($path-string, '/')"/>
              <xsl:call-template name="string-to-path">
                  <xsl:with-param name="path-string" select="substring-after($path-string, '/')"/>
              </xsl:call-template>
          </xsl:when>
      </xsl:choose>
  </xsl:template>
  -->

  <xsl:template name="select-select">
    <xsl:param name="nodeset"/>
    <xsl:param name="binding"/>
    <xsl:variable name="appearance" select="./@appearance" />
    <xsl:variable name="datalist-id" select="translate($nodeset, ' _-.\/', '')"/>
    <xsl:variable name="type">
      <xsl:choose>
        <xsl:when test="local-name() = 'select'">select_multiple</xsl:when>
        <xsl:otherwise>select_one</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="element">
      <xsl:choose>
        <xsl:when test="local-name() = 'select1' and (contains(@appearance, 'autocomplete') or contains(@appearance, 'search'))">datalist</xsl:when>
        <xsl:otherwise>select</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="options">
      <xsl:choose>
        <xsl:when test="contains(@appearance, 'picker')">
          <xsl:apply-templates select="current()" mode="range-option-picker">
            <xsl:with-param name="start" select="@start" />
            <xsl:with-param name="end" select="@end" />
            <xsl:with-param name="step" select="@step" />
            <xsl:with-param name="readonly" select="$binding/@readonly = 'true()'" />
            <xsl:with-param name="limit" select="500" />
          </xsl:apply-templates>
        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates select="xf:item" mode="select-option">
            <xsl:with-param name="tolerate-spaces" select="$type = 'select_one'" />
            <xsl:with-param name="readonly" select="$binding/@readonly = 'true()'" />
          </xsl:apply-templates>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <label>
      <xsl:attribute name="class">
        <xsl:value-of select="'question '"/>
        <xsl:if test="./@appearance">
          <xsl:call-template name="appearance" />
        </xsl:if>
        <xsl:if test="$binding/@relevant">
          <xsl:value-of select="' or-branch pre-init '"/>
        </xsl:if>
      </xsl:attribute>
      <xsl:apply-templates select="./@kb:image-customization"/>
      <xsl:apply-templates select="xf:label" />
      <xsl:apply-templates select="$binding/@required"/>
      <xsl:apply-templates select="xf:hint" />
      <xsl:if test="$element = 'datalist'">
        <input>
          <xsl:call-template name="binding-attributes">
            <xsl:with-param name="nodeset" select="$nodeset" />
            <xsl:with-param name="binding" select="$binding" />
            <xsl:with-param name="type" select="$type" />
          </xsl:call-template>
          <!-- override type attribute -->
          <xsl:attribute name="type">
            <xsl:value-of select="'text'"/>
          </xsl:attribute>
          <xsl:attribute name="list">
            <xsl:value-of select="$datalist-id"/>
          </xsl:attribute>
        </input>
      </xsl:if>
      <xsl:element name="{$element}">
        <xsl:choose>
          <xsl:when test="$element != 'datalist'">
            <xsl:call-template name="binding-attributes">
              <xsl:with-param name="nodeset" select="$nodeset" />
              <xsl:with-param name="binding" select="$binding" />
              <xsl:with-param name="type" select="$type" />
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise>
            <xsl:attribute name="id">
              <xsl:value-of select="$datalist-id"/>
            </xsl:attribute>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:choose>
          <xsl:when test="not(./xf:itemset)">
            <option value="">...</option>
            <xsl:for-each select="exsl:node-set($options)/option">
              <xsl:copy-of select="."/>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:apply-templates select="xf:itemset" mode="templates">
              <xsl:with-param name="binding" select="$binding"/>
              <xsl:with-param name="type" select="'option'"/>
            </xsl:apply-templates>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:element>
      <span class="or-option-translations" style="display:none;">
        <xsl:if test="not(./xf:itemset) and $translated = 'true'">
          <xsl:for-each select="exsl:node-set($options)/span">
            <xsl:copy-of select="." />
          </xsl:for-each>
        </xsl:if>
        <xsl:text>
        </xsl:text>
      </span>
      <xsl:if test="./xf:itemset">
        <xsl:apply-templates select="xf:itemset" mode="labels"/>
      </xsl:if>
      <xsl:if test="./xf:setvalue[@event] or ./odk:setgeopoint[@event]">
        <xsl:apply-templates select="./xf:setvalue[@event] | ./odk:setgeopoint[@event]" />
      </xsl:if>
      <xsl:call-template name="constraint-and-required-msg" >
        <xsl:with-param name="binding" select="$binding"/>
      </xsl:call-template>
    </label>
  </xsl:template>

  <xsl:template name="select-input">
    <xsl:param name="nodeset"/>
    <xsl:param name="binding"/>
    <!--
        legends are a royal pain-in-the-ass, but semantically correct to use. To restore sanity, the least
        ugly solution that works regardless of the legend text + hint length (and showing a nice error background)
        is to use a double fieldset (though another outer element would be okay too). Is consequence of being stingy with
        # of DOM elements used.
    -->
    <fieldset>
      <xsl:attribute name="class">
        <xsl:value-of select="'question '"/>
        <xsl:if test="not(contains(@appearance, 'compact') or contains(@appearance, 'list-nolabel') or contains(@appearance, 'label') or contains(@appearance, 'likert') or contains(@appearance, 'horizontal-compact') or contains(@appearance, 'no-buttons'))" >
          <xsl:value-of select="'simple-select '"/>
        </xsl:if>
        <xsl:if test="local-name() = 'trigger'">
          <xsl:value-of select="'trigger '"/>
        </xsl:if>
        <xsl:if test="$binding/@relevant">
          <xsl:value-of select="'or-branch pre-init '"/>
        </xsl:if>
        <xsl:if test="@appearance">
          <xsl:call-template name="appearance" />
        </xsl:if>
      </xsl:attribute>
      <xsl:apply-templates select="./@kb:image-customization"/>
      <xsl:apply-templates select="./@kb:flash"/>
      <fieldset>
        <!--<xsl:if test="./xf:itemset">
            <xsl:attribute name="data-itemset"/>
        </xsl:if>-->
        <legend>
          <xsl:apply-templates select="xf:label" />
          <xsl:apply-templates select="$binding/@required"/>
          <xsl:apply-templates select="xf:hint" />
          <xsl:text>
          </xsl:text>
        </legend>
        <xsl:if test="local-name() = 'rank'">
          <input class="rank">
            <xsl:call-template name="binding-attributes">
              <xsl:with-param name="binding" select="$binding"/>
              <xsl:with-param name="nodeset" select="$nodeset"/>
            </xsl:call-template>
          </input>
        </xsl:if>
        <div class="option-wrapper">
          <xsl:choose>
            <xsl:when test="local-name() = 'trigger'">
              <label>
                <input value="OK">
                  <xsl:call-template name="binding-attributes">
                    <xsl:with-param name="binding" select="$binding"/>
                    <xsl:with-param name="nodeset" select="$nodeset"/>
                  </xsl:call-template>
                </input>
                <span class="option-label active" lang="">
                  <xsl:value-of select="'OK'"/>
                </span>
              </label>
            </xsl:when>
            <xsl:when test="not(./xf:itemset)">
              <xsl:apply-templates select="xf:item" />
            </xsl:when>
            <xsl:otherwise>
              <xsl:apply-templates select="xf:itemset" mode="templates">
                <xsl:with-param name="nodeset" select="$nodeset" />
                <xsl:with-param name="binding" select="$binding" />
              </xsl:apply-templates>
              <xsl:apply-templates select="xf:itemset" mode="labels"/>
            </xsl:otherwise>
          </xsl:choose>
        </div>
      </fieldset>
      <!-- the only use case at the moment is a <setvalue> or <odk:setgeopoint> child with xforms-value-changed event-->
      <xsl:if test="./xf:setvalue[@event] or ./odk:setgeopoint[@event]">
        <xsl:apply-templates select="./xf:setvalue[@event] | ./odk:setgeopoint[@event]" />
      </xsl:if>
      <xsl:call-template name="constraint-and-required-msg" >
        <xsl:with-param name="binding" select="$binding"/>
      </xsl:call-template>
    </fieldset>
  </xsl:template>


  <!--
      Don't add any logic or names to odk:rank items
  -->
  <xsl:template name="rank-item-attributes">
    <xsl:attribute name="value">
      <xsl:value-of select="./xf:value"/>
    </xsl:attribute>
    <xsl:attribute name="class">
      <xsl:value-of select="'ignore'"/>
    </xsl:attribute>
    <xsl:attribute name="type">
      <xsl:value-of select="'text'"/>
    </xsl:attribute>
  </xsl:template>

  <!--
      Don't add any logic or names to setvalue or setgeopoint items
  -->
  <xsl:template name="action-attributes">
    <xsl:param name="binding"/>
    <xsl:param name="nodeset"/>
    <xsl:attribute name="name">
      <xsl:value-of select="normalize-space($nodeset)" />
    </xsl:attribute>
    <xsl:attribute name="data-type-xml">
      <xsl:call-template name="xml_type">
        <xsl:with-param name="nodeset" select="$nodeset"/>
      </xsl:call-template>
    </xsl:attribute>
    <xsl:attribute name="data-event">
      <xsl:value-of select="./@event"/>
    </xsl:attribute>
    <xsl:choose>
      <xsl:when test="local-name() = 'setvalue'">
        <xsl:attribute name="data-setvalue">
          <xsl:choose>
            <xsl:when test="./@value">
              <xsl:value-of select="./@value" />
            </xsl:when>
            <xsl:when test="string-length(.) > 0">
              <xsl:value-of select="concat('&quot;', ./text(), '&quot;')" />
            </xsl:when>
          </xsl:choose>
        </xsl:attribute>
      </xsl:when>
      <xsl:when test="local-name() = 'setgeopoint'">
        <xsl:attribute name="data-setgeopoint">
          <xsl:value-of select="true()" />
        </xsl:attribute>
      </xsl:when>
    </xsl:choose>
    <xsl:attribute name="type">
      <xsl:value-of select="'hidden'"/>
    </xsl:attribute>
    <xsl:if test="$openclinica = 1">
      <xsl:for-each select="$binding/@*[starts-with(name(), 'oc:') and not(substring-before(name(), 'Msg'))]" >
        <xsl:attribute name="{concat('data-oc-', local-name(.))}">
          <xsl:value-of select="normalize-space(.)" />
        </xsl:attribute>
      </xsl:for-each>
    </xsl:if>
  </xsl:template>


  <!--
      adds binding attributes to the context node, meant for <input>, <select>, <textarea>
  -->
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
    <xsl:if test="(string-length($binding/@required) &gt; 0) and not($binding/@required = 'false()') and not(local-name() = 'bind')">
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

  <xsl:template match="xf:select | xf:select1 | odk:rank | xf:trigger">
    <xsl:variable name="nodeset_used">
      <xsl:call-template name="nodeset_used" />
    </xsl:variable>
    <xsl:variable name="nodeset">
      <xsl:call-template name="nodeset_absolute">
        <xsl:with-param name="nodeset_u" select="$nodeset_used"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:variable name="binding" select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset_used] | /h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]" />
    <xsl:choose>
      <xsl:when test="( local-name() = 'select' or local-name() = 'select1' ) and contains(@appearance, 'minimal') or contains(@appearance, 'autocomplete') or contains(@appearance, 'search')">
        <xsl:call-template name="select-select">
          <xsl:with-param name="nodeset" select="$nodeset" />
          <xsl:with-param name="binding" select="$binding" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:call-template name="select-input">
          <xsl:with-param name="nodeset" select="$nodeset" />
          <xsl:with-param name="binding" select="$binding" />
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="xf:label | xf:hint | xf:bind/@jr:constraintMsg | xf:bind/@jr:requiredMsg | xf:bind/@*[starts-with(name(), 'oc:')]">
    <xsl:variable name="class">
      <xsl:choose>
        <xsl:when test="name() = 'jr:constraintMsg'">
          <xsl:value-of select="'or-constraint-msg'" />
        </xsl:when>
        <xsl:when test="local-name() = 'requiredMsg'">
          <xsl:value-of select="'or-required-msg'" />
        </xsl:when>
        <xsl:when test="local-name() = 'relevantMsg'">
          <xsl:value-of select="'or-relevant-msg'" />
        </xsl:when>
        <xsl:when test="local-name() = 'hint'">
          <xsl:value-of select="'or-hint'" />
        </xsl:when>
        <xsl:when test="local-name() = 'label' and local-name(..) != 'item' ">
          <xsl:value-of select="'question-label'"/>
        </xsl:when>
        <xsl:when test="local-name() = 'label' and local-name(..) = 'item' ">
          <xsl:value-of select="'option-label'"/>
        </xsl:when>
        <xsl:when test="$openclinica = 1 and starts-with(name(), 'oc:constraint') and string-length(local-name()) > 13 and substring(name(), string-length(name()) - string-length('Msg') +1) = 'Msg' " >
          <xsl:value-of select="concat('or-', substring-before(local-name(.), 'Msg'), '-msg')"/>
        </xsl:when>
      </xsl:choose>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="not(string(./@ref)) and ( string(.) or string(./xf:output/@value) ) and not(contains(.,'itext('))">
        <span lang="">
          <xsl:attribute name="class">
            <xsl:value-of select="concat($class, ' active')" />
          </xsl:attribute>
          <xsl:call-template name="text-content" />
        </span>
      </xsl:when>
      <xsl:otherwise>
        <xsl:variable name="ref">
          <xsl:choose>
            <xsl:when test="@ref">
              <xsl:value-of select="@ref" />
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="." />
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>

        <xsl:variable name="refid"
                      select="substring(substring-after($ref, 'itext('),2,string-length(substring-after($ref, 'itext('))-3)"/>
        <!--
            ** HUGE PERFORMANCE HOG! **
            <xsl:if test="not(/h:html/h:head/xf:model/xf:itext/xf:translation/xf:text[@id=$refid])">
                <xsl:message>ERROR: itext(id) found with non-existing id: "<xsl:value-of select="$refid"/>". Maybe itext(path/to/node) construct was used, which is not supported.</xsl:message>
            </xsl:if>
        -->
        <xsl:call-template name="translations">
          <xsl:with-param name="id" select="$refid"/>
          <xsl:with-param name="class" select="$class"/>
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="constraint-and-required-msg">
    <xsl:param name="binding"/>
    <xsl:if test="string-length($binding/@constraint) &gt; 0">
      <xsl:choose>
        <xsl:when test="$binding/@jr:constraintMsg">
          <xsl:apply-templates select="$binding/@jr:constraintMsg" />
        </xsl:when>
        <xsl:otherwise>
          <xsl:call-template name="default-constraint-msg"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
    <xsl:if test="(string-length($binding/@required) &gt; 0) and not($binding/@required = 'false()')">
      <xsl:choose>
        <xsl:when test="$binding/@jr:requiredMsg">
          <xsl:apply-templates select="$binding/@jr:requiredMsg" />
        </xsl:when>
        <xsl:otherwise>
          <xsl:call-template name="default-required-msg"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
    <xsl:if test="$openclinica = 1">
      <xsl:if test="(string-length($binding/@relevant) &gt; 0) and not($binding/@relevant = 'true()')">
        <xsl:choose>
          <xsl:when test="$binding/@oc:relevantMsg">
            <xsl:apply-templates select="$binding/@oc:relevantMsg" />
          </xsl:when>
          <xsl:otherwise>
            <xsl:call-template name="default-relevant-msg"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:if>
      <xsl:for-each select="$binding/@*[starts-with(name(), 'oc:constraint') and substring(name(), string-length(name()) - string-length('Msg') +1) = 'Msg' ]" >
        <xsl:apply-templates select="." />
      </xsl:for-each>
    </xsl:if>
  </xsl:template>

  <xsl:template name="default-constraint-msg">
    <span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span>
  </xsl:template>

  <xsl:template name="default-required-msg">
    <span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
  </xsl:template>

  <xsl:template name="default-relevant-msg">
    <span class="or-relevant-msg active" lang="" data-i18n="constraint.relevant">This value should be cleared</span>
  </xsl:template>

  <xsl:template match="xf:bind/@required">
    <xsl:if test="not(. = 'false()' or string-length(.) = 0)">
      <span class="required">*</span>
    </xsl:if>
  </xsl:template>

  <xsl:template match="xf:output">
    <span class="or-output">
      <xsl:variable name="itext"
                    select="substring(substring-after(@value, 'itext('),2,string-length(substring-after(@value, 'itext('))-3)"/>
      <xsl:attribute name="data-value">
        <!-- this is just a quick hack! Need a robust itext processor that can make a distinction
        between id and node and figure out which instance to take node from with multiple instances -->
        <xsl:choose>
          <xsl:when test="string-length($itext) &gt; 0" >
            <xsl:value-of select="$itext"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="@value"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:text><!-- avoids self-closing tags on empty elements --> </xsl:text>
    </span>
  </xsl:template>

  <xsl:template match="@kb:image-customization">
    <xsl:if test=".">
      <xsl:attribute name="data-image-customization">
        <xsl:value-of select="normalize-space(.)" />
      </xsl:attribute>
    </xsl:if>
  </xsl:template>

  <xsl:template match="@kb:flash">
    <xsl:if test=".">
      <xsl:attribute name="data-flash">
        <xsl:value-of select="normalize-space(.)" />
      </xsl:attribute>
    </xsl:if>
  </xsl:template>

  <xsl:template name="text-content">
    <xsl:if test="string-length(.) = 0">
      <xsl:text><!-- avoids self-closing tags on empty elements --> </xsl:text>
    </xsl:if>
    <xsl:apply-templates /><!-- call xf:output template if output is present -->
  </xsl:template>

  <xsl:template name="translations">
    <xsl:param name="id"/>
    <xsl:param name="class"/>
    <xsl:for-each select="/h:html/h:head/xf:model/xf:itext/xf:translation/xf:text[@id=$id]">
      <xsl:variable name="lang" select="ancestor::xf:translation/@lang"/>
      <xsl:variable name="active">
        <xsl:if test="string($lang) = string($current-lang)">active</xsl:if>
      </xsl:variable>
      <xsl:variable name="notext">
        <xsl:value-of select="string-length(./xf:value[@form='long' or @form='short' or not(@form)]) = 0" />
      </xsl:variable>
      <!-- text labels get priority -->
      <xsl:for-each select="./xf:value" >
        <xsl:if test="not(@form = 'image' or @form = 'video' or @form = 'audio' or @form='big-image' or @form='guidance')">
          <span>
            <xsl:attribute name="lang">
              <xsl:value-of select="$lang"/>
            </xsl:attribute>
            <xsl:if test="string($class) or @form or string($active)">
              <xsl:attribute name="class">
                <xsl:value-of select="concat($class, ' ')" />
                <xsl:if test="@form">
                  <xsl:value-of select="concat(' or-form-', @form, ' ')" />
                </xsl:if>
                <xsl:if test="@form = 'long' or (@form = 'short' and not(../node()/@form = 'long')) or not(@form) or @form = 'guidance'">
                  <xsl:value-of select="$active" />
                </xsl:if>
              </xsl:attribute>
            </xsl:if>
            <xsl:attribute name="data-itext-id">
              <xsl:value-of select="$id"/>
            </xsl:attribute>
            <xsl:call-template name="text-content" />
          </span>
        </xsl:if>
      </xsl:for-each>
      <!-- guidance is next -->
      <xsl:for-each select="./xf:value[@form = 'guidance']">
        <details>
          <xsl:attribute name="lang">
            <xsl:value-of select="$lang"/>
          </xsl:attribute>
          <xsl:if test="string($class) or @form or string($active)">
            <xsl:attribute name="class">
              <xsl:value-of select="concat($class, ' or-form-', @form, ' ', $active)" />
            </xsl:attribute>
          </xsl:if>
          <summary data-i18n="hint.guidance.details">more details</summary>
          <xsl:call-template name="text-content" />
        </details>
      </xsl:for-each>
      <!-- media labels in document order -->
      <xsl:for-each select="./xf:value[@form = 'image' or @form = 'video' or @form = 'audio' and not($class = 'or-hint')]" >
        <xsl:choose>
          <xsl:when test="@form = 'image'" >
            <!-- test if there is a sibling big-image -->
            <xsl:choose>
              <xsl:when test="../xf:value[@form = 'big-image']" >
                <a>
                  <xsl:attribute name="class">
                    <xsl:value-of select="'or-big-image'" />
                  </xsl:attribute>
                  <xsl:attribute name="href">
                    <xsl:value-of select="../xf:value[@form = 'big-image']"/>
                  </xsl:attribute>
                  <xsl:call-template name="image">
                    <xsl:with-param name="active" select="$active"/>
                    <xsl:with-param name="notext" select="$notext"/>
                    <xsl:with-param name="lang" select="$lang"/>
                  </xsl:call-template>
                </a>
              </xsl:when>
              <xsl:otherwise>
                <xsl:call-template name="image">
                  <xsl:with-param name="active" select="$active"/>
                  <xsl:with-param name="notext" select="$notext"/>
                  <xsl:with-param name="lang" select="$lang"/>
                  <xsl:with-param name="id" select="$id"/>
                </xsl:call-template>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <xsl:when test="@form = 'audio'">
            <audio controls="controls">
              <xsl:attribute name="lang">
                <xsl:value-of select="$lang"/>
              </xsl:attribute>
              <xsl:if test="string($active)">
                <xsl:attribute name="class">
                  <xsl:value-of select="$active" />
                </xsl:attribute>
              </xsl:if>
              <xsl:attribute name="src">
                <xsl:value-of select="." />
              </xsl:attribute>
              <xsl:attribute name="data-itext-id">
                <xsl:value-of select="$id"/>
              </xsl:attribute>
              <xsl:text>Your browser does not support HTML5 audio.</xsl:text>
            </audio>
          </xsl:when>
          <xsl:when test="@form = 'video'">
            <video controls="controls">
              <xsl:attribute name="lang">
                <xsl:value-of select="$lang"/>
              </xsl:attribute>
              <xsl:if test="string($active)">
                <xsl:attribute name="class">
                  <xsl:value-of select="$active" />
                </xsl:attribute>
              </xsl:if>
              <xsl:attribute name="src">
                <xsl:value-of select="." />
              </xsl:attribute>
              <xsl:attribute name="data-itext-id">
                <xsl:value-of select="$id"/>
              </xsl:attribute>
              <xsl:text>Your browser does not support HTML5 video.</xsl:text>
            </video>
          </xsl:when>
        </xsl:choose>
      </xsl:for-each>
    </xsl:for-each>
  </xsl:template>

  <xsl:template name="strip_namespace">
    <xsl:param name="string" />
    <xsl:choose>
      <xsl:when test="contains($string, ':')" >
        <!-- crude check, should be improved -->
        <xsl:value-of select="substring-after($string, ':')" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$string" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="languages">
    <xsl:for-each select="/h:html/h:head/xf:model/xf:itext/xf:translation" >
      <option>
        <xsl:attribute name="value">
          <xsl:value-of select="@lang"/>
        </xsl:attribute>
        <xsl:value-of select="@lang" />
      </option>
      <xsl:text> </xsl:text>
    </xsl:for-each>
  </xsl:template>

  <!-- future support for itext node parameters -->
  <xsl:template name="itext-helper">

  </xsl:template>

  <xsl:template name="node-path-helper">
    <xsl:param name="input-node"/>
    <xsl:choose>
      <xsl:when test="$input-node/@bind">
        <xsl:variable name="id" select="$input-node/@bind" />
        <xsl:value-of select="/h:html/h:head/xf:model/xf:bind[@id=$id]/@nodeset"/>
      </xsl:when>
      <xsl:when test="$input-node/@ref or $input-node/@nodeset">
        <xsl:variable name="path" select="normalize-space($input-node/@ref | $input-node/@nodeset)" />
        <xsl:if test="not(substring($path, 1, 1) = '/') and not(parent::h:body)" >
          <!-- path is relative, so we need context -->
          <!--<xsl:choose>-->
          <!-- should ancestor:: be replaced with parent:: ??? TEST -->
          <!-- <xsl:when test="parent::xf:repeat/@nodeset">
               <xsl:value-of select="concat(ancestor::xf:repeat/@nodeset, '/')" />
           </xsl:when>
           <xsl:when test="parent::xf:repeat/@ref">
               <xsl:value-of select="concat(ancestor::xf:repeat/@ref, '/')" />
           </xsl:when>
           <xsl:when test="parent::xf:group/@nodeset">
               <xsl:value-of select="concat(ancestor::xf:group/@nodeset, '/')" />
           </xsl:when>
           <xsl:when test="parent::xf:group/@ref">
               <xsl:value-of select="concat(ancestor::xf:group/@ref, '/')" />
           </xsl:when>-->
          <!-- and use top level instance node, if the ancestor is h:body -->
          <!--<xsl:when test="parent::h:body">-->
          <!-- start with the top level element of the instance, e.g. /data/ -->
          <!--    <xsl:value-of select="concat('/', local-name(//xf:instance/child::*[1]), '/')" />-->
          <!--<xsl:message>INFO: tried to add top level node of instance:<xsl:value-of select="local-name(//xf:instance/child::*[1])"/></xsl:message>-->
          <!--</xsl:when>-->
          <!--<xsl:otherwise>
              <xsl:message>ERROR: Could not determine context node for relative path.</xsl:message>
          </xsl:otherwise>
      </xsl:choose>-->
          <xsl:for-each select="ancestor::*">
            <!-- <xsl:if test="not(substring($path, 1, 1) = '/') and not(local-name() = 'body') ">-->

            <!--<xsl:message>ancestor: <xsl:value-of select="local-name()" /></xsl:message>-->
            <xsl:if test="(local-name() = 'repeat' or local-name() = 'group')">

              <!--substring(@nodeset, 1, 1) = '/' or substring(@ref, 1, 1) = '/'
                      )">-->
              <!--<xsl:for-each select="descendant::*">
                  <xsl:if test="local-name() = 'group' or local-name() = 'repeat'">-->
              <xsl:if test="string-length(@ref) &gt; 0 or string-length(@nodeset) &gt; 0">
                <xsl:value-of select="concat(@ref,@nodeset, '/')" />
              </xsl:if>
              <!--    </xsl:if>
              </xsl:for-each>-->
              <!-- not totally foolproof (will fail if nested group use both local and absolute paths) but probably okay, test this with multiple nested groups -->
            </xsl:if>
            <!--</xsl:if>-->
          </xsl:for-each>
        </xsl:if>
        <xsl:value-of select="$path"/>
      </xsl:when>
      <!-- if a group without @ref but with an immediate repeat child is used (ODK Build) -->
      <xsl:when test="local-name() = 'group' and $input-node/xf:repeat/@nodeset">
        <xsl:value-of select="$input-node/xf:repeat/@nodeset" />
      </xsl:when>
      <!--<xsl:otherwise>
          <xsl:message>ERROR: Could not determine node path for <xsl:value-of select="local-name($input-node)" /></xsl:message>
      </xsl:otherwise>-->
    </xsl:choose>
  </xsl:template>

  <!--<xsl:template name="one-step-back">
      <xsl:param name="path" />
      <xsl:param name="node" />
      <xsl:variable name="newpath">
          <xsl:choose>
              <xsl:when test="parent::xf:repeat/@nodeset">
                  <xsl:value-of select="concat(ancestor::xf:repeat/@nodeset, '/', $path)" />
              </xsl:when>
              <xsl:when test="parent::xf:repeat/@ref">
                  <xsl:value-of select="concat(ancestor::xf:repeat/@ref, '/', $path)" />
              </xsl:when>
              <xsl:when test="parent::xf:group/@nodeset">
                  <xsl:value-of select="concat(ancestor::xf:group/@nodeset, '/', $path)" />
              </xsl:when>
              <xsl:when test="parent::xf:group/@ref">
                  <xsl:value-of select="concat(ancestor::xf:group/@ref, '/', $path)" />
              </xsl:when>
              <xsl:otherwise>
                  strictly speaking, if the parent group or repeat doesn't have a ref/nodeset, we should go
                  one level higher. Not implemented here.
                  <xsl:message>ERROR: Could not determine context node for relative path.</xsl:message>
              </xsl:otherwise>
          <xsl:choose>
      </xsl:variable>
      <xsl:if test="not(substring($path, 1, 1) = '/') and not(parent::h:body)">
          <xsl:call-template name="one-step-back" >
              <xsl:with-param name="path" select="$newpath"/>
              <xsl:with-param name="node" select="parent::*"/>
          </xsl:call-template>
      </xsl:if>
      <xsl:value-of select="$newpath" />
  </xsl:template>-->

  <xsl:template name="image">
    <xsl:param name="active"/>
    <xsl:param name="notext" />
    <xsl:param name="lang"/>
    <xsl:param name="id"/>
    <!-- add empty span for option-labels that have no text, just an image, to support the new radio buttons and checkboxes -->
    <xsl:if test="$notext = 'true'" >
      <span>
        <xsl:attribute name="lang">
          <xsl:value-of select="$lang"/>
        </xsl:attribute>
        <xsl:attribute name="class">
          <xsl:value-of select="'option-label '"/>
          <xsl:if test="string($active)">
            <xsl:value-of select="$active"/>
          </xsl:if>
        </xsl:attribute>
        <xsl:text>
        </xsl:text>
      </span>
    </xsl:if>
    <img>
      <xsl:attribute name="lang">
        <xsl:value-of select="$lang"/>
      </xsl:attribute>
      <xsl:if test="string($active)">
        <xsl:attribute name="class">
          <xsl:value-of select="$active" />
        </xsl:attribute>
      </xsl:if>
      <xsl:attribute name="src">
        <xsl:value-of select="." />
      </xsl:attribute>
      <xsl:attribute name="data-itext-id">
        <xsl:value-of select="$id"/>
      </xsl:attribute>
      <xsl:attribute name="alt">image</xsl:attribute>
    </img>
  </xsl:template>

  <xsl:template name="nodeset_used">
    <xsl:choose>
      <!-- first the simplest case (for preload or calculated fields taken from bind elements) -->
      <xsl:when test="local-name() = 'bind'">
        <!--<xsl:choose>-->
        <!-- if nodeset value is relative -->
        <!--<xsl:when test="not(substring(./@nodeset, 1, 1) = '/')">-->
        <!-- start with the top level element of the instance, e.g. /data/ -->
        <!--    <xsl:value-of select="concat('/', local-name(//xf:instance/child::*[1]), '/')" />
        </xsl:when>
        <xsl:otherwise />
    </xsl:choose>-->
        <xsl:value-of select="./@nodeset"/>
      </xsl:when>
      <!-- then for input elements -->
      <xsl:otherwise>
        <xsl:variable name="intermediate">
          <xsl:choose>
            <xsl:when test="not(local-name() = 'setvalue' or local-name() = 'setgeopoint') and ( local-name(..) = 'select1' or local-name(..) = 'select' )">
              <xsl:call-template name="node-path-helper">
                <xsl:with-param name="input-node" select=".." />
              </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
              <xsl:call-template name="node-path-helper">
                <xsl:with-param name="input-node" select="." />
              </xsl:call-template>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <!-- now strip anything preceding a // which occurs e.g. in widgets.xml-->
        <!-- note that this goes only 1 level deep so is not reliable enough -->
        <xsl:choose>
          <xsl:when test="contains($intermediate, '//')">
            <xsl:value-of select="concat('/', substring-after($intermediate, '//'))"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="$intermediate"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="nodeset_absolute">
    <xsl:param name="nodeset_u"/>
    <xsl:variable name="nodeset_a">
      <xsl:choose>
        <xsl:when test="not(substring($nodeset_u, 1, 1) = '/')">
          <xsl:value-of select="concat('/', local-name(/h:html/h:head/xf:model/xf:instance/child::*[1]), '/', $nodeset_u)"/>
          <!--<xsl:message terminate="yes">ERROR: Could not determine absolute path/to/instance/node (terminated transformation), found: <xsl:value-of select="$nodeset" />.</xsl:message>-->
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="$nodeset_u" />
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:if test="not($nodeset_u = $nodeset_a)">
      <!--<xsl:message>INFO: changed relative nodeset: <xsl:value-of select="$nodeset_u"/> to: <xsl:value-of select="$nodeset_a" /></xsl:message>-->
    </xsl:if>
    <xsl:value-of select="$nodeset_a"/>
  </xsl:template>

  <xsl:template name="xml_type">
    <xsl:param name="nodeset" />
    <!--<xsl:param name="binding" />-->
    <xsl:variable name="xml_type">
      <!--<xsl:value-of select="$binding"/>-->
      <xsl:value-of select="/h:html/h:head/xf:model/xf:bind[@nodeset=$nodeset]/@type" />
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="string-length($xml_type) &lt; 1" >string</xsl:when>
      <xsl:otherwise>
        <xsl:call-template name="strip_namespace">
          <xsl:with-param name="string">
            <xsl:value-of select="$xml_type"/>
          </xsl:with-param>
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ONLY TO BE USED FOR INPUT ELEMENT TYPES -->
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
      <xsl:otherwise>
        <xsl:value-of select="$error"/>
        <xsl:message terminate="no">ERROR: Unsupported data type '<xsl:value-of select="$xml_type"/>' found.</xsl:message>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>
