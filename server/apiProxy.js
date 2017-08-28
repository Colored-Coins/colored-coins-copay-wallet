var httpProxy = require('http-proxy'),
    cors = require('./cors'),
    version = require('../package.json').version;

var testnetProxy = httpProxy.createProxyServer({});

var mainnetProxy = httpProxy.createProxyServer({});

var userAgent = function (proxyReq, req, res, options) {
  proxyReq.setHeader('User-Agent', req.headers['user-agent'] + ' ColoredCopay/' + version);
};

testnetProxy.on('proxyReq', userAgent);
mainnetProxy.on('proxyReq', userAgent);

var attach = function(app) {
  app.use('/api/testnet', cors, function(req, res) {
    testnetProxy.web(req, res, { target:'http://127.0.0.1:8080' });
  });

  app.use('/api/livenet', cors, function(req, res) {
    testnetProxy.web(req, res, { target:'http://127.0.0.1:8080' });
  });
};

module.exports = attach;
