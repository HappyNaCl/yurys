# reminder-worker

A tiny long-running process that pings the app's reminder dispatch endpoint on
an interval. The endpoint (`POST /api/reminders/dispatch` in the Next.js app)
does the real work — finding due reminders and sending web-push notifications.
This worker just wakes it up on schedule.

## Configure

Copy `.env.example` to `.env` and fill it in (or set the same variables in the
environment):

| Variable       | Required | Default | Notes                                              |
| -------------- | -------- | ------- | -------------------------------------------------- |
| `DISPATCH_URL` | yes      | —       | Full URL of the dispatch endpoint.                 |
| `CRON_SECRET`  | yes      | —       | Must match `CRON_SECRET` in the Next.js app.       |
| `INTERVAL`     | no       | `1m`    | Go duration (`60s`, `1m`) or bare seconds (`60`).  |
| `TIMEOUT`      | no       | `30s`   | Per-request timeout.                               |

Real environment variables always override values from `.env`.

## Run

```bash
cd worker
go run .
```

## Build a binary

```bash
cd worker
go build -o reminder-worker .
./reminder-worker
```

Cross-compile for a Linux server from any OS:

```bash
GOOS=linux GOARCH=amd64 go build -o reminder-worker .
```

## Deploy

It's a single process — run it wherever you can keep a process alive.

### systemd

```ini
# /etc/systemd/system/reminder-worker.service
[Unit]
Description=YuRyS reminder worker
After=network-online.target

[Service]
WorkingDirectory=/opt/reminder-worker
ExecStart=/opt/reminder-worker/reminder-worker
EnvironmentFile=/opt/reminder-worker/.env
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now reminder-worker
journalctl -u reminder-worker -f
```

### Docker

```bash
docker build -t reminder-worker ./worker
docker run -d --restart unless-stopped \
  -e DISPATCH_URL=https://your-domain.example/api/reminders/dispatch \
  -e CRON_SECRET=your-secret \
  reminder-worker
```
