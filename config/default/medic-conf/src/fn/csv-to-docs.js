const stringify = require('canonical-json/index2');
const uuid5 = require('uuid/v5');

const environment = require('../lib/environment');
const fs = require('../lib/sync-fs');
const { info, warn } = require('../lib/log');
const generateCsv = require('../lib/generate-users-csv');
const safeStringify = require('../lib/safe-stringify');

const pretty = o => JSON.stringify(o, null, 2);

const RESERVED_COL_NAMES = [ 'type', 'form' ];
const REF_MATCHER = /^(?:GET )?((\w+) OF )?(\w+) WHERE (.*)$/i;
const PLACE_TYPES = [ 'clinic', 'district_hospital', 'health_center' ];

let NOW = new Date().getTime();

require('../lib/polyfill');

const execute = () => {
  const couchUrlUuid = uuid5('http://medicmobile.org/configurer/csv-to-docs/permanent-hash', uuid5.URL);

  const csvDir = `${environment.pathToProject}/csv`;
  if(!fs.exists(csvDir)) {
    warn(`No csv directory found at ${csvDir}.`);
    return Promise.resolve();
  }

  const jsonDir = `${environment.pathToProject}/json_docs`;
  fs.mkdir(jsonDir);

  const saveJsonDoc = doc => fs.write(`${jsonDir}/${doc._id}.doc.json`, safeStringify(doc) + '\n');

  const model = {
    csvFiles: {},
    docs: {},
    references: [],
    exclusions: [],
    users: []
  };
  const addToModel = (csvFile, docs) => {
    csvFile = csvFile.match(/^(?:.*[\/\\])?csv[\/\\](.*)\.csv$/)[1]; // eslint-disable-line no-useless-escape
    model.csvFiles[csvFile] = docs;
    docs.forEach(doc => {
      model.docs[doc._id] = doc;
      if (doc.type === 'user') {
        model.users.push(doc);
      }
    });
  };

  return fs.recurseFiles(csvDir)
    .filter(name => name.endsWith('.csv'))
    .reduce((promiseChain, csv) =>
        promiseChain
          .then(() => {
            info('Processing CSV file:', csv, '…');

            const nameParts = fs.path.basename(csv).split('.');
            const prefix = nameParts[0];
            switch(prefix) {
              case 'contact': return processContacts('contact', csv);
              case 'person':  return processPersons(csv);
              case 'place':   return processPlaces(csv);
              case 'report':  return processReports(nameParts[1], csv);
              case 'users' :  return processUsers(csv);
              default: throw new Error(`Unrecognised CSV type ${prefix} for file ${csv}`);
            }
          })
          .then(docs => addToModel(csv, docs)),
      Promise.resolve())

    .then(() => model.references.forEach(updateRef))
    .then(() => model.exclusions.forEach(removeExcludedField))
    .then(() => {
      if(model.users.length) {
        generateCsv(model.users, environment.pathToProject + '/users.csv');
      }
    })
    .then(() => Promise.all(Object.values(model.docs).map(saveJsonDoc)));

  function updateRef(ref) {
    const match = ref.matcher.match(REF_MATCHER);
    const [, , propertyName, type, where] = match;

    const referencedDoc = Object.values(model.docs).find(doc => {
      return matchesType(type, doc) && matchesWhereClause(where, doc, ref.colVal);
    });

    if(!referencedDoc) {
      throw new Error(`Failed to match reference ${pretty(ref)}`);
    }

    ref.doc[ref.targetProperty] = propertyName ? referencedDoc[propertyName] : referencedDoc;
  }

  function processPersons(csv) {
    return processContacts('person', csv);
  }

  function processPlaces(csv) {
    const placeType = fs.path.basename(csv).split('.')[1];
    return processContacts(placeType, csv);
  }

  function processReports(report_type, csv) {
    const { rows, cols } = fs.readCsv(csv);
    return rows
      .map(r => processCsv('data_record', cols, r, { form:report_type }));
  }

  function processContacts(contactType, csv) {
    const { rows, cols } = fs.readCsv(csv);
    return rows
      .map(r => processCsv(contactType, cols, r));
  }

  function processUsers(csv){
    const { rows, cols } = fs.readCsv(csv);
    return rows
      .map(r => processCsv('user', cols, r));
  }

  function processCsv(docType, cols, row, baseDoc) {
    const doc = baseDoc || {};
    doc.type = docType;

    for(let i=0; i<cols.length; ++i) {
      const { col, val, reference, excluded } = parseColumn(cols[i], row[i]);
      setCol(doc, col, val);
      if(reference) model.references.push({
        doc: doc,
        matcher: reference,
        colVal: val,
        targetProperty: col,
      });
      if(excluded) model.exclusions.push({
        doc: doc,
        propertyName: col,
      });
    }

    return withId(doc);
  }

  function withId(json) {
    const id = uuid5(stringify(json), couchUrlUuid);
    json._id = id;
    return json;
  }
};

function setCol(doc, col, val) {
  const colParts = col.split('.');

  if(RESERVED_COL_NAMES.includes(colParts[0]))
    throw new Error(`Cannot set property defined by column '${col}' - this property name is protected.`);

  while(colParts.length > 1) {
    col = colParts.shift();
    if(!doc[col]) doc[col] = {};
    doc = doc[col];
  }
  doc[colParts[0]] = val;
}

function parseTimestamp(t) {
  if(isIntegerString(t)) return int(t);
  else return Date.parse(t);
}

function parseBool(b) {
  if(isIntegerString(b)) return b !== '0';
  else return b.toLowerCase() === 'true';
}

function calcRelTimestampInDays(b) {
  return NOW + (parseInt(b) * 24 * 60 * 60 * 1000);
}

function calcRelTimestampInMilliseconds(b) {
  return NOW + parseInt(b);
}

function isIntegerString(s) {
  return int(s).toString() === s;
}

function int(s) {
  return Number.parseInt(s, 10);
}

function isReference(s) {
  return s.match(REF_MATCHER);
}

function matchesType(type, doc) {
  return doc.type === type ||
         doc.contact_type === type ||
         (type === 'place' && PLACE_TYPES.includes(doc.type));
}

function matchesWhereClause(where, doc, colVal) {
  const whereMatch = where.match(/^([\w-]+)=COL_VAL$/);
  if(!whereMatch) throw new Error(`Cannot interpret WHERE clause: ${where}`);

  const [, propertyName] = whereMatch;

  return doc[propertyName] === colVal;
}

function removeExcludedField(exclusion) {
  delete exclusion.doc[exclusion.propertyName];
}

function parseColumn(rawCol, rawVal) {
  let val, reference, excluded = false;

  const parts = rawCol.split(/[:>]/);
  const col = parts[0];

  if(parts.length === 1) {
    val = rawVal;
  } else if(parts.length === 2) {
    const type = parts[1];
    switch(type) {
      case 'date': val = new Date(rawVal); break;
      case 'rel-date': val = (new Date(calcRelTimestampInDays(rawVal))).toISOString().substring(0, 10); break;
      case 'timestamp': val = parseTimestamp(rawVal); break;
      case 'rel-timestamp': val = calcRelTimestampInMilliseconds(rawVal); break;
      case 'int': val = int(rawVal); break;
      case 'bool': val = parseBool(rawVal); break;
      case 'string': val = rawVal; break;
      case 'float': val = Number.parseFloat(rawVal); break;
      case 'excluded': val = rawVal; excluded = true; break;
      default: {
        if(isReference(type)) {
          val = rawVal;
          reference = type;
        } else {
          throw new Error(`Unrecognised column type: ${type} for ${rawCol}`);
        }
      }
    }
  } else {
    throw new Error(`Wrong number of parts in column definition: ${rawCol} (should be 1, 2 or 4, but found ${parts.length}).`);
  }
  return { col:col, val:val, reference:reference, excluded:excluded };
}

function setNOW(t) {
  NOW = t;
}

module.exports = {
  requiresInstance: false,
  execute,
  setNOW,
  parseFloat,
  parseBool,
  parseTimestamp,
  int,
  setCol,
  parseColumn,
  removeExcludedField
};
