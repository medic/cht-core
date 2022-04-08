module.exports = {
  name: 'long-one2',
  created: new Date(2022, 4, 5),
  run: () => new Promise(r => {
    const fiveMin = 5 * 60 * 1000;
    setTimeout(r, fiveMin);
  }),
};
