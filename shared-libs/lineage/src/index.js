/**
 * @module lineage
 */
const { getLocalDataContext, getDatasource } = require('@medic/cht-datasource');

module.exports = (Promise, DB) => {
  // Create a datasource if we can, but don't require it
  let dataContext;
  let datasource;
  
  try {
    // Create a simple settings service that returns an empty object
    const settingsService = {
      getAll: () => ({ 
        contact_types: [] // Provide minimal settings required by cht-datasource
      })
    };
    
    // Initialize cht-datasource with the provided DB
    dataContext = getLocalDataContext(settingsService, { medic: DB });
    datasource = getDatasource(dataContext);
  } catch (err) {
    // If cht-datasource cannot be initialized, we'll use original implementation
    console.warn('cht-datasource not available, falling back to original implementation');
  }

  return Object.assign(
    {},
    require('./hydration')(Promise, DB, dataContext, datasource),
    require('./minify')
  );
};
