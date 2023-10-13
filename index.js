const express = require('express')
const app = express()
const cors = require('cors')

app.use(express.static('dist'))

/*
var morgan = require('morgan')
var fs = require('fs')
var path = require('path')
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })

morgan.token('customdate', function() {//req, res can be done inside function if necessary
  return new Date().toISOString() // Customize the timestamp format as needed
})
app.use(morgan(':customdate :method :url :status :res[content-length] - :response-time ms', { stream: accessLogStream }))
*/

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(cors())
app.use(express.json())
app.use(express.static('build'))

const Note = require('./models/note')

app.get('/api/notes', (request, response) => {
  Note.find({}).then(notes => {
    response.json(notes)
  })
})

app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1>')
})

app.get('/api/notes/:id', (request, response,next) => {
  Note.findById(request.params.id)
    .then(note => {
      if (note) {
        response.json(note)
      } else {
        response.status(404).end() 
      }
    })
    .catch(error =>next(error))
})

app.post('/api/notes', (request, response,next) => {
  const body = request.body
  if (!body.content) {
    const error = new Error(`Note validation failed : content '${body.content}' is shorter than minimum length(5)`)
    error.name = 'ValidationError' // Set the error name
    return next(error) // Pass the error to the error handler middleware
  }

  const note = new Note({
    content: body.content,
    important: body.important || false,
  })

  note.save().then(savedNote => {
    response.json(savedNote)
  })
    .catch(error => next(error))
})

app.put('/api/notes/:id', (request, response, next) => {
  const id = request.params.id
  const body = request.body

  const note = {
    content: body.content,
    important: body.important,
  }
  Note.findByIdAndUpdate(id, note, { new: true })
    .then(updatedNote => {
      response.json(updatedNote)
    })
    .catch(error => next(error))
})

app.delete('/api/notes/:id', (request, response, next) => {
  Note.findByIdAndRemove(request.params.id)
    .then(response.status(204).end())
    .catch(error => next(error))
})

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: 'Note validation failed',details:error.message })
  }

  next(error)
}


// this has to be the last loaded middleware.
app.use(errorHandler)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})