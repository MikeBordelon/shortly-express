var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

// Initiate the session cookies
app.use(session({
  secret: 'My Secret Life',
  login: false,
  resave: null,
  saveUninitialized: true,
  cookie: {}
}));

app.use(express.static(__dirname + '/public'));


var restrict = function(req, res, next) {
  if (req.session.login) {
    next();
  } else {
    res.redirect('/login');
  }
};

app.get('/', restrict,
function(req, res) {
  console.log('get1');
  res.render('index');
});

// app.get('/create', restrict,
// function(req, res) {
//   console.log('get2');
//   res.render('index');
// });


app.get('/links', restrict,
function(req, res) {
  console.log('get3');
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});



app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

app.post('/signup',
function(req, res) {

  new User({ username: req.body.username }).fetch().then(function(found) {
    if (found) {
      console.log('username is taken');
    } else {
      Users.create({
        username: req.body.username,
        password: req.body.password
      })
        .then(function() {
          req.session.login = true;
          res.redirect('/');
        });
    }
  });
});
/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  console.log('login');
  res.render('login');
});

app.post('/login', function(req, res) {
  // console.log('post req:', req.body);

  if (req.body.username === 'Phillip' && req.body.password === 'Phillip') {
    req.session.login = true;
    res.redirect('/');
  } else {
    res.redirect('/login');
  }


});



// db.knex.schema.hasTable('users').then(function(exists) {
//   if (!exists) {
//     db.knex.schema.createTable('users', function (user) {
//       user.increments('id').primary();
//       user.string('username', 255);
//       user.string('password', 255);
//       user.timestamps();
//     }).then(function (table) {
//       console.log('Created Table', table);
//     });
//   }
// });

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);