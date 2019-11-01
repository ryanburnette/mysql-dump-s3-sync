'use strict';

var promisify = require('util').promisify;
var mkdirp = promisify(require('@root/mkdirp'));
var exec = promisify(require('child_process').exec);
var aws = require('aws-sdk');
var path = require('path');
var fs = require('fs');
var readFile = promisify(fs.readFile);
var formatDate = require('./format-date');
var parseMysqlUrl = require('@ryanburnette/parse-mysql-url');

function backup(opts) {
  if (!opts) {
    opts = {};
  }

  var s3 = new aws.S3({ signatureVersion: 'v4' });

  if (process.env.DB_URL) {
    opts.db = parseMysqlUrl(process.env.DB_URL);
  }

  if (!opts.db) {
    opts.db = {};
  }

  if (process.env.DB_HOST) {
    opts.db.host = process.env.DB_HOST;
  }

  if (!opts.db.host) {
    opts.db.host = 'localhost';
  }

  if (opts.db.host.includes(':')) {
    var parts = opts.db.host.split(':');
    opts.db.host = parts[0];
    opts.db.port = parts[1];
  }

  if (process.env.DB_PORT) {
    opts.db.port = process.env.DB_PORT;
  }

  if (!opts.db.port) {
    opts.db.port = 3306;
  }

  if (process.env.DB_USERNAME) {
    opts.db.username = process.env.DB_USERNAME;
  }

  if (!opts.db.username) {
    throw new Error('opts.db.username is required');
  }

  if (process.env.DB_PASSWORD) {
    opts.db.password = process.env.DB_PASSWORD;
  }

  if (!opts.db.password) {
    throw new Error('opts.db.password is required');
  }

  if (process.env.DB_NAME) {
    opts.db.name = process.env.DB_NAME;
  }

  if (!opts.db.name) {
    throw new Error('opts.db.name is required');
  }

  if (!opts.aws) {
    opts.aws = {};
  }

  if (process.env.AWS_BUCKET) {
    opts.aws.bucket = process.env.AWS_BUCKET;
  }

  if (!opts.aws.bucket) {
    throw new Error('opts.aws.bucket is required');
  }

  if (process.env.LOGGING == 'true') {
    opts.logging = true;
  }

  var ddir = String(formatDate());
  var tmpdir = path.join('.tmp', ddir);

  function _log(msg) {
    if (opts.logging) {
      console.log(msg);
    }
  }

  return mkdirp(tmpdir)
    .then(function() {
      _log(`CREATE TMPDIR ${tmpdir}`);
    })
    .then(function() {
      var cmd = `mysqldump -u ${opts.db.username} -p'${opts.db.password}'`;
      if (opts.db.host != 'localhost') {
        cmd = `${cmd} -h ${opts.db.host}`;
      }
      if (opts.db.port) {
        cmd = `${cmd} -P ${opts.db.port}`;
      }
      cmd = `${cmd} ${opts.db.name} > ${tmpdir}/${opts.db.name}.sql`;
      return exec(cmd).then(function() {
        _log(`CREATE DUMP ${tmpdir}/${opts.db.name}.sql`);
      });
    })
    .then(function() {
      var cmd = `tar czvf ${tmpdir}/${opts.db.name}.sql.tar.gz ${tmpdir}/${opts.db.name}.sql`;
      return exec(cmd).then(function() {
        _log(`CREATE TARGZ ${tmpdir}/${opts.db.name}.sql.tar.gz`);
      });
    })
    .then(function() {
      var cmd = `rm ${tmpdir}/${opts.db.name}.sql`;
      return exec(cmd).then(function() {
        _log(`DELETE DUMP ${tmpdir}/${opts.db.name}.sql`);
      });
    })
    .then(function() {
      return Promise.resolve()
        .then(function() {
          return readFile(`${tmpdir}/${opts.db.name}.sql.tar.gz`);
        })
        .then(function(buffer) {
          return s3
            .putObject({
              Bucket: opts.aws.bucket,
              Key: `${ddir}/${opts.db.name}.sql.tar.gz`,
              Body: buffer
            })
            .promise()
            .then(function() {
              _log(
                `PUT S3 OBJECT s3://${opts.aws.bucket}/${opts.db.name}.sql.tar.gz`
              );
            });
        });
    })
    .then(function() {
      var cmd = `rm ${tmpdir}/${opts.db.name}.sql.tar.gz`;
      return exec(cmd).then(function() {
        _log(`DELETE TARGZ ${tmpdir}/${opts.db.name}.sql.tar.gz`);
      });
    })
    .then(function() {
      var cmd = `rm -rf ${tmpdir}`;
      return exec(cmd).then(function() {
        _log(`DELETE TMPDIR ${tmpdir}`);
      });
    })
    .then(function() {
      _log(`DONE`);
    });
}

module.exports = backup;
