var express = require('express'),
  mongoskin = require('mongoskin'),
  bodyParser = require('body-parser')
  logger = require('morgan')
  jwt = require('jsonwebtoken')

var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(logger('dev'))

var db = mongoskin.db('mongodb://@localhost:27017/test', {safe:true})

app.get('/', function(req, res, next) {
  var response = 'Please select a collection, e.g., /api/v1/collections/messages <br>'
  response += '<b>/signup </b>- HTTP Post request to create create a user credentials. Expected fields: \'username\' and \'password\'.<br>'
  response += '<b>/authenticate </b>- HTTP Post request to grab a token. Expected fields: \'username\' and \'password\'.'

  res.send(response);

})

// Create a credential (username and password)
app.post('/signup', function(req, res, next){
  db.collection('users').insert(req.body, function(err, result) {
  res.json(result)
  });
})

// Authenticate user
app.post('/authenticate', function(req, res){
  console.log("received: " + req.body.username + " / " + req.body.password);
  db.collection('users').findOne(req.body, function(err, result){
    if (err) throw err;
    if (!result) {
      res.json({
        success: false,
        message: 'User not found.'
      }); 
    } else {
      console.log(req.body.username);
      console.log(req.body.password);
      var token = jwt.sign(result, 'secret_goes_here', {
        expiresIn: "12 days"
      });
      res.json({
        success: true,
        message: 'Username and password correct.',
        token: token 
      })
    }
  });
});

app.param('collectionName', function(req, res, next, collectionName){
  req.collection = db.collection(collectionName)
  return next()
})

// Verify if user's token for routes /api/v1/* is valid.
app.use('/api/v1/', function(req, res, next){
  console.log('ass' + req);
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // if found
  if (token){
    jwt.verify(token, 'secret_goes_here', function (err, decoded){
      if (err) {
        return res.json({
          success: false,
          message: 'Failed to authenticate token.' 
        })
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    res.json({
      success: false,
      message: 'Unable to find a token.'
    })
  }
})

app.get('/api/v1/collections/:collectionName', function(req, res, next) {
  req.collection.find({} ,{limit: 10, sort: {'_id': -1}}).toArray(function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.post('/api/v1/collections/:collectionName', function(req, res, next) {
  req.collection.insert(req.body, {}, function(e, results){
    if (e) return next(e)
    res.send(results)
  })
})

app.get('/api/v1/collections/:collectionName/:id', function(req, res, next) {
  req.collection.findById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send(result)
  })
})

app.put('/api/v1/collections/:collectionName/:id', function(req, res, next) {
  req.collection.updateById(req.params.id, {$set: req.body}, {safe: true, multi: false}, function(e, result){
    if (e) return next(e)
    res.send((result === 1) ? {msg:'success'} : {msg: 'error'})
  })
})

app.delete('/api/v1/collections/:collectionName/:id', function(req, res, next) {
  req.collection.removeById(req.params.id, function(e, result){
    if (e) return next(e)
    res.send((result === 1)?{msg: 'success'} : {msg: 'error'})
  })
})

app.listen(3000, function(){
  console.log('Express server listening on port 3000')
})

