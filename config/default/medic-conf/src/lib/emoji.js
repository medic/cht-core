const EMOJIS = {
  key: '🔑',
};

// Don't support emojis in Windows
if(process.platform === 'win32') {
  Object.keys(EMOJIS).forEach(key => EMOJIS[key] = `:${key}:`);
}

module.exports = EMOJIS;
