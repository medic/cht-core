(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  /**
   * Factory to create a Web Worker from the given code string.
   * Prepends the code with a console polyfill for Chrome 30 support.
   */
  inboxServices.factory('WebWorker',
    function() {

      var CONSOLE_POLYFILL = (function() {
        // inspired by https://github.com/paulmillr/console-polyfill
        var consolePolyfill = function(global) {
          var replace = function(con, props, replacement) {
            props.split(',').forEach(function(prop) {
              if (!con[prop]) {
                con[prop] = replacement;
              }
            });
          };
          global.console = global.console || {};
          var PROPERTIES = 'memory';
          var METHODS = 'assert,clear,count,debug,dir,dirxml,error,exception,group,' +
            'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' +
            'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn';
          replace(global.console, PROPERTIES, {});
          replace(global.console, METHODS, function() {});
        };
        return '(' + consolePolyfill.toString() + ')(typeof window === \'undefined\' ? this : window);';
      })();

      return function(code) {
        /* global webkitURL */

        var createBlob = require('pouchdb-binary-util').createBlob;
        var URLCompat = typeof URL !== 'undefined' ? URL : webkitURL;

        function makeBlobURI(script) {
          var blob = createBlob([ script ], { type: 'text/javascript' });
          return URLCompat.createObjectURL(blob);
        }

        var blob = createBlob([ CONSOLE_POLYFILL, code ], { type: 'text/javascript' });
        return new Worker(makeBlobURI(blob));
      };
    }
  );

}());
