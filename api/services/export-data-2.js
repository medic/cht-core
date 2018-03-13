const _ = require('underscore'),
      objectPath = require('object-path'),
      db = require('../db-pouch'),
      lineage = require('lineage')(Promise, db.medic);

const { Readable } = require('stream'),
      search = require('search')(Promise, db.medic);

const BATCH = 100;

const SUPPORTED_EXPORTS = ['reports'];

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

const CSV_MAPPER = {
  reports: (filters) => {
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
          fn: record => {
            return [
              record._id,
              record.form,
              record.patient_id,
              record.reported_date,
              record.from,
              objectPath.get(record, ['contact', 'name']),
              objectPath.get(record, ['contact', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'name']),
              objectPath.get(record, ['contact', 'parent', 'parent', 'parent', 'name'])
            ].concat(fieldColumns.map(c => objectPath.get(record.fields, c)));
          }
        };
      }));
  },


  // NB: we don't actually support this (note SUPPORTED_EXPORTS above), it's
  // here in the code to show a simpler examplen than the complicated forms one
  contacts: () => Promise.resolve({
    header: ['id', 'rev', 'name', 'patient_id', 'type'],
    fn: record => [record._id, record._rev, record.name, record.patient_id, record.type]
  })
};

const JOIN_COL = ',';
const JOIN_ROW = '\n';
class SearchResultReader extends Readable {

  constructor(type, filters, searchOptions, readableOptions) {
    super(readableOptions);

    this.type = type;
    this.filters = filters;
    this.options = searchOptions;

    // There is no reason for a user to pass a skip, but we're going to allow
    // users to pass a limit. This could be useful as an escape hatch / tweak in
    // production.
    this.options.skip = 0;
    this.options.limit = this.options.limit || BATCH;
  }

  static csvLineToString(csvLine) {
    const escapedCsvLine = csvLine.map(cell => {
      let escaped;

      // Strings and arrays (because they contain commas, might contain strings
      // etc) need to be quoted and escaped
      if (typeof cell === 'string') {
        escaped = cell.replace(/"/g, '\\"');
      } else if (Array.isArray(cell)) {
        escaped = JSON.stringify(cell).replace(/"/g, '\\"');
      } else {
        // We don't need to escape this
        return cell;
      }

      return `"${escaped}"`;
    });

    return escapedCsvLine.join(JOIN_COL);
  }

  _read() {
    if (!this.csvFn) {
      return CSV_MAPPER[this.type](this.filters, this.options)
        .then(({ header, fn }) => {
          this.csvFn = fn;
          this.push(header.join(JOIN_COL) + JOIN_ROW);
        });
    }

    return search(this.type, this.filters, this.options)
      .then(ids => {

        if (!ids.length) {
          return this.push(null);
        }

        this.options.skip += this.options.limit;

        return db.medic.allDocs({
          keys: ids,
          include_docs: true
        })
        .then(result => result.rows.map(row => row.doc))
        .then(lineage.hydrateDocs)
        .then(docs =>
          this.push(
            docs
             .map(this.csvFn)
             .map(SearchResultReader.csvLineToString)
             .join(JOIN_ROW) + JOIN_ROW // new line at the end
          )
        );
      })
      .catch(err => {
        process.nextTick(() => this.emit('error', err));
      });
  }
}

module.exports = {
  export: (type, filters, options) => new SearchResultReader(type, filters, options),
  supportedExports: SUPPORTED_EXPORTS,
  _flatten: flatten,
  _lineage: lineage
};
