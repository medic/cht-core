module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/impact:
     *   get:
     *     summary: Get impact metrics
     *     operationId: v1ImpactGet
     *     description: Not implemented in this release.
     *     tags: [Monitoring]
     *     x-since: 5.0.0
     *     responses:
     *       '501':
     *         description: Not implemented in this release.
     */
    get: (req, res) => {
      res.status(501).json({ code: 501, error: 'Not implemented in this release.' });
    }
  }
};
