import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AjaxDownloadProvider {
  DEFAULT_FILE_NAME = 'download';

  constructor() { }

  /**
   * Prompts the user to download a file given a url.
   */
  download(url) {
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', this.DEFAULT_FILE_NAME);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}
