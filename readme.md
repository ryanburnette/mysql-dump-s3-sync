# @ryanburnette/mysql-dump-s3-sync

Scheduled service that dumps a MySQL database and syncs it to an AWS S3 bucket every 24 hours.

## Usage

```
git clone https://code.ryanburnette.com/ryanburnette/mysql-dump-s3-sync
cd mysql-dump-s3-sync
npm install
```

Set up the `.env`.

```
# .env
LOGGING=
DB_HOST=
DB_NAME=
DB_USER=
DB_PASS=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET=
```

Run as a service... the easiest way to do that is using [go-serviceman](https://git.coolaj86.com/coolaj86/go-serviceman).

```
sudo serviceman add --system --path $PATH node index.js
```
