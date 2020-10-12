import { Injectable } from '@angular/core';

import { AjaxDownloadProvider } from '@mm-providers/ajax-download.provider';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private KNOWN_EXPORTS = [
    'contacts',
    'dhis',
    'feedback',
    'messages',
    'reports',
  ];

  constructor(private ajaxDownloadProvider: AjaxDownloadProvider) { }

  export(type, filters, options) {
    if (!this.KNOWN_EXPORTS.includes(type)) {
      return console.error(new Error('Unknown download type: ' + type));
    }

    const params = '?' + $.param({ filters, options });
    const url = '/api/v2/export/' + type + params;
    this.ajaxDownloadProvider.download(url);
  }
}
