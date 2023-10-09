const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 9000;

const TinyURL = require('tinyurl');
const helmet = require("helmet")
app.use(helmet())

helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
        "font-src": ["'self'", "external-website.com"],
        // allowing styles from any website
        "style-src": null,
    },
})

app.use(
    helmet.referrerPolicy({
        policy: "no-referrer",
    })
)

const tinyUrlSchema = new mongoose.Schema({
    url: String, // Field to store the TinyURL
    date: { type: Date, default: Date.now }
});

// Create a model based on the schema
const TinyUrl = mongoose.model('TinyUrl', tinyUrlSchema);

const uploadFileToS3 = (req) => {
  return new Promise((resolve, reject) => {
    // Configure AWS SDK with your credentials
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.S3_REGION,
    });

    // Create an S3 instance
    const s3 = new AWS.S3();

    // Configure Multer to handle file uploads
    // const storage = multer.memoryStorage();
    // const upload = multer({ storage: storage });

    // Generate a unique filename
    const filename = `${Date.now().toString()}-${req.file.originalname}`;

    // Prepare parameters for S3 upload
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: req.file.buffer,
      ACL: 'public-read'
    };

    // Upload the file to S3
    s3.upload(params, (err, data) => {
      if (err) {
        console.error('Error uploading file to S3:', err);
        reject(err);
      } else {
        const publicURL = data.Location.toString();
        TinyURL.shorten(`${publicURL}`, async function (shortPublicURL, err) {
            if (err) {
                console.log(err);
            } else {
                
                const newTinyUrlDocument = new TinyUrl({ url: shortPublicURL });
                await newTinyUrlDocument.save()
                    .then(savedDocument => {
                        // form.emit('data', { name: "complete", value: shortPublicURL });
                        resolve(shortPublicURL);
                    })
                    .catch(err => {
                        console.error('Error saving TinyURL:', err);
                    });
            }
        }
        )
      
      }
    });
  });
};

module.exports = uploadFileToS3;
