module.exports = {
  allPromisesSettled: promises =>
    Promise.all(promises.map(p =>
      p
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason })),
    )),
};
