const _ = require('underscore');

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
// https://github.com/medic/medic-webapp/issues/XXXX
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
    return Promise.resolve();
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
// TODO: is there really not a utility that does this?
const flatten = (fields, prepend=[]) =>
  Object.keys(fields).reduce((acc, k) => {
    const path = [...prepend, k];
    if (typeof fields[k] === 'object' && fields[k]) {
      return _.extend(acc, flatten(fields[k], path));
    } else {
      acc[path.join('.')] = fields[k] || '';
      return acc;
    }
  }, {});

// TODO: is there really not a utility that does this?
const safeGet = (obj, fields) => {
  let v = obj;
  for (const f of fields) {
    v = v[f];
    if (!v) {
      return undefined;
    }
  }
  return v;
};

const CSV_MAPPER = {
  reports: (filters) => {
    const forms = (
      filters &&
      filters.forms &&
      filters.forms.selected &&
      _.pluck(filters.forms.selected, 'code'));

    let p = Promise.resolve();
    // If they have not selected any forms we need to get all available ones
    if (!forms) {
      p = p.then(() =>
        DB.query('medic-client/reports_by_form', {
          group: true
        }).then(results => results.rows.map(r => r.key[0]))
      );
    } else {
      p = p.then(() => forms);
    }

    // Determine the fields for each form we care about
    return p.then(forms =>
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
        const fieldColumns = _.union(
          ...allFields.filter(f => f).map(f => Object.keys(flatten(f)))
        ).sort();

        const allColumns = [
          '_id',
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
            const flattened = flatten(record.fields);

            return [
              record._id,
              record.patient_id,
              record.reported_date,
              record.from,
              safeGet(record, ['contact', 'name']),
              safeGet(record, ['contact', 'parent', 'name']),
              safeGet(record, ['contact', 'parent', 'parent', 'name']),
              safeGet(record, ['contact', 'parent', 'parent', 'parent', 'name'])
            ].concat(fieldColumns.map(c => flattened[c]));
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
      return Promise.resolve()
        .then(() => CSV_MAPPER[this.type](this.filters, this.options))
        .then(({ header, fn }) => {
          this.csvFn = fn;
          this.push(header.join(JOIN_COL) + JOIN_ROW);
        });
    }

    return Promise.resolve()
      .then(() => search(this.type, this.filters, this.options))
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
             .map(csvLine => csvLine.join(JOIN_COL))
             .map(lines => lines + JOIN_ROW).join('')
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
