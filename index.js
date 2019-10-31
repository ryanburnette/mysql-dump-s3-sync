'use strict';

var promisify = require('util').promisify;
var mkdirp = promisify(require('@root/mkdirp'));
var exec = promisify(require('child_process').exec);
var aws = require('aws-sdk');
var fs = require('fs');
var readFile = promisify(fs.readFile);
var formatDate = require('./lib/format-date');
var parseMysqlUrl = require('@ryanburnette/parse-mysql-url');

function backup(opts) {
  if (!opts) {
    opts = {};
  }

  var s3 = new aws.S3({ signatureVersion: 'v4' });

  if (!opts.db) {
    opts.db = {};
  }

  if (process.env.DB_URL) {
    opts.db = parseMysqlUrl(process.env.DB_URL);
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

  if (process.env.LOGGING == 'true') {
    opts.logging = true;
  }

  var tmpdir = formatDate();

  function _log(msg) {
    if (opts.logging == 'true') {
      console.log(msg);
    }
  }

  return mkdirp(tmpdir)
    .then(function() {
      _log(`BACKUP DIR ${tmpdir}/ CREATED`);
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
        _log('DUMPED DB');
      });
    })
    .then(function() {
      var cmd = `tar czvf ${tmpdir}/${opts.db.name}.sql.tar.gz ${tmpdir}/${opts.db.name}.sql`;
      return exec(cmd).then(function() {
        _log('TAR GZ CREATED');
      });
    })
    .then(function() {
      var cmd = `rm ${tmpdir}/${opts.db.name}.sql`;
      return exec(cmd).then(function() {
        _log('DUMP DELETED');
      });
    })
    .then(function() {
      return readFile(`${tmpdir}/${opts.db.name}.sql.tar.gz`).then(function(
        buffer
      ) {
        return s3
          .putObject({
            Bucket: opts.aws.bucket,
            Key: `${tmpdir}/${opts.db.name}.sql.tar.gz`,
            Body: buffer
          })
          .promise()
          .then(function() {
            _log(
              `S3 PUT OBJECT ${opts.db.name}.sql.tar.gz IN BUCKET ${opts.aws.bucket}`
            );
          });
      });
    })
    .then(function() {
      var cmd = `rm ${tmpdir}/${opts.db.name}.sql.tar.gz`;
      return exec(cmd).then(function() {
        _log('TAR GZ DELETED');
      });
    })
    .then(function() {
      var cmd = `rm -rf ${tmpdir}`;
      return exec(cmd).then(function() {
        _log('BACKUP DIR DELETED');
      });
    })
    .then(function() {
      _log('DONE');
    });
}

module.exports = backup;
