module.exports = {
  fn: function (userCtx, contact, reports, messages) {
    const old = Date.now() - (1000 * 60 * 60 * 24 * 365);

    return [
      ...reports.filter(r => r.reported_date < old).map(r => r_.id),
      ...messages.filter(r => r.reported_date < old).map(r => r_.id)
    ];
  }
};
