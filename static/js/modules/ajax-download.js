(function () {

  'use strict';

  var DEFAULT_FILE_NAME = 'download';

  /**
   * Prompts the user to download a file given a url.
   */
  exports.download = function(url) {
    var element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', DEFAULT_FILE_NAME);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
}());
