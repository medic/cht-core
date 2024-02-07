(function () {

  'use strict';

  const getFileName = (headers) => {
    const DEFAULT_FILE_NAME = 'download';

    const contentDisposition = headers.get('content-disposition');
    if (!contentDisposition) {
      return DEFAULT_FILE_NAME;
    }

    const fileName = contentDisposition.split('filename=')[1];
    if (!fileName) {
      return DEFAULT_FILE_NAME;
    }

    return fileName;
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
