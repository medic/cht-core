/*
This file is forked and unaltered from https://github.com/uxsolutions/bootstrap-datepicker/blob/master/js/locales/bootstrap-datepicker.hi.js
Enketo-core uses bootstrap-datepicker@1.6.4 but Hindi localization wasn't available until 1.8.0.
Solution is to use a duplicated copy of the file to avoid a breaking change to enketo-core.
*/

/* eslint-disable */

/**
 * Hindi translation for bootstrap-datepicker
 * Visar Uruqi <visar.uruqi@gmail.com>
 */
; (function($){
	$.fn.datepicker.dates['hi'] = {
		days: ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
		daysShort: ["सूर्य", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
		daysMin: ["र", "सो", "मं", "बु", "गु", "शु", "श"],
		months: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवंबर", "दिसम्बर"],
		monthsShort: ["जन", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितं", "अक्टूबर", "नवं", "दिसम्बर"],
		today: "आज",
		monthsTitle: "महीने",
		clear: "साफ",
		weekStart: 1,
		format: "dd / mm / yyyy"
	};
}(jQuery));