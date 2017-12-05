#!/usr/bin/env node

'use strict';

const axios = require('axios');
const querystring = require('querystring');

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

  async uploadJobData(data) {
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

  async getJobInfo(id) {
    await this.getUrl();
    const response = await axios.get(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${id}`, {
        headers: {
          authorization: `Bearer ${this.authToken}`
        }
      });
    return response.data;
  }

  async abortJob(id) {
    return await this.abortComplete(id, 'Aborted');
  }

  async closeJob(id) {
    return await this.abortComplete(id, 'UploadComplete');
  }

  async abortComplete(id, myState) {
    id = id || this.jobId;
    await this.getUrl();
    const body = {
      state: myState
    };
    const response = await axios.patch(
      `${this.url}/services/data/v${process.env.BULK2_API_VERSION}/jobs/ingest/${id}`,
      body, {
        headers: {
          authorization: `Bearer ${this.authToken}`,
          Accept: 'application/json'
        }
      });
    return response.data;
  }

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

  async getUnprocessedRecords(id) {
    return await this.getResults(id, 'unprocessedrecords');
  }

  async getResults(id, resultType) {
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