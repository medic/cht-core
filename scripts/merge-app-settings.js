const http = require('http'),
      fs = require('fs'),
      SOURCE_URL = process.argv[2], // the location of the ddoc to get app_settings from
      TARGET_FILE = process.argv[3]; // the location of the ddoc to write app_settings into

const updateDdoc = (settings={}) => {
  fs.readFile(TARGET_FILE, (err, ddocs) => {
    if (err) {
      console.error(new Error('Error reading new ddoc'));
      console.error(err);
      process.exit(1);
    }
    try {
      ddocs = JSON.parse(ddocs);
    } catch(e) {
      console.error(new Error('Error parsing new ddoc'));
      console.error(e);
      process.exit(1);
    }
    ddocs.docs[0].app_settings = settings;
    ddocs = JSON.stringify(ddocs);
    fs.writeFile(TARGET_FILE, ddocs, err => {
      if (err) {
        console.error(new Error('Error writing new ddoc'));
        console.error(err);
        process.exit(1);
      }
      console.log('ddoc.app_settings updated');
    });
  });
};

http.get(SOURCE_URL, res => {
  if (res.statusCode === 404) {
    console.log('DDOC not found - initialising app_settings to "{}"');
    updateDdoc();
  } else if (res.statusCode !== 200) {
    console.error(new Error(`Error fetching existing ddoc. Got statusCode ${res.statusCode}`));
    process.exit(1);
  } else {
    let rawData = '';
    res.on('data', chunk => {
      rawData += chunk;
    });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(rawData);
        updateDdoc(parsed.app_settings);
      } catch(e) {
        console.error(new Error('Error parsing existing ddoc'));
        console.error(e);
        process.exit(1);
      }
    });
  }
});
