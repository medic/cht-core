const utils = require('../utils');

const sendSms = async (phone, message = 'Testing') => {
  await utils.request({
    method: 'POST',
    path: '/api/v2/records',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded'
    },
    body: `message=${message}&from=${phone}`,
  });  
};

module.exports = {
  sendSms,
};


