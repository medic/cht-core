const _ = require('lodash/core');
const moment = require('moment');
const logger = require('@medic/logger');
const phoneNumberParser = require('@medic/phone-number');
const config = require('../../transitions/src/config');
const { Qualifier, Report } = require('@medic/cht-datasource');

let db;
let dataContext;

const lowerCaseString = obj => typeof obj === 'string' ? obj.toLowerCase() : obj;

const executeChtDatasourceExistsRequest = async (freetext) => {
  const getReportUuids = dataContext.bind(Report.v1.getUuids);
  const reportUuids = [];
  const generator = await getReportUuids(Qualifier.byFreetext(freetext));

  for await (const uuid of generator) {
    reportUuids.push(uuid);
  }

  return reportUuids;
};

const getIntersection = responses => {
  let ids = responses.pop();
  responses.forEach(response => {
    ids = ids.filter(id => _.find(response, item => item === id));
  });
  return ids;
};

const parseDuration = (duration) => {
  const parts = duration.split(' ');
  return moment.duration(parseInt(parts[0]), parts[1]);
};

const parseStartDate = (duration) => {
  if (!duration) {
    return;
  }
  const parsed = parseDuration(duration);
  return moment().subtract(parsed).valueOf();
};

const getExistsRequestOptions = (fields, doc) => {
  return fields.map(field => {
    return `${field}:${lowerCaseString(doc[field])}`;
  });
};

const addAdditionalFilters = (options, requestOptions) => {
  if (options.additionalFilter) {
    const lowerCaseAdditionalFilter = lowerCaseString(options.additionalFilter);
    requestOptions.push(lowerCaseAdditionalFilter);
  }
};

const getExistsResponses = async requestOptions => {
  const responses = [];
  for (const options of requestOptions) {
    const response = await executeChtDatasourceExistsRequest(options);
    responses.push(response);
  }
  return responses;
};

const exists = async (doc, fields, options = {}) => {
  if (!fields.length) {
    return Promise.reject('No arguments provided to "exists" validation function');
  }
  const requestOptions = getExistsRequestOptions(fields, doc);
  addAdditionalFilters(options, requestOptions);
  const responses = await getExistsResponses(requestOptions);

  const ids = getIntersection(responses).filter(id => id !== doc._id);
  if (!ids.length) {
    return false;
  }

  const result = await db.medic.allDocs({ keys: ids, include_docs: true });
  const startDate = parseStartDate(options.duration);
  // filter out docs with errors
  return result.rows.some(row => {
    const doc = row.doc;
    return (
      (!doc.errors || doc.errors.length === 0) &&
      (!startDate || doc.reported_date >= startDate)
    );
  });
};

const compareDateAfter = (testDate, reportedDate, duration) => {
  const controlDate = reportedDate.add(duration);
  return testDate.isSameOrAfter(controlDate, 'days');
};

const checkDateBefore = (testDate, reportedDate, duration) => {
  const controlDate = reportedDate.subtract(duration);
  return testDate.isSameOrBefore(controlDate, 'days');
};

const compareDate = (doc, date, durationString, checkAfter=false) => {
  try {
    const duration = parseDuration(durationString);
    if (!duration.isValid()) {
      logger.error('date constraint validation: the duration is invalid');
      return false;
    }
    const testDate = moment(date);
    if (!testDate.isValid()) {
      logger.error('date constraint validation: the date is invalid');
      return false;
    }
    const reportedDate = moment(doc.reported_date);
    if (checkAfter) {
      return compareDateAfter(testDate, reportedDate, duration);
    }
    return checkDateBefore(testDate, reportedDate, duration);
  } catch (err) {
    logger.error('date constraint validation: the date or duration is invalid: %o', err);
    return false;
  }
};

const isISOWeek = (doc, weekFieldName, yearFieldName) => {
  if (!_.has(doc, weekFieldName) || (yearFieldName && !_.has(doc, yearFieldName))) {
    logger.error('isISOWeek validation failed: input field(s) do not exist');
    return false;
  }

  const year = yearFieldName ? doc[yearFieldName] : new Date().getFullYear();
  const week = doc[weekFieldName];
  return /^\d{1,2}$/.test(week) &&
    /^\d{4}$/.test(year) &&
    week >= 1 &&
    week <= moment().year(year).isoWeeksInYear();
};

const validPhone = (value) => {
  const appSettings = config.getAll();
  return phoneNumberParser.validate(appSettings, value);
};

const uniquePhone = async (value) => {
  const results = await db.medic.query('medic-client/contacts_by_phone', { key: value });
  return !results?.rows?.length;
};

module.exports = {
  init: (_db, _dataContext) => {
    db = _db;
    dataContext = _dataContext;
  },
  exists,
  compareDate,
  isISOWeek,
  validPhone,
  uniquePhone
};
