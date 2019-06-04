module.exports = {
  incomingMessages: (req, res) => {
    // TODO auth!
    console.log('INCOMING MESSAGE');
    console.log(req.path);
    console.log(JSON.stringify(req.headers));
    console.log(req.body);

/*
{
  linkId: '8485a8ef-00bd-4ee4-9ade-a9488110d3a8',
  text: 'yup',
  to: '54619',
  id: '76311226-78da-44fa-bc40-76e3cfe14aae',
  date: '2019-06-04 09:30:56',
  from: '+64274622666'
}
*/

    // TODO work out how to get the params
    res.end();
    // TODO after processing check if we need to send autoreplies -- not needed if changes listener enabled...
  },
  deliveryReports: (req, res) => {
    // TODO auth!
    console.log('DELIVERY REPORTS');
    console.log(req.body);
    // TODO work out how to get the params
    res.end();
  },
};
