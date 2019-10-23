module.exports = {
  run_every_days: 0,
  cron: '* * * * *',
  text_expression: 'every sunday'
  fn: function(userCtx, contact, reports, messages) {
    return reports.filter(r => r.form === 'pregnancy').map(r => r._id);
  }
};
