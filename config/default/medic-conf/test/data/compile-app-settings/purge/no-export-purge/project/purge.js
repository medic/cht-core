const fn = (userCtx, contact, reports, messages) => {
  return [
    ...reports.filter(r => r.reported_date > 10).map(r => r._id),
    ...messages.filter(r => r.reported_date > 10).map(r => r._id)
  ];
};
