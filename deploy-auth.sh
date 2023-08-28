# Deploys the authorizer lambda
set -e

### Stack parameters ###
export AWS_DEFAULT_PROFILE=<AWS profile to use>
CF_DISTRIBUTION_ID=<distribution id>
DOTENV_FILE=.auth.env # File with USERNAME and PASSWORD_HASH env vars in auth-functions dir
### Stack parameters above this line ###

FUNCTION_NAME=authorizer-lambda

export AWS_PAGER="" # Disable CLI using `less` to display output
export AWS_DEFAULT_REGION=us-east-1 # Lambda@Edge functions are always in IAD

ZIP_FILENAME=$(pwd)/auth-lambda-deployment.zip
rm -f $ZIP_FILENAME

# Ensure that the npm modules are installed
pushd auth-functions
npm install
zip -r $ZIP_FILENAME * $DOTENV_FILE
popd

aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://$ZIP_FILENAME

# Wait for function update to complete
while : ; do
  STATE=$(aws lambda get-function-configuration --function-name $FUNCTION_NAME | jq -r '.State')
  if [[ "$STATE" == "Active" ]]; then
    break
  fi
done

# Cloudfront can only invoke a specific function version
NEW_FUNCTION_ARN=$(aws lambda publish-version --function-name $FUNCTION_NAME | jq -r '.FunctionArn')
echo $NEW_FUNCTION_ARN

CONFIG=$(aws cloudfront get-distribution-config --id $CF_DISTRIBUTION_ID)
ETAG=$(echo $CONFIG | jq -r '.ETag')

CONFIG_FILE=$(mktemp)
echo $CONFIG \
  | jq '(.DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations.Items[0].LambdaFunctionARN) |= "'"$NEW_FUNCTION_ARN"'"' \
  | jq '.DistributionConfig' \
  > $CONFIG_FILE

aws cloudfront update-distribution \
  --id $CF_DISTRIBUTION_ID \
  --distribution-config "file://$CONFIG_FILE" \
  --if-match "$ETAG"

rm -f $CONFIG_FILE
