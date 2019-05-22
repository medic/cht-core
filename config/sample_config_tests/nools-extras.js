function validateReport(report) {
  return report.form === "assessment";
}
function isHealthyDelivery() {
  return true;
}

module.exports = {
  validateReport: validateReport, 
  isHealthyDelivery: isHealthyDelivery,
};
