import * as LocalDataContext from '../../src/local/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { Doc } from '../../src/libs/doc';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Nouveau from '../../src/local/libs/nouveau';
import * as Report from '../../src/local/report';
import * as Qualifier from '../../src/qualifier';
import { expect } from 'chai';
import { END_OF_ALPHABET_MARKER } from '../../src/libs/constants';
import * as Lineage from '../../src/local/libs/lineage';
import * as LocalCore from '../../src/local/libs/core';
import * as LocalContact from '../../src/local/contact';
import { InvalidArgumentError, ResourceNotFoundError } from '../../src';
import { DOC_TYPES } from '@medic/constants';

describe('local report', () => {
  let localContext: LocalDataContext.LocalDataContext;
  let settingsGetAll: SinonStub;
  let warn: SinonStub;

  beforeEach(() => {
    settingsGetAll = sinon.stub();
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
      settings: { getAll: settingsGetAll }
    } as unknown as LocalDataContext.LocalDataContext;
    warn = sinon.stub(logger, 'warn');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const settings = { hello: 'world' } as const;

    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

      it('returns a report by UUID', async () => {
        const doc = { type: DOC_TYPES.DATA_RECORD, form: 'yes', _id: 'uuid', _rev: '1' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.notCalled).to.be.true;
      });

      it('returns null if the identified doc does not have a record type', async () => {
        const doc = { type: 'not-data-record', _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid report.`)).to.be.true;
      });

      it('returns null if the identified doc does not have a form field', async () => {
        const doc = { type: DOC_TYPES.DATA_RECORD, _id: '_id' };
        getDocByIdInner.resolves(doc);
        settingsGetAll.returns(settings);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid report.`)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Report.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(warn.calledOnceWithExactly(`Document [${identifier.uuid}] is not a valid report.`)).to.be.true;
      });

      it('propagates error if getMedicDocById throws an error', async () => {
        const err = new Error('error');
        getDocByIdInner.throws(err);

        await expect(Report.v1.get(localContext)(identifier)).to.be.rejectedWith('error');

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
        expect(settingsGetAll.notCalled).to.be.true;
        expect(warn.notCalled).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const identifier = { uuid: 'uuid' } as const;
      let fetchHydratedDocOuter: SinonStub;
      let fetchHydratedDocInner: SinonStub;

      beforeEach(() => {
        fetchHydratedDocInner = sinon.stub();
        fetchHydratedDocOuter = sinon.stub(Lineage, 'fetchHydratedDoc').returns(fetchHydratedDocInner);
      });

      it('returns a report with contact lineage when found', async () => {
        const report = {
          type: DOC_TYPES.DATA_RECORD,
          form: 'yes',
          _id: 'report_id',
          _rev: '1',
          contact: { _id: 'contact_id' }
        };
        fetchHydratedDocInner.resolves(report);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.deep.equal(report);
        expect(fetchHydratedDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if document is not a report', async () => {
        const report = { type: 'not_a_report', _id: 'doc_id' };
        fetchHydratedDocInner.resolves(report);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(fetchHydratedDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if document is not found', async () => {
        fetchHydratedDocInner.resolves(null);

        const result = await Report.v1.getWithLineage(localContext)(identifier);

        expect(result).to.be.null;
        expect(fetchHydratedDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(fetchHydratedDocInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getUuidsPage', () => {
      const limit = 3;
      const expectedResult = { cursor: 'bookmark', data: ['1', '2', '3'] };
      let queryViewFreetextByKey: SinonStub;
      let queryViewFreetextByRange: SinonStub;
      let fetchAndFilterIdsInner: SinonStub;
      let fetchAndFilterIdsOuter: SinonStub;
      let queryNouveauFreetext: SinonStub;
      let useNouveauIndexes: SinonStub;

      beforeEach(() => {
        queryViewFreetextByKey = sinon.stub();
        sinon
          .stub(LocalDoc, 'queryDocIdsByKey')
          .withArgs(localContext.medicDb, 'medic-offline-freetext/reports_by_freetext')
          .returns(queryViewFreetextByKey);

        queryViewFreetextByRange = sinon.stub();
        sinon
          .stub(LocalDoc, 'queryDocIdsByRange')
          .withArgs(localContext.medicDb, 'medic-offline-freetext/reports_by_freetext')
          .returns(queryViewFreetextByRange);

        fetchAndFilterIdsInner = sinon.stub();
        fetchAndFilterIdsOuter = sinon
          .stub(LocalDoc, 'fetchAndFilterIds')
          .returns(fetchAndFilterIdsInner);

        queryNouveauFreetext = sinon.stub();
        sinon
          .stub(Nouveau, 'queryByFreetext')
          .withArgs(localContext.medicDb, 'reports_by_freetext')
          .returns(queryNouveauFreetext);

        useNouveauIndexes = sinon.stub(Nouveau, 'useNouveauIndexes');
      });

      describe('when useNouveauIndexes is true', () => {
        beforeEach(() => {
          queryNouveauFreetext.resolves(expectedResult);
          useNouveauIndexes.resolves(true);
        });

        ([
          ['searching with a keyed value and no cursor', null, 'key:value'],
          ['searching with a keyed value and a cursor', 'cursor', 'key:value'],
          ['searching with a prefix qualifier and no cursor', null, 'searchterm'],
          ['searching with a prefix qualifier and no cursor', 'cursor', 'searchterm']
        ] as [string, string | null, string][]).forEach(([test, cursor, freetext]) => {
          it(`uses nouveau for freetext searches when ${test}`, async () => {
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.calledOnceWithExactly(qualifier, cursor, limit)).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
            expect(fetchAndFilterIdsInner.notCalled).to.be.true;
          });
        });

        it('normalizes freetext qualifier before querying nouveau', async () => {
          const freetext = '  HAS:DELIMITER  ';
          const qualifier = Qualifier.byFreetext(freetext);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, null, limit);

          expect(res).to.deep.equal(expectedResult);
          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(queryNouveauFreetext.calledOnceWithExactly(
            Qualifier.byFreetext('has:delimiter'),
            null,
            limit
          )).to.be.true;
          expect(queryViewFreetextByKey.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
          expect(fetchAndFilterIdsInner.notCalled).to.be.true;
        });
      });

      describe('when useNouveauIndexes is false', () => {
        beforeEach(() => {
          useNouveauIndexes.resolves(false);
          fetchAndFilterIdsInner.resolves(expectedResult);
        });

        ([
          [null, 0],
          ['1', 1]
        ] as [string | null, number][]).forEach(([cursor, skip]) => {
          it('uses offline views for freetext keyed qualifier', async () => {
            const freetext = 'key:value';
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewFreetextByRange.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
            expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
            expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;

            // Verify the page function uses the keyed freetext view
            const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
            pageFn(limit, skip);

            expect(queryViewFreetextByKey.calledWithExactly([freetext], limit, skip)).to.be.true;
          });

          it('uses offline views for freetext prefix qualifier', async () => {
            const freetext = 'searchterm';
            const qualifier = Qualifier.byFreetext(freetext);

            const res = await Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit);

            expect(res).to.deep.equal(expectedResult);
            expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
            expect(queryNouveauFreetext.notCalled).to.be.true;
            expect(queryViewFreetextByKey.notCalled).to.be.true;
            expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
            expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
            expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, skip)).to.be.true;

            // Verify the page function uses the range freetext view
            const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
            pageFn(limit, skip);

            expect(queryViewFreetextByRange.calledWithExactly(
              [freetext],
              [freetext + END_OF_ALPHABET_MARKER],
              limit,
              skip
            )).to.be.true;
          });
        });

        it('normalizes freetext qualifier before querying', async () => {
          const freetext = '  HAS:DELIMITER  ';
          const qualifier = Qualifier.byFreetext(freetext);

          const res = await Report.v1.getUuidsPage(localContext)(qualifier, null, limit);

          expect(res).to.deep.equal(expectedResult);
          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(queryNouveauFreetext.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(fetchAndFilterIdsOuter.calledOnce).to.be.true;
          expect(fetchAndFilterIdsOuter.args[0][1]).to.equal(limit);
          expect(fetchAndFilterIdsInner.calledOnceWithExactly(limit, 0)).to.be.true;

          // Verify the page function uses the keyed freetext view
          const pageFn = fetchAndFilterIdsOuter.firstCall.args[0] as (l: number, s: number) => unknown;
          pageFn(limit, 0);

          expect(queryViewFreetextByKey.calledWithExactly(['has:delimiter'], limit, 0)).to.be.true;
        });

        it(`throws an error if cursor is invalid`, async () => {
          const qualifier = Qualifier.byFreetext('nice:report');
          const cursor = 'not a number';

          await expect(Report.v1.getUuidsPage(localContext)(qualifier, cursor, limit))
            .to.be.rejectedWith(
              InvalidArgumentError,
              `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}]`
            );

          expect(useNouveauIndexes.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(queryNouveauFreetext.notCalled).to.be.true;
          expect(queryViewFreetextByKey.notCalled).to.be.true;
          expect(queryViewFreetextByRange.notCalled).to.be.true;
          expect(fetchAndFilterIdsOuter.notCalled).to.be.true;
          expect(fetchAndFilterIdsInner.notCalled).to.be.true;
        });
      });
    });

    describe('create', () => {
      const minifiedContact = {
        _id: 'contact-1',
        parent: { _id: 'parent-1' }
      } as const;
      const contact = {
        ...minifiedContact,
        _rev: '1',
        type: 'person',
      } as const;
      const reportDoc = { _id: 'report-1', type: DOC_TYPES.DATA_RECORD, form: 'test-form' } as const;
      const supportedForms = ['test-form', 'other-form'];
      const reportedDate = new Date().getTime();

      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;
      let createDocOuter: SinonStub;
      let createDocInner: SinonStub;
      let getDocIdsByIdRangeOuter: SinonStub;
      let getDocIdsByIdRangeInner: SinonStub;
      let isContact: SinonStub;
      let getReportedDateTimestamp: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub().resolves(contact);
        getDocByIdOuter = sinon
          .stub(LocalDoc, 'getDocById')
          .returns(getDocByIdInner);
        createDocInner = sinon.stub().resolves(reportDoc);
        createDocOuter = sinon
          .stub(LocalDoc, 'createDoc')
          .returns(createDocInner);
        getDocIdsByIdRangeInner = sinon.stub().resolves(supportedForms.map(f => `form:${f}`));
        getDocIdsByIdRangeOuter = sinon
          .stub(LocalDoc, 'getDocIdsByIdRange')
          .returns(getDocIdsByIdRangeInner);
        isContact = sinon
          .stub(LocalContact.v1, 'isContact')
          .returns(true);
        getReportedDateTimestamp = sinon
          .stub(LocalCore, 'getReportedDateTimestamp')
          .returns(reportedDate);
        settingsGetAll.returns(settings);
      });

      it('creates a report with valid input', async () => {
        const input = {
          form: 'test-form',
          contact: contact._id,
        };

        const result = await Report.v1.create(localContext)(input);

        expect(result).to.equal(reportDoc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
        expect(getDocIdsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(isContact.calledOnceWithExactly(localContext.settings, contact)).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(undefined)).to.be.true;
        const expectedReport = {
          ...input,
          contact: minifiedContact,
          reported_date: reportedDate,
          type: DOC_TYPES.DATA_RECORD
        };
        expect(createDocInner.calledOnceWithExactly(expectedReport)).to.be.true;
      });

      it('creates a report with reported_date in input', async () => {
        const input = {
          form: 'test-form',
          contact: contact._id,
          reported_date: 123456789
        };

        const result = await Report.v1.create(localContext)(input);

        expect(result).to.equal(reportDoc);
        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
        expect(getDocIdsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(isContact.calledOnceWithExactly(localContext.settings, contact)).to.be.true;
        expect(getReportedDateTimestamp.calledOnceWithExactly(input.reported_date)).to.be.true;
        const expectedReport = {
          ...input,
          contact: minifiedContact,
          reported_date: reportedDate,
          type: DOC_TYPES.DATA_RECORD
        };
        expect(createDocInner.calledOnceWithExactly(expectedReport)).to.be.true;
      });

      it('throws error if input validation fails', async () => {
        const input = {
          form: 'test-form',
          contact: contact._id,
          _rev: '1-rev'
        };

        await expect(Report.v1.create(localContext)(input as unknown as never))
          .to.be.rejectedWith(InvalidArgumentError, 'The [_rev] field must not be set.');

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.notCalled).to.be.true;
        expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      it('throws error if form is not supported', async () => {
        const input = {
          form: 'unsupported-form',
          contact: contact._id,
        };

        await expect(Report.v1.create(localContext)(input))
          .to.be.rejectedWith(`Invalid form value [${input.form}].`);

        expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
        expect(getDocIdsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(isContact.notCalled).to.be.true;
        expect(getReportedDateTimestamp.notCalled).to.be.true;
        expect(createDocInner.notCalled).to.be.true;
      });

      [
        null,
        { _id: 'non-existent-contact', type: DOC_TYPES.DATA_RECORD }
      ].forEach(invalidContact => {
        it('throws error if contact is not found', async () => {
          const input = {
            form: 'test-form',
            contact: 'non-existent-contact',
          };
          getDocByIdInner.resolves(invalidContact);
          isContact.returns(false);

          await expect(Report.v1.create(localContext)(input))
            .to.be.rejectedWith(`Contact [${input.contact}] not found.`);

          expect(getDocByIdOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(createDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocByIdInner.calledOnceWithExactly(input.contact)).to.be.true;
          expect(getDocIdsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
          expect(isContact.calledOnceWithExactly(localContext.settings, invalidContact)).to.be.true;
          expect(getReportedDateTimestamp.notCalled).to.be.true;
          expect(createDocInner.notCalled).to.be.true;
        });
      });
    });

    describe('update', () => {
      const originalReport = {
        _id: 'report-1',
        _rev: '1-rev',
        type: DOC_TYPES.DATA_RECORD,
        form: 'test-form',
        reported_date: 12312312,
        contact: {
          _id: 'contact-1',
          parent: {
            _id: 'parent-1'
          }
        },
        fields: { hello: 'world' }
      } as const;
      const contactDoc = { _id: 'contact-1', type: 'person' } as const;
      const newContactMinified = {
        _id: 'contact-2',
        parent: {
          _id: 'parent-1'
        }
      };
      const newContact = {
        ...newContactMinified,
        _rev: '1',
        type: 'person'
      };
      const supportedForms = ['test-form', 'other-form', 'new-form'];

      let getDocsByIdsOuter: SinonStub;
      let getDocsByIdsInner: SinonStub;
      let updateDocOuter: SinonStub;
      let updateDocInner: SinonStub;
      let getDocIdsByIdRangeOuter: SinonStub;
      let getDocIdsByIdRangeInner: SinonStub;
      let getUpdatedContactOuter: SinonStub;
      let getUpdatedContactInner: SinonStub;

      beforeEach(() => {
        getDocsByIdsInner = sinon
          .stub()
          .resolves([originalReport, contactDoc]);
        getDocsByIdsOuter = sinon
          .stub(LocalDoc, 'getDocsByIds')
          .returns(getDocsByIdsInner);
        updateDocInner = sinon.stub();
        updateDocOuter = sinon
          .stub(LocalDoc, 'updateDoc')
          .returns(updateDocInner);
        getDocIdsByIdRangeInner = sinon
          .stub()
          .resolves(supportedForms.map(f => `form:${f}`));
        getDocIdsByIdRangeOuter = sinon
          .stub(LocalDoc, 'getDocIdsByIdRange')
          .returns(getDocIdsByIdRangeInner);
        getUpdatedContactInner = sinon.stub();
        getUpdatedContactOuter = sinon
          .stub(Lineage, 'getUpdatedContact')
          .returns(getUpdatedContactInner);
        settingsGetAll.returns(settings);
      });

      it('updates doc for valid update input', async () => {
        const updateInput = {
          ...originalReport,
          fields: { hello: 'updated' }
        };
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
      });

      [
        { ...originalReport, _id: undefined },
        { ...originalReport, _rev: undefined },
        { ...originalReport, type: 'not-data-record' },
        { ...originalReport, form: undefined },
      ].forEach((updateInput) => {
        it(`throws error if input is not a valid report`, async () => {
          await expect(Report.v1.update(localContext)(updateInput as never))
            .to.be.rejectedWith(InvalidArgumentError, 'Valid _id, _rev, form, and type fields must be provided.');

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocsByIdsInner.notCalled).to.be.true;
          expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
          expect(getUpdatedContactInner.notCalled).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
        });
      });

      it('throws error when original report is not found', async () => {
        getDocsByIdsInner.resolves([null, contactDoc]);

        await expect(Report.v1.update(localContext)(originalReport))
          .to.be.rejectedWith(ResourceNotFoundError, `Report record [${originalReport._id}] not found.`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([originalReport._id, 'contact-1'])).to.be.true;
        expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.notCalled).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('throws error when trying to remove contact value', async () => {
        const updateInput = { ...originalReport, contact: undefined };
        getDocsByIdsInner.resolves([originalReport, null]);
        getUpdatedContactInner.returns(null);

        await expect(Report.v1.update(localContext)(updateInput))
          .to.be.rejectedWith(InvalidArgumentError, 'A contact must be provided.');

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, undefined])).to.be.true;
        expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, null)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      it('allows update when original report has no contact', async () => {
        const originalReportNoContact = {
          ...originalReport,
          contact: undefined
        };
        const updateInput = {
          ...originalReportNoContact,
          fields: { hello: 'updated' }
        };
        getDocsByIdsInner.resolves([originalReportNoContact, undefined]);
        getUpdatedContactInner.returns(undefined);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, contact: undefined, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, undefined])).to.be.true;
        expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(
          originalReportNoContact,
          updateInput,
          undefined
        )).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
      });

      it('allows setting contact when original report has no contact', async () => {
        const originalReportNoContact = {
          ...originalReport,
          contact: undefined
        };
        const updateInput = {
          ...originalReport,
          fields: { hello: 'updated' }
        };
        getDocsByIdsInner.resolves([originalReportNoContact, contactDoc]);
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, contactDoc._id])).to.be.true;
        expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(
          originalReportNoContact,
          updateInput,
          contactDoc
        )).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
      });

      ([
        ['_rev', { ...originalReport, _rev: 'updated' }],
        ['reported_date', { ...originalReport, reported_date: 999999999 }],
      ] as unknown as [string, typeof originalReport][]).forEach(([field, updateInput]) => {
        it(`throws error when changing immutable field [${field}]`, async () => {
          getUpdatedContactInner.returns(updateInput.contact);

          await expect(Report.v1.update(localContext)(updateInput))
            .to.be.rejectedWith(InvalidArgumentError, `The [${field}] fields must not be changed.`);

          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
          expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
          expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
          expect(updateDocInner.notCalled).to.be.true;
        });
      });

      it('allows changing form to another valid form', async () => {
        const updateInput = {
          ...originalReport,
          form: 'new-form'
        };
        getUpdatedContactInner.returns(updateInput.contact);
        updateDocInner.resolves({ _rev: '2-rev' });

        const result = await Report.v1.update(localContext)(updateInput);

        expect(result).to.deep.equal({ ...updateInput, _rev: '2-rev' });
        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocIdsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        expect(updateDocInner.calledOnceWithExactly(updateInput)).to.be.true;
      });

      it('throws error when changing form to an invalid form', async () => {
        const updateInput = {
          ...originalReport,
          form: 'invalid-form'
        };
        getUpdatedContactInner.returns(updateInput.contact);

        await expect(Report.v1.update(localContext)(updateInput))
          .to.be.rejectedWith(InvalidArgumentError, `Invalid form value [${updateInput.form}].`);

        expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
        expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
        expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-1'])).to.be.true;
        expect(getDocIdsByIdRangeInner.calledOnceWithExactly('form:', 'form:\ufff0')).to.be.true;
        expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, contactDoc)).to.be.true;
        expect(updateDocInner.notCalled).to.be.true;
      });

      [
        newContact, // Full contact
        newContactMinified, // Contact hierarchy
        newContact._id // Just Id
      ].forEach(contact => {
        it('updates report when new contact', async () => {
          const updateInput = {
            ...originalReport,
            contact
          };
          getUpdatedContactInner.returns(newContact);
          updateDocInner.resolves({ _rev: '2-rev' });
          getDocsByIdsInner.resolves([originalReport, newContact]);

          const result = await Report.v1.update(localContext)(updateInput as unknown as typeof originalReport);

          // Full lineage data returned
          expect(result).to.deep.equal({ ...updateInput, contact: newContact,  _rev: '2-rev' });
          expect(getDocsByIdsOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(updateDocOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getUpdatedContactOuter.calledOnceWithExactly(localContext.settings, localContext.medicDb)).to.be.true;
          expect(getDocIdsByIdRangeOuter.calledOnceWithExactly(localContext.medicDb)).to.be.true;
          expect(getDocsByIdsInner.calledOnceWithExactly([updateInput._id, 'contact-2'])).to.be.true;
          expect(getDocIdsByIdRangeInner.notCalled).to.be.true;
          expect(getUpdatedContactInner.args).to.deep.equal([[originalReport, updateInput, newContact]]);
          expect(getUpdatedContactInner.calledOnceWithExactly(originalReport, updateInput, newContact)).to.be.true;
          // Minified lineage set on updated doc
          expect(updateDocInner.calledOnceWithExactly({ ...updateInput, contact: newContactMinified })).to.be.true;
        });
      });
    });
  });
});
