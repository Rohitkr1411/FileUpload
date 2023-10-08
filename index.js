const express = require('express');
const app = express();
require('dotenv').config();

require('aws-sdk/lib/maintenance_mode_message').suppress = true;
app.set('json spaces', 5); // to pretify json response

const PORT = process.env.PORT || 9000;
const fileparser = require('./fileparser');

const mongoDB = require('./db.js')
const methodOverride = require('method-override')

// const apiRouter = require('./fileparser.js')

mongoDB;

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(methodOverride('_method'))

app.get('/', (req, res) => {
    res.render('./home')
});

app.post('/api/upload', async (req, res) => {
    await fileparser(req)
        .then(data => {
            res.status(200).render('./download', { tinyUrl: data })
        })
        .catch(error => {
            res.status(400).json({
                message: "An error occurred.",
                error
            })
        })
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}.`);
})








































