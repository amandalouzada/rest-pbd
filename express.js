var fileUpload = require('express-fileupload'),
express = require('express'),
cors = require('cors')
mongoskin = require('mongoskin'),
bodyParser = require('body-parser'),
logger = require('morgan'),
MongoClient = require('mongodb').MongoClient,
readDbf = require('./read-dbf'),
DBFFile = require('./dbffile/built/dbf-file')


// default options


var app = express()
app.use(cors())
app.use(fileUpload())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(logger('dev'))

var db

MongoClient.connect('mongodb://@localhost:27017/abbt', (err, database) => {
  if (err)
  return console.log(err)

  db = database
  console.log("Conectado ao banco");

})


app.param('collectionName', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName)
  return next()
})


app.get('/', function(req, res, next) {
  res.send('please select a collection, e.g., /collections/messages')
})

app.get('/collections', function(req, res, next) {
  db.listCollections({}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/collections/:collectionName', function(req, res, next) {
  req.collection.find({"_conf": { $not: { $lte:1 } } },{'_id':0},{limit: 1}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/collectionsExport/:collectionName', function(req, res, next) {
  req.collection.find({"_conf":1}, exportID).toArray(function (err, data){
      if(data !== ''){
          res.set({'Content-Disposition': 'attachment; filename=' + req.params.coll + '.json'});
          res.send(JSON.stringify(data, null, 2));
        }else{
            common.render_error(res, req, req.i18n.__('Export error: Collection not found'), req.params.conn);
          }
      });
})


app.get('/collectionsConf/:collectionName', function(req, res, next) {
  req.collection.find({"_conf":1},{'_id':0}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/collectionsConfG/:collectionName', function(req, res, next) {
  req.collection.find({"_conf":1},{'colunas':1}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})



//Insere um documento
app.post('/collections/:collectionName', function(req, res, next) {
  req.collection.insert(req.body, {}, function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

//Busca por Id
app.get('/collections/:collectionName/:id', function(req, res, next) {
  req.collection.findById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send(result)
  })
})

//Busca por Parametro
app.get('/collections/:collectionName/:key/:valor', function(req, res, next) {
  console.log("busca por parametro");
  var query={};
  query[req.params.key]= req.params.valor;
  req.collection.find(query).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})



app.put('/collections/:collectionName/:id', function(req, res, next) {
  req.collection.updateById(req.params.id, {$set: req.body}, {safe: true, multi: false}, function(e, result){
    if (e) return next(e)
    res.send((result === 1) ? {msg:'success'} : {msg: 'error'})
  })
})

app.delete('/collections/:collectionName/:id', function(req, res, next) {
  req.collection.removeById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send((result === 1)?{msg: 'success'} : {msg: 'error'})
  })
})

app.get('/collectionsOrder/:collectionName/:parametro/:ordem/:page', function(req, res, next) {
  var query={};
  query[req.params.parametro]= parseInt(req.params.ordem);
  console.log(query);
  req.collection.find({"_conf": { $not: { $lte:1 } }},{'_id':0}).sort(query).skip(parseInt(req.params.page)).limit(100).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/collectionsPagina/:collectionName/:page', function(req, res, next) {
  req.collection.find({"_conf": { $not: { $lte:1 } }},{'_id':0}).skip(parseInt(req.params.page)).limit(100).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/collectionsQtd/:collectionName', function(req, res, next) {
  req.collection.count(function(e, count){
    if (e) return next(e)
    res.send([{count}])
  })
})

app.post('/upload/:collectionName', function(req, res) {


  if (!req.files)
  return res.status(400).send('No files were uploaded.');

  let sampleFile = req.files.file;

  sampleFile.mv('./uploads/db.dbf', function(err) {
    if (err)
    return res.status(500).send(err);



    DBFFile.open('./uploads/db.dbf')
    .then(dbf => {
      console.log(`DBF file contains ${dbf.recordCount} rows.`);
      console.log(`Field names: ${dbf.fields.map(f => f.name)}`);
      console.log(dbf.readCount);
      var fields = dbf.fields.map(f => f.name);

      var conf = { _conf:1, colunas:{}};
      for (var i=0; i < fields.length; i++) {
      var field = {
          "id": "",
          "nome": "",
          "tipo": "",
          "mascaras": [
            {
              "chave": "",
              "valor": "",
              "valores": {
                "avulso": [],
                "intervalos": []
              }
            }
          ]
        }
        field.id = fields[i];
        field.nome = fields[i];
        field.tipo = "TEXTO";
        conf.colunas[field.nome]=field;
      }

      db.collection(req.params.collectionName).createIndex({"_conf":1})
      db.collection(req.params.collectionName).insert(conf)
      return res.send(dbf.readInsertRecords(1,db.collection(req.params.collectionName)));
    })
    .then(res => console.log(res))
    .catch(err => console.log('An error occurred: ' + err));


    // readDbf('./uploads/db.dbf', req.params.collectionName, function(err, res) {
    //   if(err)
    //     return res.status(500).send(err);
    //
    // })
    //
    // res.send("inserindo");


  });


})

app.listen(3000, function(){
  console.log('Express server listening on port 3000')
})
