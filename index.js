'use strict';

require('dotenv').config({});
var path = require('path');
var fs = require('fs');
var promisify = require('util').promisify;
var mkdirp = promisify(require('@root/mkdirp'));
var exec = promisify(require('child_process').exec);
var AWS = require('aws-sdk');
var s3 = new AWS.S3({signatureVersion: 'v4'});
var readFile = promisify(fs.readFile);
var cron = require('node-cron');

var db_host = process.env.DB_HOST || 'localhost';
var db_port;
var db_user = process.env.DB_USER;
var db_pass = process.env.DB_PASS;
var db_name = process.env.DB_NAME;
if (db_host.includes(':')) {
  var parts = db_host.split(':');
  db_host = parts[0];
  db_port = parts[1];
}

function backup() {
  var backupDir = formatDate(new Date());
  mkdirp(backupDir)
    .then(function() {
      _log(`BACKUP DIR ${backupDir}/ CREATED`);
    })
    .then(function() {
      var cmd = `mysqldump -u ${db_user} -p'${db_pass}'`;
      if (db_host != 'localhost') {
        cmd = `${cmd} -h ${db_host}`;
      }
      if (db_port) {
        cmd = `${cmd} -P ${db_port}`;
      }
      cmd = `${cmd} ${db_name} > ${backupDir}/${db_name}.sql`;
      return exec(cmd).then(function() {
        _log('DUMPED DB');
      });
    })
    .then(function() {
      var cmd = `tar czvf ${backupDir}/${db_name}.sql.tar.gz ${backupDir}/${db_name}.sql`;
      return exec(cmd).then(function() {
        _log('TAR GZ CREATED');
      });
    })
    .then(function() {
      var cmd = `rm ${backupDir}/${db_name}.sql`;
      return exec(cmd).then(function() {
        _log('DUMP DELETED');
      });
    })
    .then(function() {
      return readFile(`${backupDir}/${db_name}.sql.tar.gz`).then(function(
        buffer
      ) {
        return s3
          .putObject({
            Bucket: process.env.AWS_BUCKET,
            Key: `${backupDir}/${db_name}.sql.tar.gz`,
            Body: buffer
          })
          .promise()
          .then(function() {
            _log(
              `S3 PUT OBJECT ${db_name}.sql.tar.gz IN BUCKET ${process.env.AWS_BUCKET}`
            );
          });
      });
    })
    .then(function() {
      var cmd = `rm ${backupDir}/${db_name}.sql.tar.gz`;
      return exec(cmd).then(function() {
        _log('TAR GZ DELETED');
      });
    })
    .then(function() {
      var cmd = `rm -rf ${backupDir}`;
      return exec(cmd).then(function() {
        _log('BACKUP DIR DELETED');
      });
    })
    .then(function() {
      _log('DONE');
    });
}

function _log(msg) {
  if (process.env.LOGGING) {
    console.log(msg);
  }
}

function formatDate(date) {
  return require('date-fns/format')(date, 'YYYY-MM-DD');
}

cron.schedule('0 0 * * *', function() {
  backup();
});
