
function getField(report, fieldPath) {
  const parts = (fieldPath || '').split('.');

  return ['fields', ...parts]
    .reduce((prev, fieldName) => {
      if (prev === undefined) {
        return undefined;
      }
      return prev[fieldName];
    }, report);
}

function isFormArraySubmittedInWindow(reports, formArray, start, end, count) {
  const reportsFound = (reports || []).filter(report => {
    return (formArray || []).includes(report.form)
      && report.reported_date >= start
      && report.reported_date <= end;
  });

  if (count) {
    return reportsFound.length >= count;
  }

  return !!reportsFound.length;
}

function getTimeForMidnight(originalDate) {
  const date = new Date(originalDate);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function addDays(date, days) {
  const result = getTimeForMidnight(new Date(date));
  result.setDate(result.getDate() + days);
  return result;
}

module.exports = {
  addDays,
  isFormArraySubmittedInWindow,
  getField
};
