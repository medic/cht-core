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

const getPageByType = async (datasource, request, type, pageOptions) => {
  const filter = { freetext: request.params.key };
  const { cursor, limit } = pageOptions;

  if (type === 'reports') {
    return datasource.v1.report.getUuidsPageByFreetext(filter, cursor, limit);
  }

  if (type === 'contacts') {
    return request.params.type
      ? datasource.v1.contact.getUuidsPageByTypeFreetext(filter, request.params.type, cursor, limit)
      : datasource.v1.contact.getUuidsPageByFreetext(filter, cursor, limit);
  }

  return null;
};

const queryFreetextPaginated = async (dataContext, request, type, options) => {
  try {
    const datasource = chtDatasource.getDatasource(dataContext);
    const limit = options.limit;
    const cursor = options.skip != null ? options.skip.toString() : null;
    const pageOptions = { cursor, limit };

    const page = await getPageByType(datasource, request, type, pageOptions);

    if (page && page.data) {
      return page.data.map(id => ({ id }));
    }

    return [];
  } catch (error) {
    logger.error('Error while paginating freetext: ', error);
    return [];
  }
};

module.exports = {
  queryFreetext,
  queryFreetextPaginated
};