module.exports = {
  childHealthRegistrationScenarios: {
    withNote: note => [
      [note],
      [],
    ],
  },

  deliveryScenarios: {
    liveBirth: deliveryDate => [
      ['healthy', 'f', deliveryDate],
      ['Congrats!'],
      []
    ],
  }
};
