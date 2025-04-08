const { getDatasource } = require('@medic/cht-datasource');

const iterateGenerator = async (gen) => {
  const rows = [];

  for await (const id of gen) {
    rows.push({
      id: id
    });
  }

  return rows;
};

const queryFreetext = async (dataContext, request, type) => {
  try {
    const datasource = getDatasource(dataContext);
    let generator;

    if (type === 'reports') {
      generator = datasource.v1.report.getUuidsByFreetext(request.params.key);
    } else if (type === 'contacts') {
      if (request.params.type) {
        generator = datasource.v1.contact.getUuidsByTypeFreetext(request.params.key, request.params.type);
      } else {
        generator = datasource.v1.contact.getUuidsByFreetext(request.params.key);
      }
    }

    return await iterateGenerator(generator);
  } catch (error) {
    // NOTE: added this exception clause to return an empty list
    // because the previous implementation was doing so
    // if an exception was raised here then, wherever search lib
    // is being called the exception needs ot be handled which can be done later on
    return [];
  }
};

module.exports = {
  queryFreetext
};
