const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

const conn = mongoose.connection
conn.on('connected', function() {
  console.log("mongoose connected")
})

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  user_id: String,
  description: { type: String, required: true },
  duration: { type: String, required: true },
  date: { type: Date, default: Date.now }
})

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', function(req, res) {
  var username = req.body.username
  User.findOne({ name: username }).then(function(foundUser) {
    if (foundUser == null) {
      var user = new User({ name: username })
      user.save().then(function(new_user) {
        res.json({ username: new_user.name, _id: new_user._id })
      }).catch(err => { console.error(err) })
    } else {
      console.log(foundUser)
      return res.json({ username: foundUser.name, _id: foundUser._id })
    }
  }).catch(err => { console.error(err) })

})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/users/:user_id/exercises', function(req, res) {
  console.log(req.body)
  User.findOne({ _id: req.body[':_id'] }).then(function(foundUser) {
    console.log(foundUser != null)
    if (foundUser != null) {
      var date = req.body.date
      if ('date' in req.body) {
        var new_date = new Date()
      } else {
        var new_date = new Date(date)
      }

      if (new_date == 'Invalid Date') {
        return console.error('Invalid Date')
      }
      console.log(new_date)
      var exercise = new Exercise({ user_id: req.body[':_id'], description: req.body.description, duration: req.body.duration, date: new_date })
      exercise.save().then(function(new_exercise) {
        console.log('working')
        function formatted_date(dateString) {
          const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
          var date = new Date(dateString)
          var d = date.toLocaleDateString('en-US', options);
          return d.split(',').join('')
        }
        var formatted_date = formatted_date(new_exercise.date)
        res.json({ _id: new_exercise.user_id, username: foundUser.name, date: formatted_date, duration: Number(new_exercise.duration), description: new_exercise.description })
      }).catch(err => {
        console.error(err)
      })
    }

  }).catch(err => {
    console.error(err)
  })
})

app.get('/api/users', function(req, res) {
  User.find().then((data) => {
    var user_data = []
    for (var i = 0; i < data.length; i++) {
      user_data.push({ _id: data[i]._id, username: data[i].name })
    }
    res.json(user_data)
  }).catch(err => {
    console.error(err)
  })
})

app.get('/api/users/:user_id/logs?', function(req, res) {
  var user_id = req.params.user_id
  User.findOne({ _id: user_id }).then(user => {
    if (user != null) {
      console.log(req.query)
      console.log("from" in req.query)
      if ("from" in req.query || "to" in req.query || "limit" in req.query) {
        var endDate;
        var startDate;
        var limit;
        if ('limit' in req.query) limit = req.query.limit
        if ('from' in req.query) startDate = new Date(req.query.from)
        if ('to' in req.query) endDate = new Date(req.query.to)
        console.log(startDate)
        console.log(endDate)
        var date_query;
        if (startDate instanceof Date && endDate instanceof Date) {
          date_query = { $gte: startDate, $lte: endDate }
        } else if (startDate instanceof Date) {
          console.log('working')
          date_query = { $gte: startDate }
        } else {
          date_query = { $lte: endDate }
        }

        Exercise.find({
          user_id: user_id,
          date: date_query
        }).limit(limit).then((data) => {
          function formatted_date(dateString) {
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            var d = dateString.toLocaleDateString('en-US', options);
            return d.split(',').join('')
          }

          var formatted_data = []
          for (var i = 0; i < data.length; i++) {
            formatted_data.push({ description: data[i].description, duration: Number(data[i].duration), date: formatted_date(data[i].date) })
          }
          return res.json({ _id: user_id, username: user.name, count: data.length, logs: formatted_data })

        }).catch(err => { console.error(err) })
      }
      else {
        Exercise.find({ user_id: user_id }).then(data => {
          function formatted_date(dateString) {
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            var date = new Date(dateString)
            var d = date.toLocaleDateString('en-US', options);
            return d.split(',').join('')
          }

          var formatted_data = []
          for (var i = 0; i < data.length; i++) {
            formatted_data.push({ description: data[i].description, duration: Number(data[i].duration), date: formatted_date(data[i].date) })
          }
          return res.json({ _id: user_id, username: user.name, count: data.length, logs: formatted_data })
        }).catch(err => { console.error(err) })
      }
    }

  }).catch(err => { console.error(err) })

})





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
