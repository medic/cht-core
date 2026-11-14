const _ = require('lodash');
const objectPath = require('object-path');
const db = require('../../db');
const dateFormat = require('./date-format');
const dataContext = require('../data-context');
const { Report } = require('@medic/cht-datasource');
const search = require('@medic/search')(db.medic, dataContext);
const lineage = require('@medic/lineage')(Promise, db.medic);
const countReportsByForm = dataContext.bind(Report.v1.countByForm);
const getReportSamplesByForms = dataContext.bind(Report.v1.getSamplesByForms);

// Flattens a given object into an object where the keys are dot-notation
// paths to the flattened values:
// {
//   "foo": {
//     "bar": "smang"
//   }
// }
//
// becomes:
//
// {
//   "foo.bar": "smang"
// }
const flatten = (fields, prepend=[]) => {
  return Object.keys(fields).reduce((acc, k) => {
    const path = [...prepend, k];

    if (typeof fields[k] === 'object' && fields[k] && !Array.isArray(fields[k])) {
      // Recurse into valid objects. We ignore arrays as they are variable
      // length, so you can't generate a stable header out of them. Instead,
      // when we convert them into CSV we JSON.stringify them and treat them as
      // one cell.
      Object.assign(acc, flatten(fields[k], path));
    } else {
      acc[path.join('.')] = fields[k];
    }

    return acc;
  }, {});
};

module.exports = {
  getDocs: ids => lineage.fetchHydratedDocs(ids),
  getDocIds: (options, filters) => {
    return search('reports', filters, options).then(results => results.docIds);
  },
  map: (filters, options) => {
    // Either selected forms or all currently used forms
    const getForms = () => {
      const forms = (
        filters &&
        filters.forms &&
        filters.forms.selected &&
        _.map(filters.forms.selected, 'code'));

      if (forms) {
        return Promise.resolve(forms);
      }

      return countReportsByForm().then(counts => Object.keys(counts));
    };

    // Take an array of the fields property of reports and generate a unique
    // list of sorted CSV columns
    const uniqueColumns = allFields => _.union(
      ...allFields.map(f => Object.keys(flatten(f)))
    ).sort();

    return getForms()
      .then(forms => {
        const getRecordColumns = (fieldColumns, record) => {
          return [
            [
              record._id,
              record.form,
              record.patient_id,
              dateFormat.format(record.reported_date, options.humanReadable),
              record.from,
              objectPath.get(record, ['contact', 'name']),
              objectPath.get(record, ['contact', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'parent', 'name'])
            ].concat(fieldColumns.map(c => objectPath.get(record.fields, c)))
          ];
        };
        const validForms = forms.filter(form => typeof form === 'string' && form.length > 0 && form === form.trim());
        const samplesPromise = validForms.length ? getReportSamplesByForms(validForms) : Promise.resolve([]);
        return samplesPromise
          .then(samples => {
            const fieldsByForm = new Map(samples.map(report => [report.form, report.fields]));
            const allFields = forms.map(form => fieldsByForm.get(form));
            // Filter on identity as you can select forms that have no reports
            const fieldColumns = uniqueColumns(allFields.filter(field => field));

            const allColumns = [
              '_id',
              'form',
              'patient_id',
              'reported_date',
              'from',
              'contact.name',
              'contact.parent.name',
              'contact.parent.parent.name',
              'contact.parent.parent.parent.name'
            ].concat(fieldColumns);

            return {
              header: allColumns,
              getRows: (record) => getRecordColumns(fieldColumns, record),
            };
          });
      });
  },
  _flatten: flatten,
};
