var mongodb = require('mongodb');
var Db = mongodb.Db;
var Connection = mongodb.Connection;
var Server = mongodb.Server;
var format = require('util').format;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;
var bucket = '/t3media'; // the mount point of S3 bucket using s3fs

var spawn = require('child_process').spawn
var fs = require('fs');
var async = require('async');
var DBname = 'TSL';
var collectionName = 'words';

console.log("Connecting to " + host + ":" + port);
Db.connect(format("mongodb://%s:%s/%s?w=1", host, DBname, port), function(err, db) {
  db.collection(collectionName, function(err, collection) {      
    
    var listOfObjectToTranscode = new Array();

    collection.find().each(function(err, item) {
      if(item != null) {
        // console.dir(item._id);
        listOfObjectToTranscode.push(item._id);
      }else{
        console.log('Collecting list is complete');
        db.close();
        transcodeArray(listOfObjectToTranscode);
      }
    });
  });
});

function transcodeArray(array){

  var functionsArray = new Array();

  for(var i in array){
    var record = bucket + '/'  + array[i];
    console.log('-',record);

    var f = (function(record){
      return function(callback){ 
        transcodeVideo(record,callback);
      };
    })(record);

    functionsArray.push(f);
  }

  async.series(functionsArray,function(err,results){
    console.log('DONE',err,results);
  });

}

function transcodeVideo(folder,callback){
  // ffmpeg -i mp4-720p -b 2000 -qscale 1 -qcomp 0 -qblur 0 image%d.jpg
  var filename = folder+'/mp4-720p';
  var outputImageFilename = folder+'/image%d.jpg';
  var ffmpeg = spawn('ffmpeg',['-i', filename, '-b', '2000', '-qscale', '1', '-qcomp', '0', '-qblur', '0', outputImageFilename]);


  // ffmpeg.stdout.on('data', function (data) {
  //   console.log('' + data);
  // });

  // ffmpeg.stderr.on('data', function (data) {
  //   console.log('grep stderr: ' + data);
  // });

  ffmpeg.on('close', function (code) {
    if (code !== 0) {
      console.log('grep process exited with code ' + code);
    }else{
      // console.log('success');
    }
    if(code == 0) code = null;
    fs.readdir(folder,function(err,files){
      callback(code,files.length-1);  
    });
  });
}