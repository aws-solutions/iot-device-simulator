#!/bin/bash

# Check to see if input has been provided:
if [ -z "$1" ]; then
    echo "Please provide the region where your simulator will connect."
    echo "For example: ./run.sh us-east-1"
    exit 1
fi

AWS_ACCESS_KEY_ID=$(aws --profile default configure get aws_access_key_id)
AWS_SECRET_ACCESS_KEY=$(aws --profile default configure get aws_secret_access_key)
AWS_REGION=$1

docker run -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY -e AWS_REGION=$AWS_REGION -i -t iotsim 
