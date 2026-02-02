import { expect } from 'chai';
import * as Index from '../src';
import { hasAnyPermission, hasPermissions } from '../src/auth';
import * as Contact from '../src/contact';
import * as Person from '../src/person';
import * as Place from '../src/place';
import * as Qualifier from '../src/qualifier';
import * as Report from '../src/report';
import * as TargetInterval from '../src/target-interval';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import { DataContext } from '../src';
import { Page } from '../src/libs/core';

describe('CHT Script API - getDatasource', () => {
  let dataContext: DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let datasource: ReturnType<typeof Index.getDatasource>;

  beforeEach(() => {
    dataContextBind = sinon.stub();
    dataContext = { bind: dataContextBind };
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    datasource = Index.getDatasource(dataContext);
  });

  afterEach(() => sinon.restore());

  it('contains expected keys', () => {
    expect(datasource).to.have.all.keys([ 'v1' ]);
  });

  it('throws an error if the data context is invalid', () => {
    assertDataContext.throws(new Error(`Invalid data context [null].`));
    expect(() => Index.getDatasource(dataContext)).to.throw('Invalid data context [null].');
  });

  describe('v1', () => {
    let v1: typeof datasource.v1;

    beforeEach(() => v1 = datasource.v1);

    it('contains expected keys', () => expect(v1).to.have.all.keys([
      'contact', 'hasPermissions', 'hasAnyPermission', 'person', 'place', 'report', 'targetInterval'
    ]));

    it('permission', () => {
      expect(v1.hasPermissions).to.equal(hasPermissions);
      expect(v1.hasAnyPermission).to.equal(hasAnyPermission);
    });

    describe('place', () => {
      let place: typeof v1.place;

      beforeEach(() => place = v1.place);

      it('contains expected keys', () => {
        expect(place).to.have.all.keys(['getByType', 'getByUuid', 'getByUuidWithLineage', 'getPageByType']);
      });

      it('getByUuid', async () => {
        const expectedPlace = {};
        const placeGet = sinon.stub().resolves(expectedPlace);
        dataContextBind.returns(placeGet);
        const qualifier = { uuid: 'my-places-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPlace = await place.getByUuid(qualifier.uuid);

        expect(returnedPlace).to.equal(expectedPlace);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.get)).to.be.true;
        expect(placeGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedPlace = {};
        const placeGet = sinon.stub().resolves(expectedPlace);
        dataContextBind.returns(placeGet);
        const qualifier = { uuid: 'my-places-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPlace = await place.getByUuidWithLineage(qualifier.uuid);

        expect(returnedPlace).to.equal(expectedPlace);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getWithLineage)).to.be.true;
        expect(placeGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getPageByType', async () => {
        const expectedPlaces: Page<Place.v1.Place> = {data: [], cursor: null};
        const placeGetPage = sinon.stub().resolves(expectedPlaces);
        dataContextBind.returns(placeGetPage);
        const placeType = 'place';
        const limit = 2;
        const cursor = '1';
        const placeTypeQualifier = { contactType: placeType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(placeTypeQualifier);

        const returnedPlaces = await place.getPageByType(placeType, cursor, limit);

        expect(returnedPlaces).to.equal(expectedPlaces);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getPage)).to.be.true;
        expect(placeGetPage.calledOnceWithExactly(placeTypeQualifier, cursor, limit)).to.be.true;
        expect(byContactType.calledOnceWithExactly(placeType)).to.be.true;
      });

      it('getByType', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const placeGetAll = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(placeGetAll);
        const placeType = 'place';
        const placeTypeQualifier = { contactType: placeType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(placeTypeQualifier);

        const res =  place.getByType(placeType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Place.v1.getAll)).to.be.true;
        expect(placeGetAll.calledOnceWithExactly(placeTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(placeType)).to.be.true;
      });
    });

    describe('person', () => {
      let person: typeof v1.person;

      beforeEach(() => person = v1.person);

      it('contains expected keys', () => {
        expect(person).to.have.all.keys(['getByType', 'getByUuid', 'getByUuidWithLineage', 'getPageByType']);
      });

      it('getByUuid', async () => {
        const expectedPerson = {};
        const personGet = sinon.stub().resolves(expectedPerson);
        dataContextBind.returns(personGet);
        const qualifier = { uuid: 'my-persons-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPerson = await person.getByUuid(qualifier.uuid);

        expect(returnedPerson).to.equal(expectedPerson);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.get)).to.be.true;
        expect(personGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedPerson = {};
        const personGet = sinon.stub().resolves(expectedPerson);
        dataContextBind.returns(personGet);
        const qualifier = { uuid: 'my-persons-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedPerson = await person.getByUuidWithLineage(qualifier.uuid);

        expect(returnedPerson).to.equal(expectedPerson);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getWithLineage)).to.be.true;
        expect(personGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getPageByType', async () => {
        const expectedPeople: Page<Person.v1.Person> = {data: [], cursor: null};
        const personGetPage = sinon.stub().resolves(expectedPeople);
        dataContextBind.returns(personGetPage);
        const personType = 'person';
        const limit = 2;
        const cursor = '1';
        const personTypeQualifier = { contactType: personType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(personTypeQualifier);

        const returnedPeople = await person.getPageByType(personType, cursor, limit);

        expect(returnedPeople).to.equal(expectedPeople);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getPage)).to.be.true;
        expect(personGetPage.calledOnceWithExactly(personTypeQualifier, cursor, limit)).to.be.true;
        expect(byContactType.calledOnceWithExactly(personType)).to.be.true;
      });

      it('getByType', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const personGetAll = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(personGetAll);
        const personType = 'person';
        const personTypeQualifier = { contactType: personType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(personTypeQualifier);

        const res =  person.getByType(personType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Person.v1.getAll)).to.be.true;
        expect(personGetAll.calledOnceWithExactly(personTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(personType)).to.be.true;
      });
    });

    describe('contact', () => {
      let contact: typeof v1.contact;

      beforeEach(() => contact = v1.contact);

      it('contains expected keys', () => {
        expect(contact).to.have.all.keys(
          [
            'getByUuid',
            'getByUuidWithLineage',
            'getUuidsByTypeFreetext',
            'getUuidsPageByTypeFreetext',
            'getUuidsPageByFreetext',
            'getUuidsByFreetext',
            'getUuidsPageByType',
            'getUuidsByType',
          ]
        );
      });

      it('getByUuid', async () => {
        const expectedContact = {};
        const contactGet = sinon.stub().resolves(expectedContact);
        dataContextBind.returns(contactGet);
        const qualifier = { uuid: 'my-contact-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedContact = await contact.getByUuid(qualifier.uuid);

        expect(returnedContact).to.equal(expectedContact);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        expect(contactGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedContact = {};
        const contactGet = sinon.stub().resolves(expectedContact);
        dataContextBind.returns(contactGet);
        const qualifier = { uuid: 'my-contact-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedContact = await contact.getByUuidWithLineage(qualifier.uuid);

        expect(returnedContact).to.equal(expectedContact);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getWithLineage)).to.be.true;
        expect(contactGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getUuidsPageByTypeFreetext', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = {data: [], cursor: null};
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const freetext = 'abc';
        const contactType = 'person';
        const limit = 2;
        const cursor = '1';
        const contactTypeQualifier = { contactType };
        const freetextQualifier = { freetext };
        const qualifier = { contactType, freetext };
        const andQualifier = sinon.stub(Qualifier, 'and').returns(qualifier);
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const returnedContactIds = await contact.getUuidsPageByTypeFreetext(freetext, contactType, cursor, limit);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(
          contactGetIdsPage.calledOnceWithExactly(qualifier, cursor, limit)
        ).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
        expect(andQualifier.calledOnceWithExactly(freetextQualifier, contactTypeQualifier)).to.be.true;
      });

      it('getUuidsPageByType', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = {data: [], cursor: null};
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const contactType = 'person';
        const limit = 2;
        const cursor = '1';
        const contactTypeQualifier = { contactType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);
        const byFreetext = sinon.stub(Qualifier, 'byFreetext');

        const returnedContactIds = await contact.getUuidsPageByType(contactType, cursor, limit);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(
          contactGetIdsPage.calledOnceWithExactly(contactTypeQualifier, cursor, limit)
        ).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
        expect(byFreetext.notCalled).to.be.true;
      });

      it('getUuidsPageByFreetext', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = {data: [], cursor: null};
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const freetext = 'abc';
        const limit = 2;
        const cursor = '1';
        const freetextQualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);
        const byContactType = sinon.stub(Qualifier, 'byContactType');

        const returnedContactIds = await contact.getUuidsPageByFreetext(freetext, cursor, limit);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(
          contactGetIdsPage.calledOnceWithExactly(freetextQualifier, cursor, limit)
        ).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
        expect(byContactType.notCalled).to.be.true;
      });

      it('getUuidsByTypeFreetext', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const freetext = 'abc';
        const contactType = 'person';
        const contactTypeQualifier = { contactType };
        const freetextQualifier = {freetext };
        const qualifier = { contactType, freetext };
        const andQualifier = sinon.stub(Qualifier, 'and').returns(qualifier);
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const res =  contact.getUuidsByTypeFreetext(freetext, contactType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(qualifier)).to.be.true;
        expect(andQualifier.calledOnceWithExactly(freetextQualifier, contactTypeQualifier)).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
      });

      it('getUuidsByType', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const contactType = 'person';
        const contactTypeQualifier = { contactType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const res =  contact.getUuidsByType(contactType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(contactTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
      });

      it('getUuidsByFreetext', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const freetext = 'abc';
        const freetextQualifier = {freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);

        const res =  contact.getUuidsByFreetext(freetext);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(freetextQualifier)).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
      });
    });

    describe('report', () => {
      let report: typeof v1.report;

      beforeEach(() => report = v1.report);

      it('contains expected keys', () => {
        expect(report).to.have.all.keys([
          'getUuidsByFreetext', 'getUuidsPageByFreetext', 'getByUuid', 'getByUuidWithLineage'
        ]);
      });

      it('getByUuid', async () => {
        const expectedReport = {};
        const reportGet = sinon.stub().resolves(expectedReport);
        dataContextBind.returns(reportGet);
        const qualifier = { uuid: 'my-report-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedReport = await report.getByUuid(qualifier.uuid);

        expect(returnedReport).to.equal(expectedReport);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedReport = {};
        const reportGet = sinon.stub().resolves(expectedReport);
        dataContextBind.returns(reportGet);
        const qualifier = { uuid: 'my-report-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedReport = await report.getByUuidWithLineage(qualifier.uuid);

        expect(returnedReport).to.equal(expectedReport);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getWithLineage)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getUuidsPageByFreetext', async () => {
        const expectedReportIds: Page<Report.v1.Report> = {data: [], cursor: null};
        const reportGetIdsPage = sinon.stub().resolves(expectedReportIds);
        dataContextBind.returns(reportGetIdsPage);
        const freetext = 'abc';
        const limit = 2;
        const cursor = '1';
        const qualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(qualifier);

        const returnedContactIds = await report.getUuidsPageByFreetext(freetext, cursor, limit);

        expect(returnedContactIds).to.equal(expectedReportIds);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuidsPage)).to.be.true;
        expect(
          reportGetIdsPage.calledOnceWithExactly(qualifier, cursor, limit)
        ).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
      });

      it('getUuidsByFreetext', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const freetext = 'abc';
        const qualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(qualifier);

        const res =  report.getUuidsByFreetext(freetext);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Report.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
      });
    });

    describe('targetInterval', () => {
      let targetInterval: typeof v1.targetInterval;

      beforeEach(() => targetInterval = v1.targetInterval);

      it('contains expected keys', () => {
        expect(targetInterval).to.have.all.keys([
          'getByUuid', 'getByReportingPeriodContactUuidUsername',
          'getPageByReportingPeriodContactUuids', 'getByReportingPeriodContactUuids'
        ]);
      });

      it('getByUuid', async () => {
        const expectedTargetInterval = {};
        const reportGet = sinon.stub().resolves(expectedTargetInterval);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.byUuid('my-target-uuid');

        const returnedTarget = await targetInterval.getByUuid(qualifier.uuid);

        expect(returnedTarget).to.equal(expectedTargetInterval);
        expect(dataContextBind.calledOnceWithExactly(TargetInterval.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('getByReportingPeriodContactUuidUsername', async () => {
        const expectedTargetInterval = {};
        const reportGet = sinon.stub().resolves(expectedTargetInterval);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01' ),
          Qualifier.byContactUuid('my-contact-uuid'),
          Qualifier.byUsername('my-username')
        );

        const returnedTarget = await targetInterval.getByReportingPeriodContactUuidUsername(
          qualifier.reportingPeriod,
          qualifier.contactUuid,
          qualifier.username
        );

        expect(returnedTarget).to.equal(expectedTargetInterval);
        expect(dataContextBind.calledOnceWithExactly(TargetInterval.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('getPageByReportingPeriodContactUuids - multiple contact UUIDs', async () => {
        const expectedTargetInterval = {};
        const reportGet = sinon.stub().resolves(expectedTargetInterval);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactUuids(['my-first-contact-uuid', 'my-second-contact-uuid'])
        );

        const returnedTarget = await targetInterval.getPageByReportingPeriodContactUuids(
          qualifier.reportingPeriod,
          qualifier.contactUuids,
          '1',
          10
        );

        expect(returnedTarget).to.equal(expectedTargetInterval);
        expect(dataContextBind.calledOnceWithExactly(TargetInterval.v1.getPage)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier, '1', 10)).to.be.true; 
      });

      it('getPageByReportingPeriodContactUuids - since contact UUID', async () => {
        const expectedTargetInterval = {};
        const reportGet = sinon.stub().resolves(expectedTargetInterval);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactUuid('my-first-contact-uuid')
        );

        const returnedTarget = await targetInterval.getPageByReportingPeriodContactUuids(
          qualifier.reportingPeriod,
          qualifier.contactUuid,
          '1',
          10
        );

        expect(returnedTarget).to.equal(expectedTargetInterval);
        expect(dataContextBind.calledOnceWithExactly(TargetInterval.v1.getPage)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier, '1', 10)).to.be.true;
      });
      
      it('getByReportingPeriodContactUuids multiple contact UUIDs', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };
        const reportGet = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactUuids(['my-first-contact-uuid', 'my-second-contact-uuid'])
        );
        
        const returnedTarget = targetInterval.getByReportingPeriodContactUuids(
          qualifier.reportingPeriod,
          qualifier.contactUuids
        );
        
        expect(returnedTarget).to.deep.equal(mockAsyncGenerator);
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(TargetInterval.v1.getAll)).to.be.true;
      });

      it('getByReportingPeriodContactUuids since contact UUID', () => {
        const mockAsyncGenerator = async function* () {
          await Promise.resolve();
          yield [];
        };
        const reportGet = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactUuid('my-first-contact-uuid')
        );

        const returnedTarget = targetInterval.getByReportingPeriodContactUuids(
          qualifier.reportingPeriod,
          qualifier.contactUuid
        );

        expect(returnedTarget).to.deep.equal(mockAsyncGenerator);
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(TargetInterval.v1.getAll)).to.be.true;
      });
    });
  });
});
