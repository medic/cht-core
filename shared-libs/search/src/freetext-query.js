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
    const generator = getGeneratorByType(datasource, request, type);

    return await iterateGenerator(generator);
  } catch (error) {
    // NOTE: added this exception clause to return an empty list
    // because the previous implementation was doing so
    // if an exception was raised here then, wherever search lib
    // is being called the exception needs ot be handled which can be done later on
    return [];
  }
};

const getGeneratorByType = (datasource, request, type) => {
  if (type === 'reports') {
    return datasource.v1.report.getUuidsByFreetext(request.params.key);
  }

  if (type === 'contacts') {
    return request.params.type
      ? datasource.v1.contact.getUuidsByTypeFreetext(request.params.key, request.params.type)
      : datasource.v1.contact.getUuidsByFreetext(request.params.key);
  }

  return null;
};

module.exports = {
  queryFreetext
};
