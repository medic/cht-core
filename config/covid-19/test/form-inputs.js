module.exports = {
  provisionRDT: [['patient_id'], [], ['RUNNING'], []],
  captureResult: [['QUEUED'], ['no']],
  captureResultWithRepeat: [['QUEUED'], ['yes', 'invalid']]
};
