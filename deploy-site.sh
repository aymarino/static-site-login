# Deploys the static site to a private S3 bucket
set -e

### Stack parameters ###
export AWS_DEFAULT_PROFILE=<AWS profile to use>
export CF_DISTRIBUTION_ID=<Cloudfront distribution id>
export BUCKET_NAME=<S3 bucket name>
### Stack parameters above this line ###

export AWS_PAGER="" # Disable CLI using `less` to display output

find . -type f -name .DS_Store -delete # Clean up filesystem garbage

aws s3 sync site s3://$BUCKET_NAME
aws cloudfront create-invalidation \
    --distribution-id ${CF_DISTRIBUTION_ID} \
    --paths "/*"
