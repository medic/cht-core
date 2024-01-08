const moment = require('moment/moment');
const auth = require('../auth');
const db = require('../db');
const logger = require('../logger');

module.exports = {
  get: async (req, res) => {
    try {
      // TODO: refine permissions
      // await auth.check(req, 'can_view_users');

      const filename = `users-devices-${moment().format('YYYYMMDDHHmm')}.csv`;
      res
        .set('Content-Type', 'text/csv')
        .set('Content-Disposition', 'attachment; filename=' + filename);

      const telemetry = await db.medicUsersMeta.query('users-meta/device_telemetry_entries', { include_docs: true });
      const userByDeviceId = {};
      telemetry.rows.forEach(({ doc: entry }) => {
        if (!entry.device && !entry.metadata) {
          return;
        }

        const webview = /Chrome\/(\d+\.\d+)/.exec(entry.device.userAgent)?.[1];
        const apk = entry.device.deviceInfo.app?.version;
        const android = entry.device.deviceInfo.software?.androidVersion;
        const cht = entry.metadata.versions.app;
        const settings = entry.metadata.versions.settings;

        if (!userByDeviceId[entry.metadata.user]) {
          userByDeviceId[entry.metadata.user] = [];
        }

        const date = `${entry.metadata.year}-${entry.metadata.month}-${entry.metadata.day}`;
        const deviceId = entry.metadata.deviceId;
        const deviceMetas = {
          deviceId,
          date,
          webview,
          apk,
          android,
          cht,
          settings,
        };
        const deviceIndex = userByDeviceId[entry.metadata.user].findIndex(d => d.deviceId === deviceId);
        const device = userByDeviceId[entry.metadata.user][deviceIndex];
        if (deviceIndex === -1) {
          userByDeviceId[entry.metadata.user].push(deviceMetas);
        } else {
          if (device.date < date) {
            // if we got a more recent entry, replace the old one we had
            userByDeviceId[entry.metadata.user].splice(deviceIndex, 1, deviceMetas);
          }
        }
      });

      let csv = '"user","device","webview","apk","android","cht"\n';
      for (const [user, devices] of Object.entries(userByDeviceId)) {
        for (const metas of devices) {
          csv += `"${user}","${metas.deviceId}","${metas.webview}","${metas.apk}","${metas.android}","${metas.cht}"\n`;
        }
      }

      res.send(csv);

      // TODO: use a stream & pipe it to `res`
      /*// To respond as quickly to the request as possible
      res.flushHeaders();
      const stream = new ReadableStream();
      await stream
        .on('error', err => {
          // Because we've already flushed the headers above we can't use
          // serverUtils anymore, we just have to close the connection
          logger.error(`Error exporting user devices`);
          logger.error('%o', err);
          res.end(`--ERROR--\nError exporting data: ${err.message}\n`);
        })
        .pipeTo(res);*/
    } catch (error) {
      logger.error(error);
      // throw error;
      res.status(500).send({ error: error.message });
    }
  },
};
