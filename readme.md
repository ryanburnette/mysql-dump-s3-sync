# [mysql-dump-s3-sync][1]

[![repo](https://img.shields.io/badge/repository-null-black.svg?style=flat-square)](gitea@code.ryanburnette.com:ryanburnette/mysql-dump-s3-sync)
[![npm](https://img.shields.io/badge/package-NPM-green.svg?style=flat-square)](https://www.npmjs.com/package/@ryanburnette/mysql-dump-s3-sync)

Dump a MySQL database and sync the backup to AWS S3.

## Usage

```bash
npm install @ryanburnette/mysql-dump-s3-sync
```

Always configure AWS
[using the environment](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html).

All other options can be configured in the environment or as an `opts` object
passed to `backup()`.

```
# .env

# Configure DB explicitly
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASS=

# Configure DB by URL
DB_URL=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET=

# other
LOGGING=
```

Run a backup.

```bash
npx @ryanburnette/mysql-dump-s3-sync backup
```

Make it a scheduled service.

```js
// service.js
require('@ryanburnette/mysql-dump-s3-sync/cron')({
  schedule: '0 0 * * *'
});
```

First, install [go-serviceman](https://git.coolaj86.com/coolaj86/go-serviceman)
so we can add services in the easiest possible way.

```bash
sudo serviceman add --system --path $PATH node service.js
```

[1]: https://github.com/ryanburnette/mysql-dump-s3-sync
