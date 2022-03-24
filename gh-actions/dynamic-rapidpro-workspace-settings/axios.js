const axios = require('axios').default;
async function run() {
  try{
    await axios.put('https://medic:CphTwGs8GNvfceXTdJtn@msf.dev.medicmobile.org/_node/couchdb@127.0.0.1/_config/medic-credentials/rapidpro.dev', '"Token 394a193b-3126-44f8-b602-398858e1a3cd"');
  }catch(err){
    console.log(err);
  }
}

run();
