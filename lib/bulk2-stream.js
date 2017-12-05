#!/usr/bin/env node

'use strict';

let firstRow = null;
let totalSize = 0;
const rows = [];
const jobIds = [];
let b2 = null;

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error.stack || error);
  process.exit(13);
});

function doErr(err) {
  console.error(err.stack || err);
  process.exit(13);
}

function flushRows(cb, isFinal) {
  if (rows.length > 0) {
    rows.unshift(firstRow);
    let data = rows.join('\n');
    b2.uploadJobData(data)
      .then(() => {
        rows.length = 0;
        totalSize = 0;
        jobIds.push(b2.jobId);
        return b2.closeJob();
      })
      .then(() => {
        if (isFinal) {
          console.log(jobIds.join(','));
        }
        cb();
      })
      .catch((err) => {
        cb(err);
      });
  }
}

// https://stackoverflow.com/a/10229225/8599429
// SF max size for a single job is 100 MB. Unicode is 2 bytes per most
// characters, so we have to divide by 2.
//const ONE_HUNDRED_MB = 100000000 / 2;
const ONE_HUNDRED_MB = 1000 / 2;

const transformer = new require('stream').Transform({
  transform(row, encoding, cb) {
    const rowStr = row.toString().trim();
    if (!firstRow) {
      firstRow = rowStr;
      cb();
    } else {
      totalSize += rowStr.length;
      rows.push(rowStr);
      if (totalSize < ONE_HUNDRED_MB) {
        cb();
      } else {
        flushRows(cb);
      }
    }
  },
  flush(cb) {
    flushRows(cb, true);
  }
});

const parser = require('csv-parse')({
  columns: true
});
const stringer = require('csv-stringify')({
  header: true
});

function streamBulk2(bulk2) {
  b2 = bulk2;
  process.stdin
    .pipe(parser).on('error', doErr)
    .pipe(stringer).on('error', doErr)
    .pipe(transformer).on('error', doErr);
}

exports = module.exports = streamBulk2;