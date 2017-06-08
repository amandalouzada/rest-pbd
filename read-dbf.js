var dbf = require('shapefile/dbf'), counter = 0, bulk,
  MongoClient = require('mongodb').MongoClient



module.exports = function(filename, collectionName, opts, callback) {
    var st = new Date();
    var db;

    MongoClient.connect('mongodb://@localhost:27017/abbt', (err, database) => {
      if (err)
      return console.log(err)

      db = database.collection(collectionName)
      console.log("Conectado ao banco");





    })


  var options = {};
  if (!callback) {
    callback = opts;
  } else {
    options = opts;
  }


  var reader = dbf.reader(filename);




  function join(header, val) {
    var obj = {};
    for (var i = 0; i < val.length; i++) {
        obj[header.fields[i].name] = val[i];
    }
    return obj;
  }

  reader.readHeader(function(error, header) {
    bulk = db.initializeOrderedBulkOp(); // Initialize the Ordered Batch initializeUnorderedBulkOp()
    if (error)
      return callback(error);

    if (options.lowercase) {
      header.fields.forEach(function(field) {
        field.name = field.name.toLowerCase();
      });
    }

    function readAllRecords() {

      (function readRecord() {

        reader.readRecord(function(error, record) {

          if (error) return callback(error);
          if (record === dbf.end) {

            bulk.execute();
            var et = new Date();
            var tdiff = (et - st)/1000;
            console.log(Math.floor(tdiff/60));

            reader.close(function(error) {
              if (error) return callback(error);
              callback(null);
            });
            return;
          }

          // db.insert(join(header,record), function (e, results){
          //     if (e) return;
          // });

          counter++;
          console.log(counter);
          bulk.insert(join(header,record), function (e, results){
              if (e) return;
          });

          if (counter % 300000 === 0 ) {
            // Execute the operation
            bulk.execute(function(err, result) {
                // re-initialise batch operation
                bulk = db.initializeOrderedBulkOp();
                callback();
            });
          }


          process.nextTick(readRecord);
        });
      })();


    }
    readAllRecords();


  });


};
