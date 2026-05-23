#!/bin/bash
docker build --no-cache -t personalgym-frontend .

docker stop personalgym-frontend
docker rm personalgym-frontend
docker run -d \
  --name personalgym-frontend \
  -p 3000:3000 \
  --restart unless-stopped \
  personalgym-frontend
