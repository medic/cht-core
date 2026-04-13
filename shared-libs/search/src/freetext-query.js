const chtDatasource = require('@medic/cht-datasource');
const logger = require('@medic/logger');

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
    const datasource = chtDatasource.getDatasource(dataContext);
    const generator = getGeneratorByType(datasource, request, type);

    return await iterateGenerator(generator);
  } catch (error) {
    logger.error('Error while querying freetext: ', error);
    // NOTE: added this exception clause to return an empty list
    // because the previous implementation was doing so
    // if an exception was raised here then, wherever search lib
    // is being called the exception needs ot be handled which can be done later on
    return [];
  }
};

const getGeneratorByType = (datasource, request, type) => {
  if (type === 'reports') {
    return datasource.v1.report.getUuidsByFreetext({ freetext: request.params.key });
  }

  if (type === 'contacts') {
    return request.params.type
      ? datasource.v1.contact.getUuidsByTypeFreetext({ freetext: request.params.key }, request.params.type)
      : datasource.v1.contact.getUuidsByFreetext({ freetext: request.params.key });
  }

  return null;
};

const queryFreetextPaginated = async (dataContext, request, type, options) => {
  try {
    const datasource = chtDatasource.getDatasource(dataContext);
    const limit = options.limit;
    const cursor = (options.skip !== undefined && options.skip !== null) ? options.skip.toString() : null;
    let page;

    if (type === 'reports') {
      page = await datasource.v1.report.getUuidsPageByFreetext({ freetext: request.params.key }, cursor, limit);
    } else if (type === 'contacts') {
      page = request.params.type
        ? await datasource.v1.contact.getUuidsPageByTypeFreetext({ freetext: request.params.key }, request.params.type, cursor, limit)
        : await datasource.v1.contact.getUuidsPageByFreetext({ freetext: request.params.key }, cursor, limit);
    }

    if (!page) {
      return [];
    }

    return page.data.map(id => ({ id }));
  } catch (error) {
    logger.error('Error while paginating freetext: ', error);
    return [];
  }
};

module.exports = {
  queryFreetext,
  queryFreetextPaginated
};
