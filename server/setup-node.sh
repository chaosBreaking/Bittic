#!/bin/bash

echo "Usage: setup.sh [VERSION]"
echo "Example: setup.sh 9"

if [ v$1 != v ]
then
  export nodeVersion=$1
else
  export nodeVersion=9
fi

apt update
apt install curl -y

echo "######## 安装 node v$nodeVersion ##################"
echo https://deb.nodesource.com/setup_$nodeVersion.x
curl -sL https://deb.nodesource.com/setup_$nodeVersion.x | bash -
apt install nodejs -y
echo "######## node v$nodeVersion 安装完毕！##################"
