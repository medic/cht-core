window.EnketoForm = require('enketo-core/src/js/Form');

// Missing Bamanankan (bm) - Issue #4832
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.es');
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.fr');
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.sw');
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.id');
require('./bootstrap-datepicker.hi');

$.fn.datepicker.defaults.container = '.content-pane .enketo';
$.fn.datepicker.defaults.orientation = 'bottom';