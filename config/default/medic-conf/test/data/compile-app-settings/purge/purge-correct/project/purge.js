module.exports = {
  fn: function (userCtx, contact, reports, messages) {
    return reports.filter(r => r.reported_date < 10)
      .concat(messages.filter(m => m.reported_date < 100))
      .map(o => o._id);
  },
  run_every_days: 7,
  cron: '0 0 * * SUN'
};
