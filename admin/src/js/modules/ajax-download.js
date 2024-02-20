(function () {

  'use strict';

  const DEFAULT_FILE_NAME = 'download';

  const getFileName = (headers) => {
    const contentDisposition = headers.get('content-disposition');
    const match = /filename=(?:"|)(.*?)(?:"|;|$)/.exec(contentDisposition);
    return match ? match[1].trim() : DEFAULT_FILE_NAME;
  };

  /**
   * Prompts the user to download a file given a url.
   */
  exports.download = function(url) {
    return fetch(url)
      .then(response => response.blob()
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.style.display = 'none';
          link.href = blobUrl;
          link.setAttribute('download', getFileName(response.headers));
          document.body.appendChild(link);
          link.click();
          URL.revokeObjectURL(blobUrl);
        }));
  };
}());
