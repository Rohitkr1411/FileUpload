const express = require('express');
const app = express();
require('dotenv').config();

require('aws-sdk/lib/maintenance_mode_message').suppress = true;
app.set('json spaces', 5); // to pretify json response

const PORT = process.env.PORT || 9000;

const uploadFile=require('./app')
const mongoDB = require('./db.js')
const methodOverride = require('method-override')



const multer = require('multer');

// Define storage settings
const storage = multer.memoryStorage(); // Store files in memory as buffers

// Create a Multer instance with your storage settings
const upload = multer({ storage: storage });    

mongoDB;

app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(methodOverride('_method'))

app.get('/', (req, res) => {
    res.render('./home')
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      const tinyUrl = await uploadFile(req);
      
      res.status(200).render('./download', { tinyUrl:tinyUrl});
    } catch (error) {
      res.status(400).json({
        message: "An error occurred.",
        error: error.message,
      });
    }
  });
  

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}.`);
})








































