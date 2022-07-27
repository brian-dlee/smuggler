#!/bin/bash

cat .env | grep VERCEL_SECRET__ >.env.secrets
cat .env | grep VERCEL_ENCRYPTION_KEY >>.env.secrets
cat .env | grep VERCEL_ENCRYPTION_IV >>.env.secrets
bash -c 'source .env.secrets; npx -y @briandlee/smuggler create'

eval "npx -y vercel $(cat .env | grep -v VERCEL_SECRET__ | awk "{ print \"-e '\"\$1\"'\" }"
