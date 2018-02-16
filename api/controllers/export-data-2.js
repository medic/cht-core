const _ = require('underscore'),
      objectPath = require('object-path');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const DB = new PouchDB(process.env.COUCH_URL);

const { Readable } = require('stream'),
      search = require('search')(Promise, DB);

const BATCH = 100;

const JOIN_COL = ',';
const JOIN_ROW = '\n';

const SUPPORTED_EXPORTS = ['reports'];


//
// TODO: these functions is copied from `export-data.js`, and modified to use
// PouchDB / promises. We should remove both copies of these functions and create
// a shared lineage library that we can use here, as well as in the rest of api,
// sentinel and webapp.
//
// lineage.js in sentinel is probably the most comprehensive lineage library
// right now, though it would need to be ES5-a-fied if we wanted to use it on
// the front end.
//
// https://github.com/medic/medic-webapp/issues/3826
//
const findContact = (contactRows, id) => {
  return id && contactRows.find(contactRow => contactRow.id === id);
};
const hydrateDataRecords = result => {
  const rows = result.rows;

  const contactIds = [];
  rows.forEach(row => {
    let parent = row.doc.contact;
    while(parent) {
      if (parent._id) {
        contactIds.push(parent._id);
      }
      parent = parent.parent;
    }
  });

  if (!contactIds.length) {
    return Promise.resolve(result);
  }

  return DB.allDocs({
    keys: contactIds,
    include_docs: true
  }).then(results => {
    rows.forEach(row => {
      const contactId = row.doc.contact && row.doc.contact._id;
      const contact = findContact(results.rows, contactId);
      if (contact) {
        row.doc.contact = contact.doc;
      }
      let parent = row.doc.contact;
      while(parent) {
        const parentId = parent.parent && parent.parent._id;
        const found = findContact(results.rows, parentId);
        if (found) {
          parent.parent = found.doc;
        }
        parent = parent.parent;
      }
    });

    return result;
  });
};


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
const flatten = (fields, prepend=[]) =>
  Object.keys(fields).reduce((acc, k) => {
    const path = [...prepend, k];
    if (typeof fields[k] === 'object' && fields[k]) {
      return _.extend(acc, flatten(fields[k], path));
    } else {
      acc[path.join('.')] = fields[k];
      return acc;
    }
  }, {});

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
        return DB.query('medic-client/reports_by_form', {group: true})
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
        DB.query('medic-client/reports_by_form', {
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

        return DB.allDocs({
          keys: ids,
          include_docs: true
        })
        .then(hydrateDataRecords)
        .then(results =>
          this.push(
            _.pluck(results.rows, 'doc')
             .map(this.csvFn)
             // TODO: pass this through a better CSV generator:
             //  - quote things
             //  - escape quotes
             //  - ???
             .map(csvLine => csvLine.join(JOIN_COL))
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
  _flatten: flatten
};
