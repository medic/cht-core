/**
 * Utility functions for Kujua
 */

var jsDump = require('jsDump'),
    settings = require('settings/root'),
    smsforms = require('views/lib/smsforms'),
    _ = require('underscore')._;

exports.strings = {
    reported_date: {
        en: 'Reported Date',
        fr: 'Date envoyé'
    },
    "related_entities.clinic.contact.name": {
        en: "Name",
        fr: "Name"
    },
    "related_entities.clinic.parent.name": {
        en: "Health Center",
        fr: "Health Center"
    },
    "related_entities.clinic.parent.parent.name": {
        en: "District",
        fr: "District"
    },
    "related_entities.clinic.name": {
        en: "Clinic",
        fr: "Clinic"
    },
    from: {
        en: 'From',
        fr: 'Envoyé par'
    },
    sent_timestamp: {
        en: 'Sent Timestamp',
        fr: 'Date envoyé'
    }
};

var logger = exports.logger = {
    levels: {silent:0, error:1, info:2, debug:3},
    log: function(obj) {
        if (typeof log !== 'undefined')
            log(jsDump.parse(obj));
        if (typeof console !== 'undefined')
            console.log(obj);
    },
    silent: function (obj) {},
    error: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['error']) {
            this.log(obj);
        }
    },
    info: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['info']) {
            this.log(obj);
        }
    },
    debug: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['debug']) {
            this.log(obj);
        }
    }
};

var entityTable = {
//  34: "&quot;",       // Quotation mark. Not required
    38: "&amp;",        // Ampersand. Applied before everything else in the application
    60: "&lt;",     // Less-than sign
    62: "&gt;",     // Greater-than sign
//  63: "&#63;",        // Question mark
//  111: "&#111;",      // Latin small letter o
    160: "&nbsp;",      // Non-breaking space
    161: "&iexcl;",     // Inverted exclamation mark
    162: "&cent;",      // Cent sign
    163: "&pound;",     // Pound sign
    164: "&curren;",    // Currency sign
    165: "&yen;",       // Yen sign
    166: "&brvbar;",    // Broken vertical bar
    167: "&sect;",      // Section sign
    168: "&uml;",       // Diaeresis
    169: "&copy;",      // Copyright sign
    170: "&ordf;",      // Feminine ordinal indicator
    171: "&laquo;",     // Left-pointing double angle quotation mark
    172: "&not;",       // Not sign
    173: "&shy;",       // Soft hyphen
    174: "&reg;",       // Registered sign
    175: "&macr;",      // Macron
    176: "&deg;",       // Degree sign
    177: "&plusmn;",    // Plus-minus sign
    178: "&sup2;",      // Superscript two
    179: "&sup3;",      // Superscript three
    180: "&acute;",     // Acute accent
    181: "&micro;",     // Micro sign
    182: "&para;",      // Pilcrow sign
    183: "&middot;",    // Middle dot
    184: "&cedil;",     // Cedilla
    185: "&sup1;",      // Superscript one
    186: "&ordm;",      // Masculine ordinal indicator
    187: "&raquo;",     // Right-pointing double angle quotation mark
    188: "&frac14;",    // Vulgar fraction one-quarter
    189: "&frac12;",    // Vulgar fraction one-half
    190: "&frac34;",    // Vulgar fraction three-quarters
    191: "&iquest;",    // Inverted question mark
    192: "&Agrave;",    // A with grave
    193: "&Aacute;",    // A with acute
    194: "&Acirc;",     // A with circumflex
    195: "&Atilde;",    // A with tilde
    196: "&Auml;",      // A with diaeresis
    197: "&Aring;",     // A with ring above
    198: "&AElig;",     // AE
    199: "&Ccedil;",    // C with cedilla
    200: "&Egrave;",    // E with grave
    201: "&Eacute;",    // E with acute
    202: "&Ecirc;",     // E with circumflex
    203: "&Euml;",      // E with diaeresis
    204: "&Igrave;",    // I with grave
    205: "&Iacute;",    // I with acute
    206: "&Icirc;",     // I with circumflex
    207: "&Iuml;",      // I with diaeresis
    208: "&ETH;",       // Eth
    209: "&Ntilde;",    // N with tilde
    210: "&Ograve;",    // O with grave
    211: "&Oacute;",    // O with acute
    212: "&Ocirc;",     // O with circumflex
    213: "&Otilde;",    // O with tilde
    214: "&Ouml;",      // O with diaeresis
    215: "&times;",     // Multiplication sign
    216: "&Oslash;",    // O with stroke
    217: "&Ugrave;",    // U with grave
    218: "&Uacute;",    // U with acute
    219: "&Ucirc;",     // U with circumflex
    220: "&Uuml;",      // U with diaeresis
    221: "&Yacute;",    // Y with acute
    222: "&THORN;",     // Thorn
    223: "&szlig;",     // Sharp s. Also known as ess-zed
    224: "&agrave;",    // a with grave
    225: "&aacute;",    // a with acute
    226: "&acirc;",     // a with circumflex
    227: "&atilde;",    // a with tilde
    228: "&auml;",      // a with diaeresis
    229: "&aring;",     // a with ring above
    230: "&aelig;",     // ae. Also known as ligature ae
    231: "&ccedil;",    // c with cedilla
    232: "&egrave;",    // e with grave
    233: "&eacute;",    // e with acute
    234: "&ecirc;",     // e with circumflex
    235: "&euml;",      // e with diaeresis
    236: "&igrave;",    // i with grave
    237: "&iacute;",    // i with acute
    238: "&icirc;",     // i with circumflex
    239: "&iuml;",      // i with diaeresis
    240: "&eth;",       // eth
    241: "&ntilde;",    // n with tilde
    242: "&ograve;",    // o with grave
    243: "&oacute;",    // o with acute
    244: "&ocirc;",     // o with circumflex
    245: "&otilde;",    // o with tilde
    246: "&ouml;",      // o with diaeresis
    247: "&divide;",    // Division sign
    248: "&oslash;",    // o with stroke. Also known as o with slash
    249: "&ugrave;",    // u with grave
    250: "&uacute;",    // u with acute
    251: "&ucirc;",     // u with circumflex
    252: "&uuml;",      // u with diaeresis
    253: "&yacute;",    // y with acute
    254: "&thorn;",     // thorn
    255: "&yuml;",      // y with diaeresis
    264: "&#264;",      // Latin capital letter C with circumflex
    265: "&#265;",      // Latin small letter c with circumflex
    338: "&OElig;",     // Latin capital ligature OE
    339: "&oelig;",     // Latin small ligature oe
    352: "&Scaron;",    // Latin capital letter S with caron
    353: "&scaron;",    // Latin small letter s with caron
    372: "&#372;",      // Latin capital letter W with circumflex
    373: "&#373;",      // Latin small letter w with circumflex
    374: "&#374;",      // Latin capital letter Y with circumflex
    375: "&#375;",      // Latin small letter y with circumflex
    376: "&Yuml;",      // Latin capital letter Y with diaeresis
    402: "&fnof;",      // Latin small f with hook, function, florin
    710: "&circ;",      // Modifier letter circumflex accent
    732: "&tilde;",     // Small tilde
    913: "&Alpha;",     // Alpha
    914: "&Beta;",      // Beta
    915: "&Gamma;",     // Gamma
    916: "&Delta;",     // Delta
    917: "&Epsilon;",   // Epsilon
    918: "&Zeta;",      // Zeta
    919: "&Eta;",       // Eta
    920: "&Theta;",     // Theta
    921: "&Iota;",      // Iota
    922: "&Kappa;",     // Kappa
    923: "&Lambda;",    // Lambda
    924: "&Mu;",        // Mu
    925: "&Nu;",        // Nu
    926: "&Xi;",        // Xi
    927: "&Omicron;",   // Omicron
    928: "&Pi;",        // Pi
    929: "&Rho;",       // Rho
    931: "&Sigma;",     // Sigma
    932: "&Tau;",       // Tau
    933: "&Upsilon;",   // Upsilon
    934: "&Phi;",       // Phi
    935: "&Chi;",       // Chi
    936: "&Psi;",       // Psi
    937: "&Omega;",     // Omega
    945: "&alpha;",     // alpha
    946: "&beta;",      // beta
    947: "&gamma;",     // gamma
    948: "&delta;",     // delta
    949: "&epsilon;",   // epsilon
    950: "&zeta;",      // zeta
    951: "&eta;",       // eta
    952: "&theta;",     // theta
    953: "&iota;",      // iota
    954: "&kappa;",     // kappa
    955: "&lambda;",    // lambda
    956: "&mu;",        // mu
    957: "&nu;",        // nu
    958: "&xi;",        // xi
    959: "&omicron;",   // omicron
    960: "&pi;",        // pi
    961: "&rho;",       // rho
    962: "&sigmaf;",    // sigmaf
    963: "&sigma;",     // sigma
    964: "&tau;",       // tau
    965: "&upsilon;",   // upsilon
    966: "&phi;",       // phi
    967: "&chi;",       // chi
    968: "&psi;",       // psi
    969: "&omega;",     // omega
    977: "&thetasym;",  // Theta symbol
    978: "&upsih;",     // Greek upsilon with hook symbol
    982: "&piv;",       // Pi symbol
    8194: "&ensp;",     // En space
    8195: "&emsp;",     // Em space
    8201: "&thinsp;",   // Thin space
    8204: "&zwnj;",     // Zero width non-joiner
    8205: "&zwj;",      // Zero width joiner
    8206: "&lrm;",      // Left-to-right mark
    8207: "&rlm;",      // Right-to-left mark
    8211: "&ndash;",    // En dash
    8212: "&mdash;",    // Em dash
    8216: "&lsquo;",    // Left single quotation mark
    8217: "&rsquo;",    // Right single quotation mark
    8218: "&sbquo;",    // Single low-9 quotation mark
    8220: "&ldquo;",    // Left double quotation mark
    8221: "&rdquo;",    // Right double quotation mark
    8222: "&bdquo;",    // Double low-9 quotation mark
    8224: "&dagger;",   // Dagger
    8225: "&Dagger;",   // Double dagger
    8226: "&bull;",     // Bullet
    8230: "&hellip;",   // Horizontal ellipsis
    8240: "&permil;",   // Per mille sign
    8242: "&prime;",    // Prime
    8243: "&Prime;",    // Double Prime
    8249: "&lsaquo;",   // Single left-pointing angle quotation
    8250: "&rsaquo;",   // Single right-pointing angle quotation
    8254: "&oline;",    // Overline
    8260: "&frasl;",    // Fraction Slash
    8364: "&euro;",     // Euro sign
    8472: "&weierp;",   // Script capital
    8465: "&image;",    // Blackletter capital I
    8476: "&real;",     // Blackletter capital R
    8482: "&trade;",    // Trade mark sign
    8501: "&alefsym;",  // Alef symbol
    8592: "&larr;",     // Leftward arrow
    8593: "&uarr;",     // Upward arrow
    8594: "&rarr;",     // Rightward arrow
    8595: "&darr;",     // Downward arrow
    8596: "&harr;",     // Left right arrow
    8629: "&crarr;",    // Downward arrow with corner leftward. Also known as carriage return
    8656: "&lArr;",     // Leftward double arrow. ISO 10646 does not say that lArr is the same as the 'is implied by' arrow but also does not have any other character for that function. So ? lArr can be used for 'is implied by' as ISOtech suggests
    8657: "&uArr;",     // Upward double arrow
    8658: "&rArr;",     // Rightward double arrow. ISO 10646 does not say this is the 'implies' character but does not have another character with this function so ? rArr can be used for 'implies' as ISOtech suggests
    8659: "&dArr;",     // Downward double arrow
    8660: "&hArr;",     // Left-right double arrow
    // Mathematical Operators
    8704: "&forall;",   // For all
    8706: "&part;",     // Partial differential
    8707: "&exist;",    // There exists
    8709: "&empty;",    // Empty set. Also known as null set and diameter
    8711: "&nabla;",    // Nabla. Also known as backward difference
    8712: "&isin;",     // Element of
    8713: "&notin;",    // Not an element of
    8715: "&ni;",       // Contains as member
    8719: "&prod;",     // N-ary product. Also known as product sign. Prod is not the same character as U+03A0 'greek capital letter pi' though the same glyph might be used for both
    8721: "&sum;",      // N-ary summation. Sum is not the same character as U+03A3 'greek capital letter sigma' though the same glyph might be used for both
    8722: "&minus;",    // Minus sign
    8727: "&lowast;",   // Asterisk operator
    8729: "&#8729;",    // Bullet operator
    8730: "&radic;",    // Square root. Also known as radical sign
    8733: "&prop;",     // Proportional to
    8734: "&infin;",    // Infinity
    8736: "&ang;",      // Angle
    8743: "&and;",      // Logical and. Also known as wedge
    8744: "&or;",       // Logical or. Also known as vee
    8745: "&cap;",      // Intersection. Also known as cap
    8746: "&cup;",      // Union. Also known as cup
    8747: "&int;",      // Integral
    8756: "&there4;",   // Therefore
    8764: "&sim;",      // tilde operator. Also known as varies with and similar to. The tilde operator is not the same character as the tilde, U+007E, although the same glyph might be used to represent both
    8773: "&cong;",     // Approximately equal to
    8776: "&asymp;",    // Almost equal to. Also known as asymptotic to
    8800: "&ne;",       // Not equal to
    8801: "&equiv;",    // Identical to
    8804: "&le;",       // Less-than or equal to
    8805: "&ge;",       // Greater-than or equal to
    8834: "&sub;",      // Subset of
    8835: "&sup;",      // Superset of. Note that nsup, 'not a superset of, U+2283' is not covered by the Symbol font encoding and is not included.
    8836: "&nsub;",     // Not a subset of
    8838: "&sube;",     // Subset of or equal to
    8839: "&supe;",     // Superset of or equal to
    8853: "&oplus;",    // Circled plus. Also known as direct sum
    8855: "&otimes;",   // Circled times. Also known as vector product
    8869: "&perp;",     // Up tack. Also known as orthogonal to and perpendicular
    8901: "&sdot;",     // Dot operator. The dot operator is not the same character as U+00B7 middle dot
    // Miscellaneous Technical
    8968: "&lceil;",    // Left ceiling. Also known as an APL upstile
    8969: "&rceil;",    // Right ceiling
    8970: "&lfloor;",   // left floor. Also known as APL downstile
    8971: "&rfloor;",   // Right floor
    9001: "&lang;",     // Left-pointing angle bracket. Also known as bra. Lang is not the same character as U+003C 'less than'or U+2039 'single left-pointing angle quotation mark'
    9002: "&rang;",     // Right-pointing angle bracket. Also known as ket. Rang is not the same character as U+003E 'greater than' or U+203A 'single right-pointing angle quotation mark'
    // Geometric Shapes
    9642: "&#9642;",    // Black small square
    9643: "&#9643;",    // White small square
    9674: "&loz;",      // Lozenge
    // Miscellaneous Symbols
    9702: "&#9702;",    // White bullet
    9824: "&spades;",   // Black (filled) spade suit
    9827: "&clubs;",    // Black (filled) club suit. Also known as shamrock
    9829: "&hearts;",   // Black (filled) heart suit. Also known as shamrock
    9830: "&diams;"     // Black (filled) diamond suit
}

// return string with encoded htmlEntities
var htmlEntities = function(s) {
    if (typeof s !== 'string') {return s;}
    var ret = [];
    for (var i=0; i<s.length; i++) {
        var ord = s.charCodeAt(i);
        if (!(ord in entityTable)) {
            ret.push(s[i]);
        } else {
            ret.push(entityTable[ord]);
        }
    }
    return ret.join('');
}

 //utf8 to 1251 converter (1 byte format, RU/EN support only + any other symbols) by drgluck

function utf8_decode (aa) {
    var bb = '', c = 0;
    for (var i = 0; i < aa.length; i++) {
        c = aa.charCodeAt(i);
        if (c > 127) {
            if (c > 1024) {
                if (c == 1025) {
                    c = 1016;
                } else if (c == 1105) {
                    c = 1032;
                }
                bb += String.fromCharCode(c - 848);
            }
        } else {
            bb += aa.charAt(i);
        }
    }
    return bb;
}

function unicodeToWin1251(s) {
    var codepointMap = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29, 30: 30, 31: 31, 32: 32, 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126, 127: 127, 1027: 129, 8225: 135, 1046: 198, 8222: 132, 1047: 199, 1168: 165, 1048: 200, 1113: 154, 1049: 201, 1045: 197, 1050: 202, 1028: 170, 160: 160, 1040: 192, 1051: 203, 164: 164, 166: 166, 167: 167, 169: 169, 171: 171, 172: 172, 173: 173, 174: 174, 1053: 205, 176: 176, 177: 177, 1114: 156, 181: 181, 182: 182, 183: 183, 8221: 148, 187: 187, 1029: 189, 1056: 208, 1057: 209, 1058: 210, 8364: 136, 1112: 188, 1115: 158, 1059: 211, 1060: 212, 1030: 178, 1061: 213, 1062: 214, 1063: 215, 1116: 157, 1064: 216, 1065: 217, 1031: 175, 1066: 218, 1067: 219, 1068: 220, 1069: 221, 1070: 222, 1032: 163, 8226: 149, 1071: 223, 1072: 224, 8482: 153, 1073: 225, 8240: 137, 1118: 162, 1074: 226, 1110: 179, 8230: 133, 1075: 227, 1033: 138, 1076: 228, 1077: 229, 8211: 150, 1078: 230, 1119: 159, 1079: 231, 1042: 194, 1080: 232, 1034: 140, 1025: 168, 1081: 233, 1082: 234, 8212: 151, 1083: 235, 1169: 180, 1084: 236, 1052: 204, 1085: 237, 1035: 142, 1086: 238, 1087: 239, 1088: 240, 1089: 241, 1090: 242, 1036: 141, 1041: 193, 1091: 243, 1092: 244, 8224: 134, 1093: 245, 8470: 185, 1094: 246, 1054: 206, 1095: 247, 1096: 248, 8249: 139, 1097: 249, 1098: 250, 1044: 196, 1099: 251, 1111: 191, 1055: 207, 1100: 252, 1038: 161, 8220: 147, 1101: 253, 8250: 155, 1102: 254, 8216: 145, 1103: 255, 1043: 195, 1105: 184, 1039: 143, 1026: 128, 1106: 144, 8218: 130, 1107: 131, 8217: 146, 1108: 186, 1109: 190};
    var ret = [];
    for (var i=0; i<s.length; i++) {
        var ord = s.charCodeAt(i);
        if (!(ord in codepointMap)) {
            log("Character "+s.charAt(i)+" isn't supported by win1251!");
            ret.push(s[i]);
        } else {
            ret.push(String.fromCharCode(codepointMap[ord]));
        }
    }
    return ret.join('');
}

function toUnicode(theString) {
    var unicodeString = '';
    for (var i=0; i < theString.length; i++) {
        var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
        while (theUnicode.length < 4) {
            theUnicode = '0' + theUnicode;
        }
        theUnicode = '%u' + theUnicode;
        unicodeString += theUnicode;
    }
    return unicodeString;
}

var capitalize = exports.capitalize = function(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/*
 * param Array arr  - array of headings and data arrays/rows
 * return String - string for rows with appropriate csv conventions.
 */
var arrayToCSV = exports.arrayToCSV = function(arr, delimiter) {
    var rows = [],
        delimiter = delimiter || '","';

    for (var r = 0; r < arr.length; r++) {
        var row = arr[r];
        var vals = [];
        for (var v = 0; v < row.length; v++) {
            var val = row[v];
            if (typeof val === 'string') {
                vals.push(val.replace(/"/g, '""'));
            }
            else {
                vals.push(val);
            }
        }
        rows.push('"' + vals.join(delimiter) + '"');
    }
    return rows.join('\n');
};

// SpreadsheetML by default, extend as needed.
// Based on http://code.google.com/p/php-excel/
var arrayToXML = exports.arrayToXML = function(arr, format) {
    var rows = [],
        format = format;

    for (var r = 0; r < arr.length; r++) {
        var row = arr[r],
            vals = [],
            val = null;

        for (var v = 0; v < row.length; v++) {
            val = row[v];
            vals.push(
                '<Cell><Data ss:Type="%s">'.replace(
                    '%s', (val ? capitalize(typeof val) : 'String')) +
                htmlEntities(val) +
                '</Data></Cell>');
        }
        rows.push(vals.join(''));
    }
    return '<Row>' + rows.join('</Row>\n<Row>') + '</Row>';
};


var arrayToStringNotation = function(arr) {
    var str = _.flatten(arr).join('.');
    return str;
};

/*
 * return String - Try to return appropriate locale translation for a string,
 *                 english by default. Support array keys, just concatenate.
 */
var _s = exports._s = function(key, locale) {
    var key = _.isArray(key) ? arrayToStringNotation(key) : key;
    if (exports.strings[key]) {
        if (exports.strings[key][locale]) {
            return exports.strings[key][locale];
        } else if (exports.strings[key]['en']) {
            return exports.strings[key]['en'];
        }
    }
};

var arrayDepth = function(arr) {
    var depth = 0;
    for (var i in arr) {
        var a = arr[i];
        if (a instanceof Array) {
            depth++;
            depth = arrayDepth(a) + depth;
        }
    }
    return depth;
};

/*
 * Fetch labels from base strings or smsforms objects, maintaining order in
 * the returned array.
 *
 * @param Array keys - keys we want to resolve labels for
 * @param String form - form code string
 * @param String locale - locale string, e.g. 'en', 'fr', 'en-gb'
 *
 * @return Array  - form field labels based on smsforms definition.
 *
 * @api private
 */
exports.getLabels = function(keys, form, locale) {
    var def = smsforms[form],
        labels = [],
        form_labels = {};

    if (def) {
        _.map(def.fields, function (f) {
            form_labels[f.key] = f.label || f.key;
        });
    }

    var labelsForKeys = function(keys, appendTo) {
        for (var i in keys) {
            var _key = keys[i];

            if(_.isArray(_key) && arrayDepth(_key) === 1) {
                labelsForKeys(_key[1], _key[0] + '.');
                continue;
            } else if(_.isArray(_key) && arrayDepth(_key) > 1) {
                var key = arrayToStringNotation(_key);
                if (form_labels[key]) {
                    labels.push(form_labels[key]);
                } else {
                    labels.push(_s(key, locale));
                }
            } else {
                var key = (appendTo || '') + _key;

                if (form_labels[key]) {
                    labels.push(form_labels[key]);
                } else {
                    labels.push(_s(key, locale));
                }
            }
        }
    }

    labelsForKeys(keys);

    return labels;
};

/*
 * Get an array of values from the doc by the keys from
 * the given keys array.
 *
 * @param Object doc - data record document
 * @param Array keys - keys we want to resolve labels for
 *
 * @return Array  - values from doc in the same order as keys
 */
var getValues = exports.getValues = function(doc, keys) {
    var values = [];

    _.each(keys, function(key) {
        if(_.isArray(key)) {
            if(typeof doc[key[0]] === 'object') {
                var d = doc[key[0]];
                if (_.isArray(key[1])) {
                    values = values.concat(getValues(d, key[1]));
                }
            } else {
                values.push(doc[key]);
            }
        } else if (typeof doc[key] !== 'object') {
            values.push(doc[key]);
        } else if (typeof doc[key] === 'object') {
            keys.shift();
            values = values.concat(getValues(doc[key], keys));
        }        
    });

    return values;
};

/*
 * Get an array of keys from the form.
 * If dot notation is used it will be an array
 * of arrays.
 *
 * @param String form - smsforms key
 * 
 * @return Array  - form field keys based on smsforms definition
 */
exports.getFormKeys = function(form) {
    var keys = {},
        def = smsforms[form];
        
    var getKeys = function(key, hash) {
        if(key.length > 1) {
            var tmp = key.shift();
            if(!hash[tmp]) {
                hash[tmp] = {};
            }
            getKeys(key, hash[tmp]);
        } else {
            hash[key[0]] = '';
        }            
    };

    var hashToArray = function(hash) {
        var array = [];
        
        _.each(hash, function(value, key) {
            if(typeof value === "string") {
                array.push(key);
            } else {
                array.push([key, hashToArray(hash[key])]);
            }
        });
        
        return array;
    };
    
    if (def) {
        for (var i in def.fields) {
            getKeys(def.fields[i].key.split('.'), keys);
        }
    }
    
    return hashToArray(keys);
};

