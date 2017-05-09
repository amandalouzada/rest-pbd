var dbf = require('shapefile/dbf'),
  MongoClient = require('mongodb').MongoClient



module.exports = function(filename, collectionName, opts, callback) {
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
            reader.close(function(error) {
              if (error) return callback(error);
              callback(null);
            });
            return;
          }
          db.insert(join(header,record), function (e, results){
              if (e) return;
          });
          process.nextTick(readRecord);
        });
      })();
    }
    readAllRecords();
  });

};
