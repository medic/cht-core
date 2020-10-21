import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ExportService } from '@mm-services/export.service';
import { AjaxDownloadProvider } from '@mm-providers/ajax-download.provider';

describe('Export Service', () => {
  let service: ExportService;
  let ajaxDownloadProvider;

  beforeEach(() => {
    ajaxDownloadProvider = { download: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AjaxDownloadProvider, useValue: ajaxDownloadProvider }
      ]
    });

    service = TestBed.inject(ExportService);
    ajaxDownloadProvider = TestBed.inject(AjaxDownloadProvider);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should export with right url', () => {
    const type = 'contacts';
    const filters = { acb: '123' };
    const options = { option1: '1' };
    const expectedUrl = '/api/v2/export/contacts?filters%5Bacb%5D=123&options%5Boption1%5D=1';

    service.export(type, filters, options);

    expect(ajaxDownloadProvider.download.args[0][0]).to.equal(expectedUrl);
    expect(ajaxDownloadProvider.download.callCount).to.equal(1);
  });

  it('should not export if type isnt known and log error', () => {
    const type = 'ABC';
    const filters = { acb: '123' };
    const options = { option1: '1' };
    const consoleErrorSpy = sinon.spy(console, 'error');

    service.export(type, filters, options);

    expect(ajaxDownloadProvider.download.callCount).to.equal(0);
    expect(consoleErrorSpy.callCount).to.equal(1);
  });
});
