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
  name: { type: String },
  exercise: { type: Array }

})


let User = mongoose.model('User', userSchema);

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
  var date = req.body.date
  if ('date' in req.body) {
    var new_date = new Date(date)
  } else {
    var new_date = new Date()
  }

  if (new_date == 'Invalid Date') {
    return console.error('Invalid Date')
  }
  console.log(new_date)
  var exerciseData = { description: req.body.description, duration: req.body.duration, date: new_date }
  User.findByIdAndUpdate(req.params.user_id, { $push: { exercise: exerciseData } }).then(function(data) {
    function formatted_date(dateString) {
      const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      var date = new Date(dateString)
      var d = date.toLocaleDateString('en-US', options);
      return d.split(',').join('')
    }
    var formatted_date = formatted_date(new_date)

    res.json({ _id: data._id, username: data.name, date: formatted_date, duration: Number(exerciseData.duration), description: exerciseData.description })
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
        if ((startDate instanceof Date) && (endDate instanceof Date)) {
          var exercises = user.exercise.filter((exercise) => { return (exercise.date >= startDate && exercise.date <= endDate) })
        } else if (startDate instanceof Date) {
          var exercises = user.exercise.filter((exercise) => { return exercise.date >= startDate })
        } else if (endDate instanceof Date) {
          var exercises = user.exercise.filter((exercise) => { return exercise.date <= endDate })
        } else {
          var exercises = user.exercise
        }
        function formatted_date(dateString) {
          const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
          var d = dateString.toLocaleDateString('en-US', options);
          return d.split(',').join('')
        }

        var formatted_data = []
        if (limit != null) { var length = Number(limit) } else { var length = exercises.length }
        for (var i = 0; i < length; i++) {
          formatted_data.push({ description: exercises[i].description, duration: Number(exercises[i].duration), date: formatted_date(exercises[i].date) })
        }
        return res.json({ _id: user_id, username: user.name, count: length, log: formatted_data })
      }
      else {
        function formatted_date(dateString) {
          const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
          var date = new Date(dateString)
          var d = date.toLocaleDateString('en-US', options);
          return d.split(',').join('')
        }

        var formatted_data = []

        for (var i = 0; i < user.exercise.length; i++) {
          formatted_data.push({ description: user.exercise[i].description, duration: Number(user.exercise[i].duration), date: formatted_date(user.exercise[i].date) })
        }
        return res.json({ _id: user_id, username: user.name, count: user.exercise.length, log: formatted_data })
      }
    }

  }).catch(err => { console.error(err) })

})





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
