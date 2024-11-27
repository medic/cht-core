const allure = require('allure-commandline');

const generateReport = () => {
  const reportError = new Error('Could not generate Allure report');
  const timeoutError = new Error('Timeout generating report');
  const generation = allure(['generate', 'allure-results', '--clean']);

  return new Promise((resolve, reject) => {
    const generationTimeout = setTimeout(
      () => reject(timeoutError),
      60 * 1000
    );

    generation.on('exit', (exitCode) => {
      clearTimeout(generationTimeout);

      if (exitCode !== 0) {
        return reject(reportError);
      }

      console.log('Allure report successfully generated');
      resolve();
    });
  });
};

module.exports = {
  generateReport
};
