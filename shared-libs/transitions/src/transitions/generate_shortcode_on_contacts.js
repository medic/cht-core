const config = require('../config');
const db = require('../db');
const utils = require('../lib/utils');
const transitionUtils = require('./utils');
const contactTypeUtils = require('@medic/contact-types-utils');
const { DOC_TYPES } = require('@medic/constants');
const NAME = 'generate_shortcode_on_contacts';

const hasReportPatientId = doc => Boolean(doc.patient_id || doc.fields?.patient_id);

const getReportPatientId = doc => doc.patient?.patient_id;

const getReportPatientUuid = doc => doc.patient_uuid || doc.fields?.patient_uuid;

const hasReportPatientUuid = doc => Boolean(getReportPatientUuid(doc));

const shouldUpdateReportPatientId = doc => Boolean(
  doc &&
  doc.type === DOC_TYPES.DATA_RECORD &&
  hasReportPatientUuid(doc) &&
  getReportPatientId(doc) &&
  !hasReportPatientId(doc)
);

const addPatientIdToReport = (doc, patientId) => {
  if (!patientId || hasReportPatientId(doc)) {
    return false;
  }

  if (doc.fields) {
    doc.fields.patient_id = patientId;
  } else {
    doc.patient_id = patientId;
  }

  return true;
};

const updateReports = doc => {
  if (!doc._id || !doc.patient_id) {
    return Promise.resolve();
  }

  return utils.getReportsBySubject({ id: doc._id }).then(reports => {
    const updatedReports = reports.filter(report => {
      return getReportPatientUuid(report) === doc._id && addPatientIdToReport(report, doc.patient_id);
    });
    if (!updatedReports.length) {
      return;
    }

    return db.medic.bulkDocs(updatedReports);
  });
};

module.exports = {
  name: NAME,
  asynchronousOnly: true,
  filter: ({ doc }) => {
    if (shouldUpdateReportPatientId(doc)) {
      return true;
    }

    const contactType = contactTypeUtils.getContactType(config.getAll(), doc);
    if (!contactType) {
      return;
    }

    if (contactTypeUtils.isPersonType(contactType) && doc.patient_id) {
      return; // person type that already had patient_id
    }

    if (contactTypeUtils.isPlaceType(contactType) && doc.place_id) {
      return; // contact type that already has place_id
    }

    return true;
  },
  onMatch: change => {
    if (shouldUpdateReportPatientId(change.doc)) {
      addPatientIdToReport(change.doc, getReportPatientId(change.doc));
      return Promise.resolve(true);
    }

    return transitionUtils
      .getUniqueId()
      .then(id => {
        const isPerson = contactTypeUtils.isPerson(config.getAll(), change.doc);
        const prop = isPerson ? 'patient_id' : 'place_id';
        change.doc[prop] = id;
        if (!isPerson) {
          return true;
        }

        return updateReports(change.doc).then(() => true);
      });
  }
};
