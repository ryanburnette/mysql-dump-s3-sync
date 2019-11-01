'use strict';

var _cron = require('node-cron');
var _backup = require('./backup');

function cron(opts) {
  if (!opts) {
    opts = {};
  }

  if (!opts.schedule) {
    throw new Error('opts.schedule is required');
  }

  _cron.schedule(opts.schedule, function() {
    _backup();
  });
}

module.exports = cron;
