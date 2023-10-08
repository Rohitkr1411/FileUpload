const mongoose = require('mongoose');

const MongoURI=process.env.MongoURI

// file to connect to MongoDb
const mongoDB = async () => {
    try {
      await mongoose.connect(MongoURI);
      }
      catch (error) {
      console.log('err: ',error);
    }
  };
 


module.exports=mongoDB();