<?xml version="1.0" encoding="UTF-8"?>

<!--
 * Copyright 2013 Enketo LLC
 *
 * This file is part of enketo-xslt.
 *
 *  Enketo-xslt is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Enketo-xslt is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with enketo-xslt.  If not, see <http://www.gnu.org/licenses/>.
 -->
<!--
*****************************************************************************************************
XSLT Stylesheet that transforms OpenRosa style (X)Forms into valid HTMl5 forms
(exception: when non-IANA lang attributes are used the form will not validate (but that's not serious))
*****************************************************************************************************
-->

<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xf="http://www.w3.org/2002/xforms"
    xmlns:h="http://www.w3.org/1999/xhtml"
    xmlns:ev="http://www.w3.org/2001/xml-events"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:jr="http://openrosa.org/javarosa"
    xmlns:exsl="http://exslt.org/common"
    xmlns:str="http://exslt.org/strings"
    xmlns:dyn="http://exslt.org/dynamic"
    extension-element-prefixes="exsl str dyn"
    version="2.0"
    >

    <xsl:output method="xml" omit-xml-declaration="yes" encoding="UTF-8" indent="yes"/><!-- for xml: version="1.0" -->

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
                <!-- first language or empty if itext was not used -->
                <xsl:value-of select="h:html/h:head/xf:model/xf:itext/xf:translation[1]/@lang" />
            </xsl:otherwise>
        </xsl:choose>
    </xsl:variable>

    <xsl:template match="/">
        <xsl:if test="not(function-available('exsl:node-set'))">
            <xsl:comment>WARNING: exsl:node-set function is not available in this XSLT processor</xsl:comment>
        </xsl:if>
        <xsl:if test="not(function-available('str:replace'))">
            <xsl:comment>WARNING: str:replace function is not available in this XSLT processor</xsl:comment>
        </xsl:if>
        <xsl:if test="not(function-available('dyn:evaluate'))">
            <xsl:comment>WARNING: dyn:evaluate function is not available in this XSLT processor</xsl:comment>
        </xsl:if>
        <xsl:if test="not(function-available('str:tokenize'))">
            <xsl:comment>WARNING: str:tokenize function is not available in this XSLT processor</xsl:comment>
        </xsl:if>
        <xsl:for-each select="/h:html/h:head/xf:model/xf:bind">
            <xsl:if test="not(substring(./@nodeset, 1, 1) = '/')">
                <xsl:comment>WARNING: Found binding(s) with relative (= bad!) nodeset attribute <!--on element: <xsl:value-of select="./@nodeset" />--> (form may work correctly if relative nodesets were used consistently throughout xml form in bindings as well as body, otherwise it will certainly be messed up). </xsl:comment>
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
                    <xsl:attribute name="id">
                        <xsl:choose>
                            <xsl:when test="/h:html/h:head/xf:model/xf:instance[1]/child::node()/@id">
                                <xsl:value-of select="translate(/h:html/h:head/xf:model/xf:instance/child::node()/@id, ' ', '_' )" /><!-- not smart! -->
                            </xsl:when>
                            <xsl:when test="/h:html/h:head/xf:model/xf:instance/child::node()/@xmlns">
                                <xsl:value-of select="translate(/h:html/h:head/xf:model/xf:instance/child::node()/@xmlns, ' ', '_')" />
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
                            <xsl:value-of select="/h:html/h:head/xf:model/xf:submission/@method"/>
                        </xsl:attribute>
                    </xsl:if>
                    <xsl:if test="/h:html/h:head/xf:model/xf:submission/@base64RsaPublicKey">
                        <xsl:attribute name="data-base64RsaPublicKey">
                            <xsl:value-of select="/h:html/h:head/xf:model/xf:submission/@base64RsaPublicKey"/>
                        </xsl:attribute>
                    </xsl:if>
                    <xsl:text>&#10;</xsl:text>
                    <xsl:comment>This form was created by transforming a OpenRosa-flavored (X)Form using an XSLT sheet created by Enketo LLC.</xsl:comment>
                    <section class="form-logo">
                        <xsl:text> </xsl:text>
                    </section>
                    <h3 id="form-title">
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
                            <xsl:if test="not($translated = 'true')">
                                <xsl:attribute name="style">display:none;</xsl:attribute>
                            </xsl:if>
                            <xsl:attribute name="data-default-lang">
                                <xsl:value-of select="$default-lang" />
                            </xsl:attribute>
                            <xsl:call-template name="languages" />
                        </select>
                    </xsl:if>

                    <xsl:apply-templates />

                    <!-- create hidden input fields for preload items -->
                    <xsl:if test="/h:html/h:head/xf:model/xf:bind[@jr:preload]" >
                        <fieldset id="or-preload-items" style="display:none;">
                            <xsl:apply-templates select="/h:html/h:head/xf:model/xf:bind[@jr:preload]"/>
                        </fieldset>
                    </xsl:if>

                    <!-- create hidden input fields for calculated items -->
                    <!-- the template will exclude those that have an input field -->
                    <xsl:if test="/h:html/h:head/xf:model/xf:bind[@calculate]">
                        <fieldset id="or-calculated-items" style="display:none;">
                            <xsl:apply-templates select="/h:html/h:head/xf:model/xf:bind[@calculate]" />
                        </fieldset>
                    </xsl:if>
                    <xsl:if test="/h:html/h:body//xf:itemset">
                        <xsl:comment>WARNING: Itemset support is experimental. Make sure to test whether they do what you want.</xsl:comment>
                    </xsl:if>
                    <xsl:if test="//xf:submission">
                        <xsl:comment>ERROR: Submissions element(s) not supported yet.</xsl:comment>
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
            <xsl:if test="string($binding/@constraint)">
                <xsl:attribute name="data-constraint">
                    <xsl:value-of select="$binding/@constraint"/>
                </xsl:attribute>
            </xsl:if>
            <xsl:if test="string(./xf:label/@ref) or string (./xf:label)">
                <h4>
                    <xsl:apply-templates select="xf:label" />
                </h4>
            </xsl:if>

            <xsl:apply-templates select="*[not(self::xf:label or self::xf:hint)]"/>
            <xsl:text>
            </xsl:text>
        </section><xsl:comment>end of repeat fieldset with name <xsl:value-of select="@nodeset" /> </xsl:comment>
    </xsl:template>

    <xsl:template name="appearance">
        <xsl:if test="@appearance">
            <xsl:choose>
              <!-- str:tokenize browser support is poor (only Firefox) -->
              <xsl:when test="function-available('str:tokenize')">
                  <xsl:variable name="appearances" select="str:tokenize(@appearance)" />
                  <xsl:for-each select="exsl:node-set($appearances)">
                      <xsl:value-of select="concat('or-appearance-', normalize-space(translate(., $upper-case, $lower-case)), ' ')"/>
                  </xsl:for-each>
              </xsl:when>
              <xsl:otherwise>
                  <!-- so far in examples, @appearance has never had more than a single value, so it's safe just to use its value
                       directly.  We appened a `space` character to maintain consistency with the output of `str:tokenize`. -->
                  <xsl:value-of select="concat(concat('or-appearance-', @appearance), ' ')"/>
              </xsl:otherwise>
            </xsl:choose>
        </xsl:if>
    </xsl:template>

    <xsl:template match="xf:input | xf:upload | xf:item | xf:bind[@jr:preload] | xf:bind[@calculate]">
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
       
        <!-- if this is a bind element that also has an input, do nothing as it will be dealt with by the corresponding xf:input -->
        <!-- note that this test is not fully spec-compliant. It will work with XLS-form produced forms that have no relative nodes 
             and use the ref atribute only -->
        <xsl:if test="not( local-name() = 'bind' and ( 
            /h:html/h:body//xf:input[@ref=$nodeset] or 
            /h:html/h:body//xf:select[@ref=$nodeset] or 
            /h:html/h:body//xf:select1[@ref=$nodeset] ) )">
            <label>
                <xsl:attribute name="class">
                    <xsl:if test="(local-name() = 'input' or local-name() = 'upload') and not($binding/@readonly)">
                        <xsl:value-of select="'question '"/>
                    </xsl:if>
                    <xsl:if test="(local-name() = 'input' or local-name() = 'upload') and $binding/@readonly">
                        <xsl:value-of select="'note '"/>
                    </xsl:if>
                    <xsl:if test="(local-name() = 'input' or local-name() = 'upload') and $binding/@relevant">
                        <xsl:value-of select="'or-branch pre-init '"/>
                    </xsl:if>
                    <xsl:if test="local-name() = 'bind'">
                        <xsl:value-of select="'calculation '"/>
                    </xsl:if>
                    <!--<xsl:if test="local-name() = 'item'">
                        <xsl:value-of select="'clearfix '"/>
                    </xsl:if>-->
                    <xsl:if test="not(local-name() = 'item')">
                        <xsl:value-of select="'non-select '"/>
                    </xsl:if>
                    <xsl:call-template name="appearance" />
                </xsl:attribute>

                <xsl:if test="not(local-name() = 'item' or local-name() = 'bind')">
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
                        <xsl:when test="$binding/@type = 'string' and contains($appearance, 'multi-line') or contains($appearance, 'multiline') or contains($appearance, 'text-area') or contains($appearance, 'textarea')">
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
                    <xsl:call-template name="binding-attributes">
                        <xsl:with-param name="binding" select="$binding"/>
                        <xsl:with-param name="nodeset" select="$nodeset"/>
                        <xsl:with-param name="type" select="$type"/>
                    </xsl:call-template>
                    <!-- avoid self-closing textarea -->
                    <xsl:if test="$element='textarea'">
                        <xsl:text> </xsl:text>
                    </xsl:if>
                </xsl:element>
                <xsl:if test="local-name() = 'item'">
                    <xsl:apply-templates select="xf:label" />
                </xsl:if>

                <xsl:if test="not(local-name() = 'item' or local-name() = 'bind')">
                    <xsl:apply-templates select="$binding/@jr:constraintMsg" />
                    <xsl:if test="not($binding/@jr:constraintMsg or $binding/@readonly = 'true()')">
                        <xsl:call-template name="default-constraint-msg"/>
                    </xsl:if>
                    <xsl:if test="$binding/@required = 'true()' and not($binding/@readonly = 'true()')">
                        <xsl:call-template name="default-required-msg"/>
                    </xsl:if>
                </xsl:if>
            </label>
        </xsl:if>
    </xsl:template>

    <xsl:template match="xf:item" mode="select-option">
        <xsl:param name="tolerate-spaces" />
        <xsl:variable name="label_translations">
            <xsl:apply-templates select="xf:label" />
        </xsl:variable>
        <xsl:variable name="value">
            <xsl:value-of select="xf:value" />
            <xsl:if test="not($tolerate-spaces) and contains(xf:value, ' ')">
                <xsl:comment>ERROR: (Multi-)select item found with a value that contains spaces!</xsl:comment>
            </xsl:if>
            <xsl:if test="not(string(xf:value))">
                <xsl:comment>WARNING: Select item found without a value!</xsl:comment>
            </xsl:if>
        </xsl:variable>
        <option>
            <xsl:if test="2 &lt; 1"><!-- IF READONLY? -->
                <xsl:attribute name="disabled"></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="value">
                <xsl:choose>
                    <xsl:when test="string($value)">
                        <xsl:value-of select="$value" />
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:comment>ERROR: Could not determine value of select option.</xsl:comment>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:attribute>
            <!-- better to use default language if defined and otherwise span[1] -->
            <xsl:choose>
                <!-- TODO: IT WOULD BE MORE EFFICIENT TO EXTRACT THIS FROM exsl:node-set($label_translations) -->
                <xsl:when test="exsl:node-set($label_translations)/span[@lang=$default-lang]">
                    <xsl:value-of select="exsl:node-set($label_translations)/span[@lang=$default-lang] " />
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
        <xsl:choose>
            <xsl:when test="$binding">
                <label class="itemset-template">
                    <xsl:attribute name="data-items-path">
                        <xsl:value-of select="@nodeset"/>
                    </xsl:attribute>
                    <!--<xsl:value-of select="'__LABEL__'" />-->
                    <input>
                        <xsl:call-template name="binding-attributes">
                            <xsl:with-param name="binding" select="$binding"/>
                            <xsl:with-param name="nodeset" select="$nodeset"/>
                        </xsl:call-template>
                        <xsl:attribute name="value"></xsl:attribute>
                    </input>
                </label>
            </xsl:when>
            <xsl:otherwise>
                <option class="itemset-template" value="">
                    <xsl:attribute name="data-items-path">
                        <xsl:value-of select="@nodeset"/>
                    </xsl:attribute>
                    <xsl:value-of select="'...'"/>
                </option>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
    <xsl:template match="xf:itemset" mode="labels">
        <xsl:variable name="value-ref" select="./xf:value/@ref" />
        <xsl:variable name="label-ref" select="./xf:label/@ref" />
        <xsl:variable name="iwq" select="substring-before(substring-after(@nodeset, 'instance('),')/')" />
        <xsl:variable name="instance-path" select="str:replace(substring-after(@nodeset, ')'), '/', '/xf:')" />
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
        <xsl:variable name="type">
           <xsl:choose>
               <xsl:when test="local-name() = 'select'">select_multiple</xsl:when>
               <xsl:otherwise>select_one</xsl:otherwise>
           </xsl:choose>
        </xsl:variable>   
        <xsl:variable name="options">
            <xsl:apply-templates select="xf:item" mode="select-option">
                <xsl:with-param name="tolerate-spaces" select="$type = 'select_one'" />
            </xsl:apply-templates>
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
            <xsl:apply-templates select="xf:label" />
            <xsl:apply-templates select="$binding/@required"/>
            <xsl:apply-templates select="xf:hint" />
            <select>
                <xsl:call-template name="binding-attributes">
                    <xsl:with-param name="nodeset" select="$nodeset" />
                    <xsl:with-param name="binding" select="$binding" />
                    <xsl:with-param name="type" select="$type" />
                </xsl:call-template> 
                <xsl:choose>
                    <xsl:when test="not(./xf:itemset)">
                        <option value="">...</option>
                        <xsl:for-each select="exsl:node-set($options)/option">
                            <xsl:copy-of select="."/>
                        </xsl:for-each>
                    </xsl:when>
                    <xsl:otherwise>
                        <!--<xsl:attribute name="data-itemset"/>-->
                        <xsl:apply-templates select="xf:itemset" mode="templates"/>
                    </xsl:otherwise>
                </xsl:choose>
            </select>            
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
            <xsl:apply-templates select="$binding/@jr:constraintMsg" />
            <xsl:if test="not($binding/@jr:constraintMsg or $binding/@readonly = 'true()')">
                <xsl:call-template name="default-constraint-msg"/>
            </xsl:if>
            <xsl:if test="$binding/@required = 'true()' and not($binding/@readonly = 'true()')">
                <xsl:call-template name="default-required-msg"/>
            </xsl:if>
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
                <xsl:if test="not($binding/@readonly = 'true()')">
                    <xsl:value-of select="'question '"/>
                </xsl:if>
                <xsl:if test="$binding/@readonly = 'true()' ">
                    <xsl:value-of select="'note '"/>
                </xsl:if>
                <xsl:if test="$binding/@relevant">
                    <xsl:value-of select="'or-branch pre-init '"/>
                </xsl:if>
                <xsl:if test="@appearance">
                    <xsl:call-template name="appearance" />
                </xsl:if>
            </xsl:attribute>
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
                <div class="option-wrapper">
                    <xsl:choose>
                        <xsl:when test="local-name() = 'trigger'">        
                            <label>
                                <input value="OK">
                                    <xsl:call-template name="binding-attributes">
                                        <xsl:with-param name="binding" select="$binding"/>
                                        <xsl:with-param name="nodeset" select="$nodeset"/>
                                        <xsl:with-param name="type" select="select_one"/>
                                    </xsl:call-template>
                                    <!-- override type that was just set, somewhat bad -->
                                    <xsl:attribute name="type">
                                        <xsl:value-of select="'radio'"/>
                                    </xsl:attribute>
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
            <xsl:apply-templates select="$binding/@jr:constraintMsg" />
            <xsl:if test="not($binding/@jr:constraintMsg or $binding/@readonly = 'true()')">
                <xsl:call-template name="default-constraint-msg"/>
            </xsl:if>
            <xsl:if test="$binding/@required = 'true()' and not($binding/@readonly = 'true()')">
                <xsl:call-template name="default-required-msg"/>
            </xsl:if>
        </fieldset>
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
            <xsl:otherwise>
                <xsl:attribute name="type">
                    <xsl:value-of select="$html-input-type"/>
                </xsl:attribute>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:attribute name="name">
            <xsl:value-of select="$nodeset" />
        </xsl:attribute>
        <xsl:if test="$html-input-type = 'radio'">
            <xsl:attribute name="data-name">
                <xsl:value-of select="$nodeset" />
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="local-name() = 'item'">
            <xsl:attribute name="value">
                <xsl:value-of select="./xf:value"/>
            </xsl:attribute>
        </xsl:if>
        <xsl:if test="($binding/@required = 'true()') and (not(local-name() = 'bind'))">
            <xsl:attribute name="required">required</xsl:attribute>
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
            <xsl:choose>
                <xsl:when test="not( $binding/@jr:preload = 'patient' )" >
                    <xsl:attribute name="data-preload">
                        <xsl:value-of select="./@jr:preload"/>
                    </xsl:attribute>
                    <xsl:attribute name="data-preload-params">
                        <xsl:value-of select="./@jr:preloadParams"/>
                    </xsl:attribute>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:comment>NO SUPPORT: Patient preload item is not supported (ignored).</xsl:comment>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:if>
        <xsl:attribute name="data-type-xml">
            <xsl:value-of select="$xml-type"/>
        </xsl:attribute>
        <xsl:if test="$xml-type = 'decimal'">
            <xsl:attribute name="step">any</xsl:attribute>
        </xsl:if>
        <xsl:if test="$binding/@readonly = 'true()' and not($html-input-type = 'hidden')" >
            <xsl:attribute name="readonly">readonly</xsl:attribute>
        </xsl:if>
        <xsl:if test="$html-input-type = 'file'">
            <xsl:if test="@mediatype">
                <xsl:attribute name="accept">
                    <xsl:value-of select="@mediatype" />
                    <!-- image/*, video/* or audio/* -->
               </xsl:attribute>
            </xsl:if>
        </xsl:if>
        <!--
            <xsl:if test="$html_type = 'image'" >
            <xsl:attribute name="alt">image</xsl:attribute>
            </xsl:if>
        -->
    </xsl:template>

    
    <xsl:template match="xf:select | xf:select1 | xf:trigger">
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
            <xsl:when test="contains(@appearance, 'minimal') or contains(@appearance, 'autocomplete')">
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
    

    <xsl:template match="xf:label | xf:hint | xf:bind/@jr:constraintMsg">
        <xsl:variable name="class">
            <xsl:if test="local-name() = 'constraintMsg'">
                <xsl:value-of select="'or-constraint-msg'" />
            </xsl:if>
            <xsl:if test="local-name() = 'hint'">
                <xsl:value-of select="'or-hint'" />
            </xsl:if>
            <xsl:if test="local-name() = 'label' and not(local-name(..) = 'item')">
                <xsl:value-of select="'question-label'"/>
            </xsl:if>
             <xsl:if test="local-name() = 'label' and local-name(..) = 'item' ">
                <xsl:value-of select="'option-label'"/>
            </xsl:if>
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
                    <xsl:comment>ERROR: itext(id) found with non-existing id: "<xsl:value-of select="$refid"/>". Maybe itext(path/to/node) construct was used, which is not supported.</xsl:comment>
                </xsl:if>
            -->
                <xsl:call-template name="translations">
                    <xsl:with-param name="id" select="$refid"/>
                    <xsl:with-param name="class" select="$class"/>
                </xsl:call-template>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="default-constraint-msg">
        <span class="or-constraint-msg active" lang="" data-i18n="constraint.invalid">Value not allowed</span>
    </xsl:template>

    <xsl:template name="default-required-msg">
        <span class="or-required-msg active" lang="" data-i18n="constraint.required">This field is required</span>
    </xsl:template>

    <xsl:template match="xf:bind/@required">
        <xsl:if test=". = 'true()'">
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
                    <xsl:when test="string-length($itext) > 0" >
                        <xsl:value-of select="$itext"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="@value"/>
                    </xsl:otherwise>
                </xsl:choose>    
            </xsl:attribute>
            <xsl:text><!-- avoids self-closing tags on empty elements -->
            </xsl:text>
        </span>
    </xsl:template>

    <xsl:template name="text-content">
        <xsl:if test="string-length(.) = 0">
            <xsl:text><!-- avoids self-closing tags on empty elements -->
            </xsl:text>
        </xsl:if>

        <!-- calling xsl:apply-templates does not create any output text for
             constraintMsgs in Firefox.  It seems safe to assume that there
             won't be any extra stuff that needs processing within these
             constraintMsg values, so we can just output the string content
             directly. -->
        <xsl:if test="name() = 'jr:constraintMsg'">
            <xsl:value-of select="string(.)"/>
        </xsl:if>
        <xsl:if test="name() != 'jr:constraintMsg'">
            <xsl:apply-templates /><!-- call xf:output template if output is present -->
        </xsl:if>
    </xsl:template>

    <xsl:template name="translations">
        <xsl:param name="id"/>
        <xsl:param name="class"/>        
        <xsl:for-each select="/h:html/h:head/xf:model/xf:itext/xf:translation/xf:text[@id=$id]">
            <xsl:variable name="lang" select="ancestor::xf:translation/@lang"/>
            <xsl:variable name="active">
                <xsl:if test="string($lang) = string($default-lang)">active</xsl:if>
            </xsl:variable>
            <xsl:variable name="notext">
                <xsl:value-of select="string-length(./xf:value[@form='long' or @form='short' or not(@form)]) = 0" /> 
            </xsl:variable>
            <!-- text labels get priority -->   
            <xsl:for-each select="./xf:value" >
                <xsl:if test="not(@form = 'image' or @form = 'video' or @form = 'audio')">
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
                                <xsl:if test="@form = 'long' or (@form = 'short' and not(../node()/@form = 'long')) or not(@form) or @form = 'print'">
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
            <!-- media labels in document order -->
            <xsl:for-each select="./xf:value[@form = 'image' or @form = 'video' or @form = 'audio' and not($class = 'or-hint')]" >
                <xsl:choose>
                    <xsl:when test="@form = 'image'" >
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
                            <xsl:attribute name="alt">image</xsl:attribute>
                        </img>
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
                <xsl:variable name="path" select="$input-node/@ref | $input-node/@nodeset" />
                <xsl:variable name="inputname" select="local-name()"/>
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
                            <!--<xsl:comment>INFO: tried to add top level node of instance:<xsl:value-of select="local-name(//xf:instance/child::*[1])"/></xsl:comment>-->
                        <!--</xsl:when>-->
                        <!--<xsl:otherwise>
                            <xsl:comment>ERROR: Could not determine context node for relative path.</xsl:comment>
                        </xsl:otherwise>
                    </xsl:choose>-->
                    <xsl:for-each select="ancestor::*">
                       <!-- <xsl:if test="not(substring($path, 1, 1) = '/') and not(local-name() = 'body') ">-->
                       
                        <!--<xsl:comment>ancestor: <xsl:value-of select="local-name()" /></xsl:comment>-->
                        <xsl:if test="(local-name() = 'repeat' or local-name() = 'group')">
                                
                                <!--substring(@nodeset, 1, 1) = '/' or substring(@ref, 1, 1) = '/' 
                                        )">-->
                            <!--<xsl:for-each select="descendant::*">
                                <xsl:if test="local-name() = 'group' or local-name() = 'repeat'">-->
                                <xsl:if test="string-length(@ref)>0 or string-length(@nodeset)>0">
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
            <!--<xsl:otherwise>
                <xsl:comment>ERROR: Could not determine node path for <xsl:value-of select="local-name($input-node)" /></xsl:comment>
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
                    <xsl:comment>ERROR: Could not determine context node for relative path.</xsl:comment>
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
                        <xsl:when test="local-name(..) = 'select1' or local-name(..) = 'select'">
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
            <!--<xsl:comment>ERROR: Could not determine absolute path/to/instance/node (terminated transformation), found: <xsl:value-of select="$nodeset" />.</xsl:comment>-->
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$nodeset_u" />
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:if test="not($nodeset_u = $nodeset_a)">
            <!--<xsl:comment>INFO: changed relative nodeset: <xsl:value-of select="$nodeset_u"/> to: <xsl:value-of select="$nodeset_a" /></xsl:comment>-->
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
            <xsl:when test="$xml_type = 'dateTime'">datetime</xsl:when>
            <xsl:when test="$xml_type = 'date'">date</xsl:when>
            <!-- note, it may not actually be possible to support 'file' with offline storage -->
            <xsl:when test="$xml_type = 'binary'">file</xsl:when>
            <xsl:when test="$xml_type = 'time'">time</xsl:when>
            <xsl:when
                test="$xml_type = 'decimal' or $xml_type = 'float' or $xml_type = 'double' or $xml_type = 'int' or $xml_type = 'integer'"
                >number</xsl:when>
            <xsl:when test="$xml_type = 'string'">text</xsl:when>
            <!-- temporary -->
            <xsl:when test="$xml_type = 'barcode' or $xml_type = 'geopoint' or $xml_type = 'geotrace' or $xml_type = 'geoshape'" >
                <xsl:value-of select="string('text')" />
            </xsl:when>
            <!-- ********* -->
            <xsl:otherwise>
                <xsl:value-of select="$error"/>
                <xsl:comment>ERROR: Unsupported data type '<xsl:value-of select="$xml_type"/>' found.</xsl:comment>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>
