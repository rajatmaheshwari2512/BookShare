const express = require('express')
const ejs = require('ejs')
const multer = require('multer')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const Grid = require('gridfs-stream')
const GridFsStorage = require('multer-gridfs-storage')
const path = require('path')
const methodOverride = require('method-override')
var fs = require('fs')

const Schema = mongoose.Schema;
const app = express();

const uploadSchema = new Schema({
    author_name:{
        type:String,
        required:true
    },
    desc:{
        type:String
    },
    fileID:{
        type: Schema.Types.ObjectId
    }
});

const UPLOAD = mongoose.model("UPLOAD",uploadSchema)

//Middleware
app.use(bodyParser.json())
app.use(methodOverride("_method"))
app.set("view engine","ejs")

//this variable gives the data of the files getting uploaded .
var gfs;
//Mongoose Connection
const uri = 'mongodb+srv://learn:learn@learning.nplhm.mongodb.net/bookSharing?retryWrites=true&w=majority'
mongoose.connect( uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true } )
const con = mongoose.connection;
con.on('open',()=>{
    gfs = Grid(con.db,mongoose.mongo)
    gfs.collection('uploads') //The folder in booksharing where all the data will be stored
    console.log("Connected to Database")
})

//storage
var storage = new GridFsStorage({
    url:uri,
    file: (req,file)=>{
        return new Promise((resolve,reject)=>{
            const filename = file.originalname  //+Date.now() + path.extname(file.originalname)
            const fileinfo = {
                filename : filename,
                bucketName : 'uploads', //same as gfs.collection
            };
            resolve(fileinfo)
        })
    }
})

const upload = multer({storage});

app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length==0){
            res.render('index',{files:false})
        }else{
            //This can be used, when we specify only pdf to be uploaded into the database , baad me add karduga only pdf
            /*files.map(file => {
                if(file.contentType =="application/pdf"){
                  file.isPDF = true;
                }
                else{
                  file.isPDF = false;
                }
              })*/
            res.render('index',{files:files})
        }
    })
})

//This is used to upload all the documents to mongodb
app.post('/upload',upload.single('file'),(req,res)=>{
    /*var source = gfs.createReadStream({filename:req.file.filename});

    var target = gfs.createWriteStream({
        filename:req.file.filename,
        metadata:{author:req.body.author}
    });

    source.pipe(target);*/
    gfs.files.update({filename:req.file.filename},{'$set':{metadata:{author:req.body.author,desc:req.body.desc}}}) //mongodb command
    res.redirect('/')
})


//This was made so that the pdf can be taken from here.
app.get('/pdf/:nameOfFile',(req,res)=>{
    const nameOfFile = req.params.nameOfFile;
    gfs.files.find().toArray((err,file)=>{
        if(err){
            res.status(400).send("Unable to access the image")
        }
        file.map((e)=>{
            if(e.filename==nameOfFile){
                //This gives us the pdf in new tab because of _blank used in form( gridfs-stream uploading)
                var readstream = gfs.createReadStream({ filename: nameOfFile });
                readstream.pipe(res);
            }
        })
    })
})



//PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log('Server is connected to the port - '+ PORT)
})
