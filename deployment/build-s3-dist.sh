#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name version-code
#
# Paramenters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#
#  - version-code: version of the package

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Please provide the base source bucket name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions v1.0.0"
    exit 1
fi

# Get reference for all important folders
template_dir="$PWD"
dist_dir="$template_dir/dist"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old dist, node_modules and bower_components folders"
echo "------------------------------------------------------------------------------"
echo "rm -rf $dist_dir"
rm -rf $dist_dir
echo "mkdir -p $dist_dir"
mkdir -p $dist_dir
echo "mkdir -p $dist_dir/console"
mkdir -p $dist_dir/console
echo "mkdir -p $dist_dir/routes"
mkdir -p $dist_dir/routedata/routes

echo "------------------------------------------------------------------------------"
echo "[Packing] Templates"
echo "------------------------------------------------------------------------------"
echo "cp $template_dir/iot-device-simulator.yaml $dist_dir/iot-device-simulator.template"
cp $template_dir/iot-device-simulator.yaml $dist_dir/iot-device-simulator.template

echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i '' -e $replace $dist_dir/iot-device-simulator.template"
sed -i '' -e $replace $dist_dir/iot-device-simulator.template
replace="s/%%VERSION%%/$2/g"
echo "sed -i '' -e $replace $dist_dir/iot-device-simulator.template"
sed -i '' -e $replace $dist_dir/iot-device-simulator.template

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Console"
echo "------------------------------------------------------------------------------"
# build and copy console distribution files
cd $source_dir/console
rm -r ./dist
npm install
./node_modules/@angular/cli/bin/ng build --prod --aot=false
cp -r ./dist/** $dist_dir/console
rm $dist_dir/console/assets/appVariables.js

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Services - Admin"
echo "------------------------------------------------------------------------------"
cd $source_dir/services/admin
npm run build
cp ./dist/iot-sim-admin-service.zip $dist_dir/iot-sim-admin-service.zip

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Services - Device"
echo "------------------------------------------------------------------------------"
cd $source_dir/services/device
npm run build
cp ./dist/iot-sim-device-service.zip $dist_dir/iot-sim-device-service.zip

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Services - Profile"
echo "------------------------------------------------------------------------------"
cd $source_dir/services/profile
npm run build
cp ./dist/iot-sim-profile-service.zip $dist_dir/iot-sim-profile-service.zip

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Services - Metrics"
echo "------------------------------------------------------------------------------"
cd $source_dir/services/metrics
npm run build
cp ./dist/iot-sim-metrics-service.zip $dist_dir/iot-sim-metrics-service.zip

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Resource - Custom Helper"
echo "------------------------------------------------------------------------------"
cd $source_dir/resources/helper
npm run build
cp ./dist/iot-sim-helper.zip $dist_dir/iot-sim-helper.zip

echo "------------------------------------------------------------------------------"
echo "[Manifest] Generating console manifest"
echo "------------------------------------------------------------------------------"
cd $template_dir/manifest-generator
npm install --production
node app.js --target ../dist/console --output ../dist/site-manifest.json

echo "------------------------------------------------------------------------------"
echo "[Routes] Generating route manifest"
echo "------------------------------------------------------------------------------"
cd $source_dir/resources/routes
cp -r $source_dir/resources/routes/** $dist_dir/routedata/routes
cd $template_dir/manifest-generator
node app.js --target ../dist/routedata --output ../dist/routes-manifest.json
