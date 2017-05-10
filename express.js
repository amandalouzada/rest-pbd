var fileUpload = require('express-fileupload'),
express = require('express'),
cors = require('cors')
mongoskin = require('mongoskin'),
bodyParser = require('body-parser'),
logger = require('morgan'),
MongoClient = require('mongodb').MongoClient,
readDbf = require('./read-dbf')



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

//Lista os 10 primeiros registros
app.get('/collections', function(req, res, next) {
  db.listCollections({}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

//Lista os 10 primeiros registros
app.get('/collections/:collectionName', function(req, res, next) {
  req.collection.find({} ,{limit: 1, sort: {'_id': -1}}).toArray(function(e, results){
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
  req.collection.find(query ,{limit: 200}).toArray(function(e, results){
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

app.get('/collectionsPagina/:collectionName/:page', function(req, res, next) {
  req.collection.find().skip(parseInt(req.params.page)).limit(100).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/collectionsQtd/:collectionName', function(req, res, next) {
  req.collection.count(function(e, count){
    if (e) return next(e)
    var qtd = {count: count};
    res.send(qtd)
  })
})

app.post('/upload/:collectionName', function(req, res) {
  if (!req.files)
  return res.status(400).send('No files were uploaded.');

  let sampleFile = req.files.file;

  sampleFile.mv('./uploads/db.dbf', function(err) {
    if (err)
      return res.status(500).send(err);


    readDbf('./uploads/db.dbf', req.params.collectionName, function(err, res) {
      if(err)
        return res.status(500).send(err);

    })

    res.send("inserindo");


  });


})

app.listen(3000, function(){
  console.log('Express server listening on port 3000')
})
