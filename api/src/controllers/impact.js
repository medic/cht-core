module.exports = {
  v1: {
    get: (req, res) => {
      res.status(501).json({ code: 501, error: 'Not implemented in this release.' });
    }
  }
};
