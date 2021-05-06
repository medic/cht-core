const page1 = [
  {
    type: 'radio',
    css: 'input[data-name="/pregnancy/gestational_age/register_method/lmp_method"]',
  }
];

const page2 = [
  {
    type: 'radio',
    css: 'input[data-name="/pregnancy/gestational_age/method_approx/lmp_approx"]'
  },
  {
    type: 'text',
    css: 'input[name="/pregnancy/gestational_age/method_approx/lmp_approx_weeks"]'
  }
];


module.exports = {
  pages: [page1, page2]
};

