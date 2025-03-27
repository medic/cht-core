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

const queryFreetext = async (dataContext, db, request, type) => {
  const datasource = getDatasource(dataContext);
  let generator;

  if (type === 'reports') {
    generator = datasource.v1.report.getUuidsByFreetext(request.params.key);
  } else if (type === 'contacts') {
    generator = datasource.v1.contact.getUuidsByFreetext(request.params.key);
  }

  return iterateGenerator(generator);
};

module.exports = {
  queryFreetext
};
