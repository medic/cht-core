import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as _ from 'lodash-es';

import { HydrateMessagesService } from '@mm-services/hydrate-messages.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

describe('Hydrate Messages Service', () => {
  let service: HydrateMessagesService
  let lineageModelGeneratorService;
  const contact = { _id: 'contact', name: 'aa' };
  const lineage = [
    { id: 1, name: 'bb' },
    { id: 2, name: 'cc' }
  ];

  beforeEach(() => {
    const lineageGeneratorServiceMock = { reportSubjects: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: LineageModelGeneratorService, useValue: lineageGeneratorServiceMock }
      ]
    });

    service = TestBed.inject(HydrateMessagesService);
    lineageModelGeneratorService = TestBed.inject(LineageModelGeneratorService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return empty array when given no data', () => {
    return service
      .hydrate([])
      .then(actual => {
        expect(actual).to.deep.equal([]);
      });
  });

  it('should hydrates outgoing message', () => {
    const doc = {
      _id: 12345,
      kujua_message: true,
      tasks: [{ messages: [{ contact: contact, message: 'hello', phone: '+123' }] }]
    };
    const given = [{
      doc: doc,
      key: [contact._id],
      value: {
        id: 1234,
        date: 123456789
      }
    }];
    const expected = [{
      doc: doc,
      id: doc._id,
      key: contact._id,
      contact: contact.name,
      lineage: _.map(lineage, 'name'),
      outgoing: true,
      from: contact._id,
      date: given[0].value.date,
      type: 'contact',
      message: doc.tasks[0].messages[0].message
    }];
    lineageModelGeneratorService.reportSubjects.resolves([{
      _id: contact._id, doc: contact, lineage: lineage
    }]);

    return service
      .hydrate(given)
      .then(actual => {
        expect(actual).to.deep.equal(expected);
      });
  });

  it('should hydrate incoming message', () => {
    const doc = {
      _id: 12345,
      sms_message: { message: 'hello'}
    };
    const given = [{
      doc: doc,
      key: [contact._id],
      value: {
        id: 1234,
        date: 123456789
      }
    }];
    const expected = [{
      doc: doc,
      id: doc._id,
      key: contact._id,
      contact: contact.name,
      lineage: _.map(lineage, 'name'),
      outgoing: false,
      from: doc._id,
      date: given[0].value.date,
      type: 'unknown',
      message: doc.sms_message.message
    }];
    lineageModelGeneratorService.reportSubjects.resolves([{
      _id: contact._id, doc: contact, lineage: lineage
    }]);

    return service.hydrate(given).then(actual => {
      expect(actual).to.deep.equal(expected);
    });
  });
});
