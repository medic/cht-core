const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const { Report, Qualifier} = require('@medic/cht-datasource');
const {expect} = require('chai');
const { DOC_TYPES } = require('@medic/constants');

describe('Report Controller Tests', () => {
  const sandbox = sinon.createSandbox();
  const reportGet = sandbox.stub();
  const reportGetWithLineage = sandbox.stub();
  const reportGetIdsPage = sandbox.stub();
  const reportGetPage = sandbox.stub();
  const reportGetSummaries = sandbox.stub();
  const createReport = sandbox.stub();
  const updateReport = sandbox.stub();

  let serverUtilsError;
  let assertPermissions;
  let req;
  let res;
  let controller;

  before(() => {
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Report.v1.get).returns(reportGet);
    bind.withArgs(Report.v1.getWithLineage).returns(reportGetWithLineage);
    bind.withArgs(Report.v1.getUuidsPage).returns(reportGetIdsPage);
    bind.withArgs(Report.v1.getPage).returns(reportGetPage);
    bind.withArgs(Report.v1.getSummaries).returns(reportGetSummaries);
    bind.withArgs(Report.v1.create).returns(createReport);
    bind.withArgs(Report.v1.update).returns(updateReport);
    controller = require('../../../src/controllers/report');
  });

  beforeEach(() => {
    serverUtilsError = sinon.stub(serverUtils, 'error');
    assertPermissions = sinon.stub(auth, 'assertPermissions').resolves();
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    // Every list query param is parsed the same way on every route: comma-joined or repeated, empty
    // entries dropped, and rejected with one message shape when it is empty, padded or object-shaped.
    // An older param on the same route wins. Each call pins that contract for one param on one route;
    // anything specific to a route stays as its own test.
    const describeListParam = ({
      title, action, boundFn, param, invalidName, build, values, emptyValue, losesTo
    }) => describe(title, () => {
      const limit = 100;
      const cursor = null;
      const page = { data: [], cursor: null };
      const [first, second] = values;
      const expectQueried = (qualifier) => {
        expect(boundFn.calledOnceWithExactly(qualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(page)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      };
      const expectRejected = (message) => {
        expect(boundFn.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.args[0][0].name).to.equal('InvalidArgumentError');
        expect(serverUtilsError.args[0][0].message).to.equal(message);
      };

      beforeEach(() => boundFn.resolves(page));

      it('builds the qualifier from a comma-separated list', async () => {
        req = { query: { [param]: `${first},${second}`, cursor, limit } };

        await controller.v1[action](req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expectQueried(build([first, second]));
      });

      it('builds the qualifier from a repeated query param', async () => {
        req = { query: { [param]: [first, second], cursor, limit } };

        await controller.v1[action](req, res);

        expectQueried(build([first, second]));
      });

      it('accepts a single value', async () => {
        req = { query: { [param]: first, cursor, limit } };

        await controller.v1[action](req, res);

        expectQueried(build([first]));
      });

      it('ignores empty entries in the list', async () => {
        req = { query: { [param]: `${first},,${second},`, cursor, limit } };

        await controller.v1[action](req, res);

        expectQueried(build([first, second]));
      });

      it(`errors without querying when ${param} is ${JSON.stringify(emptyValue)}`, async () => {
        req = { query: { [param]: emptyValue, cursor, limit } };

        await controller.v1[action](req, res);

        expectRejected(`Invalid ${invalidName} [[]].`);
      });

      it('errors without querying when a value is padded', async () => {
        req = { query: { [param]: `  ${first}  `, cursor, limit } };

        await controller.v1[action](req, res);

        expectRejected(`Invalid ${invalidName} [["  ${first}  "]].`);
      });

      it('errors without querying when the param is object-shaped', async () => {
        // `?${param}[a]=b` parses to an object, which has nothing to split.
        req = { query: { [param]: { a: 'b' }, cursor, limit } };

        await controller.v1[action](req, res);

        expectRejected(`Invalid ${invalidName} [{"a":"b"}].`);
      });

      losesTo.forEach(({ query, qualifier }) => {
        it(`is ignored in favour of ${Object.keys(query).join()} when both are given`, async () => {
          req = { query: { ...query, [param]: first, cursor, limit } };

          await controller.v1[action](req, res);

          expectQueried(qualifier);
        });
      });
    });

    describe('get', () => {
      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
      });

      it('returns a report', async () => {
        const report = { name: 'John Doe\'s Report', type: DOC_TYPES.DATA_RECORD, form: 'yes' };
        reportGet.resolves(report);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a report with lineage when the query parameter is set to "true"', async () => {
        const report = { name: 'John Doe\'s Report', type: DOC_TYPES.DATA_RECORD, form: 'yes' };
        reportGetWithLineage.resolves(report);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.notCalled).to.be.true;
        expect(reportGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a report without lineage when the query parameter is set something else', async () => {
        const report = { name: 'John Doe\'s Report', type: DOC_TYPES.DATA_RECORD, form: 'yes' };
        reportGet.resolves(report);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(reportGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if report is not found', async () => {
        reportGet.resolves(null);
        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Report not found' },
          req,
          res
        )).to.be.true;
      });
    });

    describe('getUuids', () => {
      const freetext = 'report';
      const freetexQualifier = Qualifier.byFreetext(freetext);
      const report = { name: 'Nice report', type: DOC_TYPES.DATA_RECORD, form: 'yes' };
      const limit = 100;
      const cursor = null;
      const reports = Array.from({ length: 3 }, () => ({ ...report }));

      beforeEach(() => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
      });

      it('returns a page of report ids', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a page of report ids for undefined limit', async () => {
        req = {
          query: {
            freetext,
            cursor,
          }
        };
        reportGetIdsPage.resolves(reports);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGetIdsPage.calledOnceWithExactly(freetexQualifier, cursor, undefined)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });
    });

    describe('getUuids without any qualifier', () => {
      it('still reports a missing freetext', async () => {
        req = { query: { cursor: null, limit: 100 } };

        await controller.v1.getUuids(req, res);

        expect(reportGetIdsPage.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.args[0][0].name).to.equal('InvalidArgumentError');
        expect(serverUtilsError.args[0][0].message).to.equal('Invalid freetext [undefined].');
      });
    });

    describeListParam({
      title: 'getUuids by form',
      action: 'getUuids',
      boundFn: reportGetIdsPage,
      param: 'form',
      invalidName: 'forms',
      build: Qualifier.byForms,
      values: ['pregnancy', 'delivery'],
      // `?form=` with no value must reject with the list message rather than fall through to freetext.
      emptyValue: '',
      losesTo: [
        { query: { freetext: 'report' }, qualifier: Qualifier.byFreetext('report') },
      ],
    });

    describeListParam({
      title: 'getUuids by subject',
      action: 'getUuids',
      boundFn: reportGetIdsPage,
      param: 'subject',
      invalidName: 'subjects',
      build: Qualifier.bySubjects,
      values: ['patient-shortcode', '3d1a2b4c-0000-4000-8000-000000000001'],
      emptyValue: '',
      losesTo: [
        { query: { freetext: 'report' }, qualifier: Qualifier.byFreetext('report') },
        { query: { form: 'pregnancy' }, qualifier: Qualifier.byForms(['pregnancy']) },
      ],
    });

    describe('getAll', () => {
      const limit = 100;
      const cursor = null;
      const reports = { data: [{ type: DOC_TYPES.DATA_RECORD, form: 'yes' }], cursor: null };

      it('returns a page of reports for the given comma-separated ids', async () => {
        req = { query: { ids: 'a,b,c', cursor, limit } };
        const idsQualifier = { ids: ['a', 'b', 'c'] };
        const qualifierByIds = sinon.stub(Qualifier, 'byIds').returns(idsQualifier);
        reportGetPage.resolves(reports);

        await controller.v1.getAll(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(qualifierByIds.calledOnceWithExactly(['a', 'b', 'c'])).to.be.true;
        expect(reportGetPage.calledOnceWithExactly(idsQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(reports)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 400 error when neither ids nor subject is provided', async () => {
        req = { query: { cursor, limit } };

        await controller.v1.getAll(req, res);

        expect(reportGetPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 400, message: 'Either query param ids or subject is required' },
          req,
          res
        )).to.be.true;
      });

      it('returns an error when the ids param resolves to an empty list', async () => {
        req = { query: { ids: ',', cursor, limit } };

        await controller.v1.getAll(req, res);

        expect(reportGetPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.called).to.be.true;
      });
    });

    describeListParam({
      title: 'getAll by subject',
      action: 'getAll',
      boundFn: reportGetPage,
      param: 'subject',
      invalidName: 'subjects',
      build: Qualifier.bySubjects,
      values: ['patient-shortcode', '3d1a2b4c-0000-4000-8000-000000000001'],
      // `?subject=` with no value is caught by the missing-param 400 above, so the empty-list case
      // here is a list of empty entries.
      emptyValue: ',,',
      losesTo: [
        { query: { ids: 'a,b' }, qualifier: Qualifier.byIds(['a', 'b']) },
      ],
    });

    describe('getSummaries', () => {
      it('returns summaries for the provided ids', async () => {
        const ids = ['a', 'b'];
        const summaries = [{ _id: 'a' }, { _id: 'b' }];
        req = { body: { ids } };
        reportGetSummaries.returns((async function* () {
          yield* summaries;
        })());

        await controller.v1.getSummaries(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_reports'] }
        )).to.be.true;
        expect(reportGetSummaries.calledOnceWithExactly({ ids })).to.be.true;
        expect(res.json.calledOnceWithExactly(summaries)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });
    });

    describe('create', () => {
      it('returns a report doc on valid report input', async () => {
        const input = {
          type: 'report',
          reported_date: 12312312,
          form: 'form-1',
          contact: 'c1'
        };
        req = { body: input };
        const report = { ...input, _id: '1-id', _rev: '1-rev' };
        createReport.resolves(report);

        await controller.v1.create(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_create_records', 'can_edit'] }
        )).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(createReport.calledOnceWithExactly(input)).to.be.true;
        expect(res.json.calledOnceWithExactly(report)).to.be.true;
      });
    });

    describe('update', () => {
      it('updates report for valid update input', async() => {
        const updateInput = {
          type: 'report',
          reported_date: 12312312,
          _id: '1',
          _rev: '2',
          contact: {
            _id: '3'
          },
          form: 'abcd'
        };
        req = {
          params: { uuid: '1' },
          body: updateInput
        };
        const updatedReport = { ...updateInput, rev: '2-rev' };
        updateReport.resolves(updatedReport);

        await controller.v1.update(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAny: ['can_update_reports', 'can_edit'] }
        )).to.be.true;
        expect(updateReport.calledOnceWithExactly(updateInput)).to.be.true;
        expect(serverUtilsError.called).to.be.false;
        expect(res.json.calledOnceWithExactly(updatedReport)).to.be.true;
      });
    });
  });
});
