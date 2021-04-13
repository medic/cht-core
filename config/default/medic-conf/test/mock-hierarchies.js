const buildLineage = (id, parent) => ({ _id: id, parent });

const parentsToLineage = (...parentIds) => parentIds.reverse().reduce((arr, parentId) => ({
  _id: parentId,
  parent: arr,
}), undefined);

const mockHierarchy = async (db, hierarchy, existingLineage, depth = 0) => {
  const contactTypeByDepth = ['district_hospital', 'health_center', 'clinic', 'person'];
  const nextLineage = id => buildLineage(id, existingLineage);
  for (let contactId of Object.keys(hierarchy)) {
    const contactDoc = {
      _id: contactId,
      parent: existingLineage,
      type: contactTypeByDepth[depth],
    };

    if (depth < 3) {
      await db.put({
        _id: `${contactId}_contact`,
        type: 'person',
        parent: nextLineage(contactId),
      });
      
      contactDoc.contact = {
        _id: `${contactId}_contact`,
        parent: nextLineage(contactId),
      };
    }

    await db.put(contactDoc);

    await mockHierarchy(db, hierarchy[contactId], nextLineage(contactId), depth + 1);
  }
};

const mockReport = async (db, report) => {
  const creatorDoc = await db.get(report.creatorId);

  await db.put({
    _id: report.id,
    form: 'foo',
    type: 'data_record',
    contact: buildLineage(report.creatorId, creatorDoc.parent),
  });
};

module.exports = {
  mockReport,
  mockHierarchy,
  parentsToLineage,
};
