#!/usr/bin/env node

'use strict';

const axios = require('axios');
const querystring = require('querystring');
const fs = require('fs');

class Bulk2 {

  constructor(options) {
    this.authToken = null;
    this.idUrl = null;
    this.url = null;
    this.jobId = null;
    if (options) {
      if (options.externalIdFieldName) {
        this.externalIdFieldName = options.externalIdFieldName;
      }
      if (options.object) {
        this.object = options.object;
      }
      if (options.operation) {
        this.operation = options.operation;
      }
    }
  }

  // Data is an array of CSV rows.
  async uploadJobData(data) {
    //const body = data.join('\n');
    console.error('[' + data + ']');
    await this.createJob();
    await axios.put(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${this.jobId}/batches`,
      data, {
        headers: {
          authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'text/csv'
        }
      });
  }

  // Login and get the URL for future requests.
  async login() {
    if (!this.authToken) {
      const body = querystring.stringify({
        grant_type: 'password',
        client_id: process.env.BULK2_CONSUMER_KEY,
        client_secret: process.env.BULK2_CONSUMER_SECRET,
        username: process.env.BULK2_USERNAME,
        password: process.env.BULK2_PASSWORD + process.env.BULK2_TOKEN
      });
      const response = await axios.post(
        `${process.env.BULK2_URL}/services/oauth2/token`, body);
      this.authToken = response.data.access_token;
      this.idUrl = response.data.id;
    }
  }

  async getUrl() {
    if (!this.url) {
      await this.login();
      const response = await axios.get(
        this.idUrl, {
          headers: {
            authorization: `Bearer ${this.authToken}`
          }
        });
      this.url = response.data.urls.profile;
      this.url = this.url.substring(0, this.url.lastIndexOf('/'));
    }
  }

  async createJob() {
    if (!this.jobId) {
      await this.getUrl();
      const body = {
        object: this.object,
        operation: this.operation
      };
      if (this.externalIdFieldName) {
        body.externalIdFieldName = this.externalIdFieldName;
      }
      const response = await axios.post(
        `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest`,
        body, {
          headers: {
            authorization: `Bearer ${this.authToken}`
          }
        });
      this.jobId = response.data.id;
    }
  }

  // Can't close a job that's closed or aborted or hasn't had anything uploaded
  // yet.
  async closeJob(id) {
    await this.closeAbort(id, true);
  }

  // Can't abort an already aborted job.
  async abortJob(id) {
    await this.closeAbort(id, false);
  }

  async closeAbort(id, isClose) {
    id = id || this.jobId;
    await this.getUrl();
    const body = {
      state: isClose ? 'UploadComplete' : 'Aborted'
    };
    await axios.patch(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${id}`,
      body, {
        headers: {
          authorization: `Bearer ${this.authToken}`,
          Accept: 'application/json'
        }
      });
  }

  async getJobInfo(id) {
    id = id || this.jobId;
    await this.getUrl();
    const response = await axios.get(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${id}`, {
        headers: {
          authorization: `Bearer ${this.authToken}`
        }
      });
    return response.data;
  }

  // Job must be aborted to delete.
  async deleteJob(id) {
    id = id || this.jobId;
    await this.getUrl();
    await axios.delete(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${id}`, {
        headers: {
          authorization: `Bearer ${this.authToken}`
        }
      });
  }

  async getSuccessfulResults(id) {
    return await this.getResults(id, 'successfulResults');
  }

  async getFailedResults(id) {
    return await this.getResults(id, 'failedResults');
  }

  async getUnprocessedResults(id) {
    return await this.getResults(id, 'unprocessedrecords');
  }

  async getResults(id, resultType) {
    id = id || this.jobId;
    await this.getUrl();
    return axios.get(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${id}/${resultType}/`, {
        responseType: 'stream',
        headers: {
          authorization: `Bearer ${this.authToken}`
        }
      });
  }
}

exports = module.exports = Bulk2;

if (require.main === module) {
  const b2 = new Bulk2({
    object: 'Account',
    operation: 'insert'
  });
  b2.closeJob('7503600000IapTSAAZ')
    .then((result) => {
      console.log(b2.jobId);
      console.log(result);
      //result.data.pipe(process.stdout);
    })
    .catch((err) => {
      console.log(err);
    });
}