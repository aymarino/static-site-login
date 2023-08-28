# Static site with login template

This is a template for static sites hosted on AWS S3, with login page served
by AWS Cloudfront and Lambda@Edge as a thin serverless backend.

## Directories

* `site`: the directory synced to the S3 bucket exposed as the static site.
* `auth-functions/authenticate-user.js`: the 'authentication' function invoked
on each viewer request to the `/login` route.
Validates the credentials submitted from the 'login' page and returns an access
token if valid.
It is set up currently to only recognize a single, static user/password combo,
but it could be extended to connect to e.g. a database.
* `auth-functions/authorizer-lambda.js`: the 'authorization' function invoked 
on each viewer request to any other route.
Checks for a valid access token before allowing the request through.

## Deployment

There are scripts to automate deployment of the site and each authentication
function, but it assumes the resources are already created.
If in the future I learn Terraform or CDK, I may update this with the right
creation recipes.

These are the resources required (and assumed by the `deploy-` scripts):

* An S3 bucket containing the site, configured as a website.
  - E.g.: `aws s3 website s3://${BUCKET_NAME}/ --index-document index.html`

* Both authentication/authorizer Lambda functions created in `us-east-1`
(requirement for Lambda@Edge)
  - E.g.:

```sh
aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --role arn:aws:iam::${AWS_ACCOUNT_ID}:role/service-role/${LAMBDA_ROLE_NAME} \
  --runtime nodejs18.x \
  --handler authenticate-user.handler \
  --zip-file fileb://$ZIP_FILENAME \
  --region us-east-1
```

* The zip package for the Lambda functions includes a `.auth.env`
file with the following format:
```bash
USERNAME=<static username>
PASSWORD_HASH=<sha256 hash of static password>
SECRET_KEY=<key to sign tokens with>
```

* A Cloudfront distribution with the S3 website as its origin with
two behaviors:
  - Pattern for `/public/*`:
    - all HTTP methods allowed (`DELETE` is used for logout).
    - viewer request Lambda@Edge association to the `authenticate-user` 
    function.
  - Default pattern:
    - only needs `GET`/`HEAD` methods enabled.
    - viewer request Lambda@Edge association to the `authorizer-lambda` 
    function.
