'use strict';

var MAX_IMAGE_SIZE = 300000;

var formidable = require('formidable'),
    AWS = require('aws-sdk'),
    fs = require('fs'),
    cors = require('./cors'),
    crypto = require("crypto");


var isImage = function(mime) {
  return mime.indexOf('image/') == 0;
};

var sendError = function(res, err) {
  res.status(500).send(err.toString());
  console.error(err);
};

var handleUpload = function(req, res, s3) {
  // parse a file upload
  var form = new formidable.IncomingForm();

  var icon;
  var key;
  form.parse(req, function(err, fields, files) {
    icon = files.file;
    if (icon) {
      key = crypto.randomBytes(20).toString('hex') + icon.name.substr(icon.name.lastIndexOf('.'));
    }
  });

  form.on('end', function() {
    if (icon && isImage(icon.type) && icon.size < MAX_IMAGE_SIZE) {
      fs.readFile(icon.path, function(err, data) {
        if (err) {
          return sendError(res, err);
        }
        var params = { Key: key, Body: data };
        s3.putObject(params, function(err, data) {
          if (err) {
            return sendError(res, err);
          } else {
            var iconData = {
              url: 'https://s3.' + AWS.config.region + '.amazonaws.com/' + s3.config.params.Bucket + '/' + encodeURIComponent(key),
              mimeType: icon.type
            };
            res.json(iconData);
          }
        });
      });
    } else {
      res.status(400).json({ error: "Expected image of size up to " + (MAX_IMAGE_SIZE / 1000) + "Kb" });
    }
  });
};

var attach = function(app, s3region, s3bucket) {

  AWS.config.region = s3region;
  var s3 = new AWS.S3({params: {Bucket: s3bucket}});
  app.post('/upload', cors, function(req, res) {
    handleUpload(req, res, s3);
  });
};

module.exports = attach;
