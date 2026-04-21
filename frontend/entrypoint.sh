#!/bin/sh

set -e

TARGET_DIR="${FRONTEND_BUILD_DIR:-/frontend_static}"

mkdir -p "$TARGET_DIR"
rm -rf "$TARGET_DIR"/*
cp -r /app/build/. "$TARGET_DIR"/

exec "$@"
