const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const mongoose = require('mongoose')
const compression = require('compression')
const helmet = require('helmet')
const RateLimit = require('express-rate-limit')
require('dotenv').config()

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')

const app = express()

// set up mongoose connection
mongoose.set('strictQuery', false)
main().catch((err) => console.log(err))
async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
}

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
app.use(compression())
// Set CSP headers to allow our normalize.css to be served
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      'script-src': ["'self'", 'cdnjs.cloudflare.com'],
    },
  })
)
// Set up rate limiter: maximum of 500 requests per minute
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500,
})
// Apply rate limiter to all requests
app.use(limiter)

app.use('/', indexRouter)
app.use('/users', usersRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
