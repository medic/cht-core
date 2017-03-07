(function () {

  'use strict';

  /**
   * Prompts the user to download a file given a url.
   */
  exports.download = function(url) {
    var element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', 'failed'); // this filename only shows in case of failed download AFAIK
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
}());
