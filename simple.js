#!/usr/bin/env node

'use strict';

// This guy just sends stdin in one shot.

const Bulk2 = require('./');
const b2 = new Bulk2({
  operation: process.argv[2],
  object: process.argv[3],
  externalIdFieldName: process.argv[4]
});

process.on('unhandledRejection', error => {
  console.log('unhandledRejection', error.stack || error);
});

function doFinish() {
  console.log(b2.jobId);
}

function doErr(err) {
  console.error(err.stack || err);
  process.exit(13);
}

b2.uploadJobData(process.stdin)
  .then(() => {
    doFinish();
    b2.closeJob();
  })
  .catch((err) => {
    doFinish();
    doErr(err);
  });
