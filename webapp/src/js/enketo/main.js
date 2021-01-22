window.EnketoForm = require('enketo-core/src/js/Form');

require('bootstrap-datepicker/js/locales/bootstrap-datepicker.es');
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.fr');
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.sw');
require('bootstrap-datepicker/js/locales/bootstrap-datepicker.id');
require('./bootstrap-datepicker.bm');
require('./bootstrap-datepicker.hi');
require('./bootstrap-datepicker.ceb');
require('./bootstrap-datepicker.hil');
require('./bootstrap-datepicker.tl');

$.fn.datepicker.defaults.container = '.content-pane .enketo';
$.fn.datepicker.defaults.orientation = 'bottom';
