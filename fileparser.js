const formidable = require('formidable');
const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client, S3 } = require("@aws-sdk/client-s3");
const Transform = require('stream').Transform;
const express = require("express")
const mongoose = require('mongoose');

const helmet = require("helmet")

const app = express()
const fs = eval('require("fs")')

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION;
const Bucket = process.env.S3_BUCKET;

const TinyURL = require('tinyurl');

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

// function to upload file to S3 using formidable module
const parsefile = async (req) => {

    return new Promise((resolve, reject) => {
        let options = {
            maxFileSize: 100 * 1024 * 1024, //100 megabytes converted to bytes,
            allowEmptyFiles: false
        }

        const form = new formidable.IncomingForm(options);
        // method accepts the request and a callback.

        form.parse(req, (err, fields, files) => {
            // console.log(fields, "====", files)
        });

        form.on('error', error => {
            reject(error.message)
        })

        form.on('data', data => {
            if (data.name === "complete") {
                // let statuscode = data.value['$metadata']?.httpStatusCode || 200;
                resolve(data.value);
            }
        })

        form.on('fileBegin', (formName, file) => {

            file.open = async function () {
                this._writeStream = new Transform({
                    transform(chunk, encoding, callback) {
                        callback(null, chunk)
                    }
                })

                this._writeStream.on('error', e => {
                    form.emit('error', e)
                });

                // upload to S3
                new Upload({
                    client: new S3Client({
                        region,
                        credentials: {
                            accessKeyId,
                            secretAccessKey
                        },
                    }),
                    params: {
                        ACL: 'public-read',
                        Bucket,
                        Key: `${Date.now().toString()}-${this.originalFilename}`,
                        Body: this._writeStream
                    },
                    tags: [], // optional tags
                    queueSize: 4, // optional concurrency configuration
                    partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
                    leavePartsOnError: false, // optional manually handle dropped parts
                })
                    .done()
                    .then(data => {
                        const publicURL = data.Location.toString();

                        // Shorten the URL
                        TinyURL.shorten(`${publicURL}`, async function (shortPublicURL, err) {
                            if (err) {
                                console.log(err);
                            } else {
            
                                const newTinyUrlDocument = new TinyUrl({ url: shortPublicURL });
                                await newTinyUrlDocument.save()
                                    .then(savedDocument => {
                                        form.emit('data', { name: "complete", value: shortPublicURL });
                                    })
                                    .catch(err => {
                                        console.error('Error saving TinyURL:', err);
                                    });
                            }
                        }
                        )
                    }).catch((err) => {
                        form.emit('error', err);
                    })
            }

            file.end = function (cb) {
                this._writeStream.on('finish', () => {
                    this.emit('end')
                    cb()
                })
                this._writeStream.end()
            }
        })
    })
};

module.exports = parsefile;