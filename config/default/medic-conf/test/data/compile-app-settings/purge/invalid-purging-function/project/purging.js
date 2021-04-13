function(userCtx, contact, reports) {
  const old = Date.now() - (1000 * 60 * 60 * 24 * 365);

  return reports
    .filter(r => r.reported_date < old)
    .map(r => r_.id);
//} <-- oh no we made an oopsie, I sure hope Medic Conf comes to the rescue...
