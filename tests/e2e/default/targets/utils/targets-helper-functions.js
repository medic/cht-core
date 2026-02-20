const moment = require('moment');

module.exports = {
  REPORTING_PERIOD: {
    CURRENT: moment().format('YYYY-MM'),
    PREVIOUS: moment().date(10).subtract(1, 'month').format('YYYY-MM'),
  },
  createTargetDoc: (tag, contactId, { user = 'irrelevant', targets = [] } = {}) => ({
    _id: `target~${tag}~${contactId}~${user}`,
    type: 'target',
    reporting_period: tag,
    owner: contactId,
    targets,
    updated_date: Date.now(),
    user,
  }),
  getLastMonth: () => {
    const newDate = new Date();
    newDate.setDate(1);
    newDate.setMonth(newDate.getMonth() - 1);
    return newDate.toLocaleString('default', { month: 'long' });
  }
};

