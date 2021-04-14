const Factory = require('rosie').Factory;

Factory.define('pregnancy-form')
  .option('howWouldYouLikeToReportValue', 'method_approx')
  .attr('howWouldYouLikeToReport',['howWouldYouLikeToReportValue'], (howWouldYouLikeToReportValue) => {
    return {
      css: 'input[name="/pregnancy/gestational_age/register_method/lmp_method"]',
      value: howWouldYouLikeToReportValue,
      endOfPage: true
    };
  })
  .option('weeksOrMonthsValue', 'weeks')
  .attr('weeksOrMonths',['weeksOrMonthsValue'], (weeksOrMonthsValue) => {
    const answers = {
      weeks: 'approx_weeks',
      months: 'approx_months'
    };
    return {
      css: 'input[name="/pregnancy/gestational_age/method_approx/lmp_approx"]',
      value: answers[weeksOrMonthsValue],
      endOfPage: false
    };
  })
  .option('weeksValue', 22)
  .attr('numberOfWeeks', ['weeksValue'], (weeksValue) => {
    return {
      css: 'input[name="/pregnancy/gestational_age/method_approx/lmp_approx_weeks"]',
      value: weeksValue,
      textField: true,
      endOfPage: true 
    };
  });

