#!/usr/bin/env node

'use strict';

// This guy tries to stream stdin in multiple pieces.

const parser = require('csv-parse')({
  columns: true
});
const stringer = require('csv-stringify')({
  header: true
});
//let firstRow = null;
let rows = [];
const Bulk2 = require('./');
const b2 = new Bulk2({
  operation: process.argv[2],
  object: process.argv[3],
  externalIdFieldName: process.argv[4]
});

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error.stack || error);
  process.exit(13);
});

function doErr(err) {
  console.error(err.stack || err);
  process.exit(13);
}

function flushRows(cb, theEnd) {
  if (rows.length > 0) {
    //rows.unshift(firstRow);
    let data = rows.join('\n') + '\n';
    b2.uploadJobData(data)
      .then(() => {
        rows = [];
        if (theEnd) {
          console.log(b2.jobId);
          b2.closeJob()
            .then(() => {
              cb();
            })
            .catch((err) => {
              cb(err);
            });
        } else {
          cb();
        }
      })
      .catch((err) => {
        cb(err);
      });
  }
}

const transformer = new require('stream').Transform({
  transform(row, encoding, cb) {
    // if (!firstRow) {
    //   firstRow = row.toString().trim();
    //   cb();
    // } else {
    if (rows.length < 5) {
      rows.push(row.toString().trim());
      cb();
    } else {
      flushRows(cb);
    }
    // }
  },
  flush(cb) {
    flushRows(cb, true);
  }
});

process.stdin
  .pipe(parser).on('error', doErr)
  .pipe(stringer).on('error', doErr)
  .pipe(transformer).on('error', doErr);