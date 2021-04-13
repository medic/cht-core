function emitter(contactSummary, contact, reports) {
  var fields = contactSummary.fields || [];
  var context = contactSummary.context || {};
  var cards = contactSummary.cards || [];

  var contactType = contact && (contact.type === 'contact' ? contact.contact_type : contact.type);

  var result = {
    cards: [],
    fields: fields.filter(function(f) {
      var appliesToType = convertToArray(f.appliesToType);
      var appliesToNotType = appliesToType.filter(function(type) {
        return type && type.charAt(0) === '!';
      });
      if (appliesToType.length === 0 || appliesToType.includes(contactType) ||
          (appliesToNotType.length > 0 && !appliesToNotType.includes('!' + contactType))) {
        if (!f.appliesIf || f.appliesIf()) {
          delete f.appliesToType;
          delete f.appliesIf;
          return true;
        }
      }
    }),
  };

  cards.forEach(function(card) {
    var idx1, r, added;

    var appliesToType = convertToArray(card.appliesToType);

    if (appliesToType.includes('report') && appliesToType.length > 1) {
      throw new Error("You cannot set appliesToType to an array which includes the type 'report' and another type.");
    }

    if (appliesToType.includes('report')) {
      for (idx1=0; idx1<reports.length; ++idx1) {
        r = reports[idx1];
        if (!isReportValid(r)) {
          continue;
        }

        added = addCard(card, context, r);
        if (added) {
          result.cards.push(added);
        }
      }
    } else {
      if (!appliesToType.includes(contactType) && appliesToType.length > 0) {
        return;
      }

      added = addCard(card, context);
      if (added) {
        result.cards.push(added);
      }
    }
  });

  result.context = context;

  // return the result for 2.13+ as per #2635
  return result;
}

function convertToArray(appliesToType) {
  if (!appliesToType) {
    return [];
  }
  return Array.isArray(appliesToType) ? appliesToType : [appliesToType];
}

function isReportValid(report) {
  // valid XForms won't have .errors field
  // valid JSON forms will have empty array errors:[]
  return report && !(report.errors && report.errors.length);
}

function execAppliesIf(prop, report) {
  switch(typeof prop) {
    case 'undefined': return true;
    case 'function':  return prop(report);
    default:          return prop;
  }
}

function addCard(card, context, r) {
  if (!execAppliesIf(card.appliesIf, r)) {
    return;
  }

  function addValue(src, dst, prop) {
    switch(typeof src[prop]) {
      case 'undefined': return;
      case 'function': dst[prop] = src[prop](r); break;
      default: dst[prop] = src[prop];
    }
  }

  var fields = typeof card.fields === 'function' ?
      card.fields(r) :
      card.fields
        .filter(function(f) {
          return execAppliesIf(f.appliesIf, r);
        })
        .map(function(f) {
          var ret = {};
          addValue(f, ret, 'label');
          addValue(f, ret, 'value');
          addValue(f, ret, 'translate');
          addValue(f, ret, 'filter');
          addValue(f, ret, 'width');
          addValue(f, ret, 'icon');
          if (f.context) {
            ret.context = {};
            addValue(f.context, ret.context, 'count');
            addValue(f.context, ret.context, 'total');
          }
          return ret;
        });

  if (card.modifyContext) {
    card.modifyContext(context, r);
  }

  return {
    label: card.label,
    fields: fields,
  };
}

module.exports = emitter;
