module.exports = {
  incomingMessages: (req, res) => {
    console.log('INCOMING MESSAGE');
    console.log(req.body);
    // TODO work out how to get the params
    res.end();
    // TODO after processing check if we need to send autoreplies -- not needed if changes listener enabled...
  },
  deliveryReports: (req, res) => {
    console.log('DELIVERY REPORTS');
    console.log(req.body);
    // TODO work out how to get the params
    res.end();
  },
};
