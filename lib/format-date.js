'use strict';

var _formatDate = require('date-fns/format');

function formatDate(date) {
  if (!date) {
    date = new Date();
  }
  return _formatDate(date, 'YYYYMMDDHHmmss');
}

module.exports = formatDate;
