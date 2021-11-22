#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name solution-name version-code
#
# Paramenters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "# Please provide all required parameters for the build script."
  echo "For example: ./build-s3-dist.sh solutions solution-name v1.0.0"
  exit 1
fi

# Build source
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "Clean up old build files"
echo "------------------------------------------------------------------------------"
echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
echo "mkdir -p $template_dist_dir"
mkdir -p $template_dist_dir
echo "rm -rf $build_dist_dir"
rm -rf $build_dist_dir
echo "mkdir -p $build_dist_dir"
mkdir -p $build_dist_dir

echo "------------------------------------------------------------------------------"
echo "Synth CDK Template"
echo "------------------------------------------------------------------------------"
SUB_BUCKET_NAME="s/BUCKET_NAME_PLACEHOLDER/$1/g"
SUB_SOLUTION_NAME="s/SOLUTION_NAME_PLACEHOLDER/$2/g"
SUB_VERSION="s/VERSION_PLACEHOLDER/$3/g"
export overrideWarningsEnabled=false

cd $source_dir/infrastructure
npm run clean
npm install
export overrideWarningsEnabled=false
node_modules/aws-cdk/bin/cdk synth --asset-metadata false --path-metadata false > $template_dir/iot-device-simulator.template
sed -e $SUB_BUCKET_NAME -e $SUB_SOLUTION_NAME -e $SUB_VERSION $template_dir/iot-device-simulator.template > $template_dist_dir/iot-device-simulator.template
rm $template_dir/iot-device-simulator.template

declare -a lambda_packages=(
  "microservices"
  "simulator"
  "custom-resource"
)

for lambda_package in "${lambda_packages[@]}"
do
  echo "------------------------------------------------------------------------------"
  echo "Build Lambda package: $lambda_package"
  echo "------------------------------------------------------------------------------"
  cd $source_dir/$lambda_package
  npm run package

  # Check the result of the package step and exit if a failure is identified
  if [ $? -eq 0 ]
  then
    echo "Package for $lambda_package built successfully"
  else
    echo "******************************************************************************"
    echo "Lambda package build FAILED for $lambda_package"
    echo "******************************************************************************"
    exit 1
  fi

  mv dist/package.zip $build_dist_dir/$lambda_package.zip
done

echo "------------------------------------------------------------------------------"
echo "Building console"
echo "------------------------------------------------------------------------------"
cd $source_dir/console
[ -e build ] && rm -r build
[ -e node_modules ] && rm -rf node_modules
npm install
npm run build
mkdir $build_dist_dir/console
cp -r ./build/* $build_dist_dir/console/

echo "------------------------------------------------------------------------------"
echo "Copying routes files"
echo "------------------------------------------------------------------------------"
cd $source_dir/resources
mkdir $build_dist_dir/routes
cp -r routes/* $build_dist_dir/routes/

echo "------------------------------------------------------------------------------"
echo "[Create] UI manifest"
echo "------------------------------------------------------------------------------"
cd $build_dist_dir
manifest=(`find console -type f | sed 's|^./||'`)
manifest_json=$(IFS=,;printf "%s" "${manifest[*]}")
echo "[\"$manifest_json\"]" | sed 's/,/","/g' >> $build_dist_dir/site-manifest.json

echo "------------------------------------------------------------------------------"
echo "[Create] Routes manifest"
echo "------------------------------------------------------------------------------"
cd "$build_dist_dir"
manifest=(`find routes -type f | sed 's|^./||'`)
manifest_json=$(IFS=,;printf "%s" "${manifest[*]}")
echo "[\"$manifest_json\"]" | sed 's/,/","/g' >> $build_dist_dir/routes-manifest.json