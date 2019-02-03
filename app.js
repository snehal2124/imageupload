const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//Middleware
app.use(function(req, res, next) {
    //set headers to allow cross origin request.
        res.header("Access-Control-Allow-Origin", "*");
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));



//Mongo URI
const mongoURI = 'mongodb://localhost:27017/imageuploads';

var conn = mongoose.connect(mongoURI, { useNewUrlParser: true });

// Init gfs
let gfs ;

var conn = mongoose.createConnection(mongoURI);
conn.once('open', function () {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
  // all set!
})



var storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const filename = `${Date.now()}${path.extname(file.originalname)}`;
            const fileInfo = {
                filename: filename,
                bucketName: 'uploads'
            };
            resolve(fileInfo);
        });
    }
});

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        process.stdout.write("hello: ");
        if (file.mimetype !== 'image/png' && file.mimetype !== 'image/gif' && file.mimetype !== 'image/jpeg') {
            return cb(new Error("only images allowed"), false);
        } else {
            cb(null, true);
        }
    }
}).array('file');

//Routes

//POST /uploads
app.post('/upload', (req, res) => {
    upload(req, res, function (err) {  
        if (err instanceof multer.MulterError) {
            console.error(err);
        } else if (err) {
            res.json({ status: "error", msg: "File Upload Failed" });
        }
        else{
            res.json({ status: "success", data: req.files });
        }
        
    });
})

app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: 'No files exist'
        });
      }
  
      // Files exist
      return res.json(files);
    });
});

app.get('/image', (req, res) => {
    gfs.files.findOne({ filename: "1549173967229.jpg" }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      
      //Check if image
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png'|| file.contentType === 'image/jpg') {
        // Read output to browser
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    });
  });


const port = 5000;

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
})
