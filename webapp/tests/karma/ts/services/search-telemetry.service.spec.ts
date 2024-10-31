import { expect } from 'chai';
import sinon from 'sinon';
import { TestBed } from '@angular/core/testing';

import { SearchTelemetryService } from '@mm-services/search-telemetry.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('SearchTelemetryService', () => {
  let service: SearchTelemetryService;
  let telemetryService;

  beforeEach(() => {
    telemetryService = {
      record: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TelemetryService, useValue: telemetryService },
      ],
    });
    service = TestBed.inject(SearchTelemetryService);
  });

  afterEach(() => sinon.restore());

  describe('recordContactSearch', () => {
    const contact = {
      _id: 'john_id',
      name: 'john',
      patient_id: '12345',
      type: 'person',
      field: 'value',
      custom_field: 'johanna',
    };

    it('should emit a telemetry entry for each matching field', async () => {
      const search = 'jo';
      await service.recordContactSearch(contact, search);

      expect(telemetryService.record.callCount).to.equal(2);
      expect(telemetryService.record.getCall(0).args[0]).to.equal('search_match:contacts_by_freetext:name');
      expect(telemetryService.record.getCall(1).args[0]).to.equal('search_match:contacts_by_freetext:custom_field');
    });

    it('should emit a single telemetry entry for key:value searches', async () => {
      const search = 'patient_id:12345';
      await service.recordContactSearch(contact, search);

      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.getCall(0).args[0]).to.equal(
        'search_match:contacts_by_freetext:patient_id:$value',
      );
    });

    it('should not emit telemetry entries if no field matched the query (should not be happening)', async () => {
      const search = 'unrelated search';
      await service.recordContactSearch(contact, search);

      expect(telemetryService.record.callCount).to.equal(0);
    });
  });

  describe('recordContactByTypeSearch', () => {
    const contact = {
      _id: 'john_id',
      name: 'john',
      patient_id: '12345',
      type: 'person',
      field: 'value',
      custom_field: 'johanna',
    };

    it('should emit a telemetry entry for each matching field', async () => {
      const search = 'jo';
      await service.recordContactByTypeSearch(contact, search);

      expect(telemetryService.record.callCount).to.equal(2);
      expect(telemetryService.record.getCall(0).args[0]).to.equal('search_match:contacts_by_type_freetext:name');
      expect(telemetryService.record.getCall(1).args[0]).to.equal(
        'search_match:contacts_by_type_freetext:custom_field',
      );
    });

    it('should emit a single telemetry entry for key:value searches', async () => {
      const search = 'patient_id:12345';
      await service.recordContactByTypeSearch(contact, search);

      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.getCall(0).args[0]).to.equal(
        'search_match:contacts_by_type_freetext:patient_id:$value',
      );
    });

    it('should not emit telemetry entries if no field matched the query (should not be happening)', async () => {
      const search = 'unrelated search';
      await service.recordContactByTypeSearch(contact, search);

      expect(telemetryService.record.callCount).to.equal(0);
    });
  });

  describe('recordReportSearch', () => {
    const report = {
      _id: 'REF_REF_V1',
      form: 'RR',
      type: 'data_record',
      from: '+123456789',
      fields: { patient_id: '12345', name: 'John', custom_field: 'johanna' },
      custom_patient_name: 'Johnny',
    };

    it('should emit a telemetry entry for each matching field', async () => {
      const search = 'jo';
      await service.recordReportSearch(report, search);

      expect(telemetryService.record.callCount).to.equal(3);
      expect(telemetryService.record.getCall(0).args[0]).to.equal(
        'search_match:reports_by_freetext:custom_patient_name',
      );
      expect(telemetryService.record.getCall(1).args[0]).to.equal('search_match:reports_by_freetext:fields.name');
      expect(telemetryService.record.getCall(2).args[0]).to.equal(
        'search_match:reports_by_freetext:fields.custom_field',
      );
    });

    it('should emit a single telemetry entry for key:value searches', async () => {
      const search = 'patient_id:12345';
      await service.recordReportSearch(report, search);

      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.getCall(0).args[0]).to.equal(
        'search_match:reports_by_freetext:patient_id:$value',
      );
    });

    it('should not emit telemetry entries if no field matched the query (should not be happening)', async () => {
      const search = 'unrelated search';
      await service.recordReportSearch(report, search);

      expect(telemetryService.record.callCount).to.equal(0);
    });
  });
});
