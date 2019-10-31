'use strict';

var _formatDate = require('date-fns/format');

function formatDate(date) {
  if (!date) {
    date = new Date();
  }
  return _formatDate(date, 'YYYY-MM-DD');
}

module.exports = formatDate;
