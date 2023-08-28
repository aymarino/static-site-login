const crypto = require('crypto')
const jwt = require('jsonwebtoken');
const querystring = require('querystring');
require('dotenv').config({ path: '.auth.env' })

/// Respond with redirect to login page
function redirectToLogin(host, callback) {
  const response = {
    status: '302',
    statusDescription: 'Found',
    headers: {
      location: [{
        key: 'Location',
        value: `https://${host}/public/login.html`,
      }],
    },
  };
  callback(null, response);
}

exports.handler = (event, _context, callback) => {
  // Get the request and its headers
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const host = headers.host[0].value;

  if (!headers.cookie) {
    redirectToLogin(host, callback);
    return;
  }

  for (let i = 0; i < headers.cookie.length; i++) {
    const cookie = querystring.parse(headers.cookie[i].value);
    if (cookie.token) {
      try {
        const data = jwt.verify(cookie.token, process.env.SECRET_KEY);
        // User has authenticated
        callback(null, request);
      } catch {
        // Fall through to redirect
      }
    }
  }

  redirectToLogin(host, callback);
};
