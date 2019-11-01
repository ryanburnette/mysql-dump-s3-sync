#!/usr/bin/env node
'use strict';
require('dotenv').config({});
var backup = require('./backup');
backup();
