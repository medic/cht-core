const _ = require('underscore'),
      objectPath = require('object-path'),
      moment = require('moment'),
      db = require('../../db-pouch'),
      search = require('search')(Promise, db.medic);

/**
 * Flattens a given object into an object where the keys are dot-notation
 * paths to the flattened values:
 * {
 *   "foo": {
 *     "bar": "smang"
 *   }
 * }
 *
 * becomes:
 *
 * {
 *   "foo.bar": "smang"
 * }
 */
const flatten = (fields, prepend=[]) => {
  return Object.keys(fields).reduce((acc, k) => {
    const path = [...prepend, k];

    if (typeof fields[k] === 'object' && fields[k] && !Array.isArray(fields[k])) {
      // Recurse into valid objects. We ignore arrays as they are variable
      // length, so you can't generate a stable header out of them. Instead,
      // when we convert them into CSV we JSON.stringify them and treat them as
      // one cell.
      _.extend(acc, flatten(fields[k], path));
    } else {
      acc[path.join('.')] = fields[k];
    }

    return acc;
  }, {});
};

module.exports = {
  getDocIds: (options, filters) => search('reports', filters, options),
  map: (filters) => {
    // Either selected forms or all currently used forms
    const getForms = () => {
      const forms = (
        filters &&
        filters.forms &&
        filters.forms.selected &&
        _.pluck(filters.forms.selected, 'code'));

      if (forms) {
        return Promise.resolve(forms);
      } else {
        return db.medic.query('medic-client/reports_by_form', {group: true})
                .then(results => results.rows.map(r => r.key[0]));
      }
    };

    // Take an array of the fields property of reports and generate a unique
    // list of sorted CSV columns
    const uniqueColumns = allFields => _.union(
      ...allFields.map(f => Object.keys(flatten(f)))
    ).sort();

    const formatDate = date => {
      if (!date) {
        return '';
      }
      return moment(date).valueOf();
    };

    return getForms().then(forms =>
      Promise.all(forms.map(form =>
        db.medic.query('medic-client/reports_by_form', {
          key: [form],
          limit: 1,
          include_docs: true,
          reduce: false
        })
        .then(results =>
          results.rows[0] &&
          results.rows[0].doc &&
          results.rows[0].doc.fields
        ))
      ).then(allFields => {
        // Filter on identity as you can select forms that have no reports
        const fieldColumns = uniqueColumns(allFields.filter(_.identity));

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
          getRows: record => {
            return [[
              record._id,
              record.form,
              record.patient_id,
              formatDate(record.reported_date),
              record.from,
              objectPath.get(record, ['contact', 'name']),
              objectPath.get(record, ['contact', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'parent', 'name'])
            ].concat(fieldColumns.map(c => objectPath.get(record.fields, c)))];
          }
        };
      }));
  },
  _flatten: flatten,
};
