#!/bin/sh

VERSION="$1"

if [ -z ${VERSION} ];then
 echo "Version is missing, exit"
 exit 1
fi

IMAGE="<account-id>.dkr.ecr.eu-west-1.amazonaws.com/tomcat-base"

aws ecr get-login --no-include-email --region <region> | /bin/bash
if [ "$?"  -eq 0 ]; then
  docker build -t "${IMAGE}:${VERSION}" .
  docker push "${IMAGE}:${VERSION}"
  if [ "$?"  -eq 0 ]; then
    VER="latest"
    TAG_LATEST="${IMAGE}:${VER}"
    docker tag ${IMAGE}:${VERSION} $TAG_LATEST
    docker push $TAG_LATEST
  fi
else
  echo -n "Login failed, exiting"
  exit 1
fi

