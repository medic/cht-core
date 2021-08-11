const fs = require('fs');
const feedBackDocs = async (testName = 'allLogs') => {
  const script = `(async () => {
  const allDbList =  await indexedDB.databases();
  const metaDbList = allDbList.filter(db => db.name.includes('pouch_medic-user') && db.name.endsWith('-meta'))
  const feedBack = []
  for (const idx in metaDbList){
    const db = metaDbList[idx]
    const nameStripped = db.name.replace('_pouch_','');
    const metaDb = new PouchDB(nameStripped);
    const docs = await metaDb.allDocs({ include_docs:true });
    const feedBackDocs = docs.rows.filter(x => x.doc.type === 'feedback')
    feedBack.push(feedBackDocs)
  }
  return feedBack.flat();
})();`;
  const feedBackDocs = await browser.executeScript(script);
  if (feedBackDocs.length > 0) {
    await fs.writeFileSync(`./tests/logs/feedbackDocs-${testName}`,JSON.stringify(feedBackDocs));
    return false;
  }
};


module.exports = {
  feedBackDocs
};
