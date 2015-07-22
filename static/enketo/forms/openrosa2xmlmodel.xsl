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
XSLT Stylesheet that transforms OpenRosa style (X)Forms instance to an xml instance that can be used
inside Enketo Smart Paper.
*****************************************************************************************************
-->
<xsl:stylesheet 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xf="http://www.w3.org/2002/xforms" 
    xmlns:h="http://www.w3.org/1999/xhtml"
    xmlns:ev="http://www.w3.org/2001/xml-events" 
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:jr="http://openrosa.org/javarosa" 
    version="1.0"
    >
    <xsl:output method="xml" indent="yes" omit-xml-declaration="yes" version="1.0" encoding="UTF-8" />

    <xsl:template match="/">
    	<root>
            <model>
        	   <xsl:apply-templates select="//xf:model/xf:instance" />
            </model>
        </root>
    </xsl:template>

    <xsl:template match="*">
        <xsl:element name="{local-name()}">
            <xsl:apply-templates select="node()|@*" />
            <!-- if there is no meta node in the primary instance, create one with an instanceID-->
            <xsl:if test="parent::xf:instance and parent::xf:instance = ../../../xf:model/xf:instance[1] and not(./xf:meta) and not(./jr:meta) and not(./meta)">
                <xsl:element name="meta">
                    <xsl:element name="instanceID" />
                </xsl:element>
            </xsl:if>
            <!-- if there is an instance/*/meta node but not an instanceID node, create it -->
            <xsl:if test="local-name() = 'meta' and ../../../xf:instance[1] and not(./xf:instanceID) and not(./jr:instanceID) and not(./instanceID)">
                <xsl:element name="instanceID" />
            </xsl:if>
        </xsl:element>
    </xsl:template>

    <xsl:template match="@*">
        <xsl:attribute name="{local-name()}" >
            <xsl:value-of select="." />
        </xsl:attribute>
    </xsl:template>

    <xsl:template match="comment()" />

</xsl:stylesheet>
