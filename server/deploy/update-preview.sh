#!/usr/bin/env bash
# Run as the existing sudo-capable operator on the Tokyo host.
# Publishes the current backend checkout's matching frontend as a test mirror.
set -eu
cd /opt/paperstrike
test -z "$(sudo -u paperstrike git status --porcelain)"
release=$(sudo -u paperstrike git rev-parse HEAD)
sudo -u paperstrike env PATH=/usr/local/bin:/usr/bin:/bin NEXT_PUBLIC_PVP_SERVER_URL=https://pvp.joyehuang.app nice -n 10 /usr/local/bin/npm run build:vercel
test -s dist/client/index.html
test -s dist/client/pvp.html
target="/srv/paperstrike-preview/$release"
sudo install -d -m 755 "$target"
sudo cp -a dist/client/. "$target/"
sudo chmod -R a+rX "$target"
sudo ln -sfn "$target" /srv/paperstrike-preview/current
echo "Published frontend test mirror: $release"
