const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');
require('dotenv').config({ path: '.auth.env' })

/// Response with redirect to base `host` domain
function getRedirectResponse(host, subpage) {
  return {
    status: '302',
    statusDescription: 'Found',
    headers: {
      location: [{
        key: 'Location',
        value: `https://${host}/${subpage}`,
      }],
    },
  };
}

/// Returns true iff the provided form data contains the correct username
/// and password.
function validCredentials(formParams) {
  if (!formParams.username || !formParams.password) {
    return false;
  }

  // Specify the username and password to be used
  const user = process.env.USERNAME;
  const hash = process.env.PASSWORD_HASH;

  const pwHash = crypto.createHash('sha256').update(formParams.password).digest('hex');
  if (formParams.username != user || pwHash != hash) {
    return false;
  }

  return true;
}

function setTokenCookie(response, tokenVal) {
  response.headers['set-cookie'] = [{
    key: 'Set-Cookie',
    value: `token=${tokenVal}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
  }];
}

exports.handler = (event, _context, callback) => {
  // Get the request and its headers
  const request = event.Records[0].cf.request;
  const host = request.headers.host[0].value;

  switch (request.method) {
    case "GET":
      // Let the request through to the origin.
      callback(null, request);
      break;
    case "POST":
      const body = Buffer.from(request.body.data, 'base64').toString();
      const params = querystring.parse(body);
      if (validCredentials(params)) {
        const token = jwt.sign({ id: 314 }, process.env.SECRET_KEY, {
          expiresIn: "1h",
        });
        const response = getRedirectResponse(host, '');
        setTokenCookie(response, token);
        callback(null, response); // Auth success, redirect to index
      } else {
        // Auth failed, redirect to login page
        callback(null, getRedirectResponse(host, 'public/login.html'));
      }
      break;
    case "DELETE": // logout
      const response = {
        status: '200',
        statusDescription: 'OK',
        headers: {},
      };
      setTokenCookie(response, ''); // Clear cookie
      callback(null, response); // Redirect to login page
      break;
    default:
      // Send back to login page
      callback(null, getRedirectResponse(host, 'public/login.html'));
      break;
  }
};
