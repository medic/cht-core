var prepareDefinition = require('./definition-preparation');

function targetEmitter(targets, c, Utils, Target, emit) {
  for (var idx1 = 0; idx1 < targets.length; ++idx1) {
    var target = targets[idx1];
    prepareDefinition(target);

    switch (target.appliesTo) {
      case 'contacts':
        emitTargetFor(target, Target, Utils, emit, c);
        break;
      case 'reports':
        for (var idx2 = 0; idx2 < c.reports.length; ++idx2) {
          var r = c.reports[idx2];
          emitTargetFor(target, Target, Utils, emit, c, r);
        }
        break;
      default:
        throw new Error('Unrecognised target.appliesTo: ' + target.appliesTo);
    }
  }
}

function determineDate(targetConfig, Utils, c, r) {
  if (typeof targetConfig.date === 'function') {
    return targetConfig.date(c, r);
  }

  if (targetConfig.date === undefined || targetConfig.date === 'now') {
    return Utils.now().getTime();
  }

  if (targetConfig.date === 'reported') {
    return r ? r.reported_date : c.contact.reported_date;
  }

  throw new Error('Unrecognised value for target.date: ' + targetConfig.date);
}

function determineInstanceIds(targetConfig, c, r) {
  var instanceIds;
  if (typeof targetConfig.idType === 'function') {
    instanceIds = targetConfig.idType(c, r);
  } else if (targetConfig.idType === 'report') {
    instanceIds = r && r._id;
  } else {
    instanceIds = c.contact && c.contact._id;
  }

  if (!Array.isArray(instanceIds)) {
    instanceIds = [instanceIds];
  }

  return instanceIds;
}

function emitTargetFor(targetConfig, Target, Utils, emit, c, r) {
  var isEmittingForReport = !!r;
  if (!c.contact) return;
  var contactType = c.contact.type === 'contact' ? c.contact.contact_type : c.contact.type;
  var appliesToKey = isEmittingForReport ? r.form : contactType;
  if (targetConfig.appliesToType && targetConfig.appliesToType.indexOf(appliesToKey) < 0) return;
  if (targetConfig.appliesIf && !targetConfig.appliesIf (c, r)) return;

  var instanceDoc = isEmittingForReport ? r : c.contact;
  var instanceIds = determineInstanceIds(targetConfig, c, r);
  var pass = !targetConfig.passesIf || !!targetConfig.passesIf(c, r);
  var date = determineDate(targetConfig, Utils, c, r);
  var groupBy = targetConfig.groupBy && targetConfig.groupBy(c, r);

  function emitTargetInstance(i) {
    emit('target', i);
  }

  for (var i = 0; i < instanceIds.length; ++i) {
    var instance = new Target({
      _id: instanceIds[i] + '~' + targetConfig.id,
      contact: c.contact,
      deleted: !!instanceDoc.deleted,
      type: targetConfig.id,
      pass: pass,
      groupBy: groupBy,
      date: date,
    });

    if (targetConfig.emitCustom) {
      targetConfig.emitCustom(emitTargetInstance, instance, c, r);
    } else {
      emitTargetInstance(instance);
    }
  }
}

module.exports = targetEmitter;
