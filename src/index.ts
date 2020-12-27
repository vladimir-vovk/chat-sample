import path from 'path'
import http from 'http'
import express from 'express'
import { Socket } from 'socket.io'

const app = express()
const server = http.createServer(app)
const io = require('socket.io')(server)

const port = process.env.PORT || 3000
const publicDir = path.join(__dirname, '../public')

app.use(express.static(publicDir))

type Location = {
  latitude: number
  longitude: number
}

type Message = {
  socketId: string
  username: string
  createdAt: number
  text: string
  location?: Location
}

type CreateMessageArgs = {
  socketId?: string
  username?: string
  text: string
  location?: Location
}

type User = {
  id: string
  username: string
}
type Users = {
  [key: string]: User[]
}

let _users: Users = {}

io.on('connection', (socket: Socket) => {
  console.log('user connected:', socket.id)

  let _room = 'general'
  let _username = `${socket.id}`

  function createMessage({
    socketId,
    username,
    text,
    location
  }: CreateMessageArgs): Message {
    return {
      socketId: socketId || socket.id,
      username: username || _username,
      createdAt: new Date().getTime(),
      text,
      location
    }
  }

  function addUser() {
    const roomUsers = _users[_room]
    if (roomUsers) {
      const user = roomUsers.find(({ id }: { id: string }) => id === socket.id)
      if (!user) {
        roomUsers.push({ id: socket.id, username: _username })
      }
    } else {
      _users[_room] = []
      _users[_room].push({ id: socket.id, username: _username })
    }
  }

  function removeUser() {
    const roomUsers = _users[_room]
    if (roomUsers) {
      const i = roomUsers.findIndex(
        ({ id }: { id: string }) => id === socket.id
      )
      if (i > -1) {
        roomUsers.splice(i, 1)
      }
    }
  }

  /* join room */
  socket.on('join', ({ name, room }) => {
    if (name) {
      _username = name
    }

    if (room) {
      _room = room
    }

    socket.join(_room)
    addUser()
    io.to(_room).emit('users', _users[_room])

    /* welcome message */
    const welcomeMessage = createMessage({
      socketId: 'system',
      username: 'system',
      text: 'Welcome to the chat!'
    })
    socket.emit('message', welcomeMessage)

    const joinMessage = createMessage({
      username: 'system',
      text: `${_username} has joined!`
    })
    socket.broadcast.to(_room).emit('message', joinMessage)
    socket.broadcast.to(_room).emit('userConnected', _username)
  })

  /* send message */
  socket.on('sendMessage', (text: string, acknowledge: () => void) => {
    const message = createMessage({ text })
    io.to(_room).emit('message', message)

    acknowledge()
  })

  /* send location */
  socket.on('sendLocation', (location, acknowledge: () => void) => {
    const { latitude, longitude } = location
    const text = `User ${socket.id} sent a location: https://google.com/maps?q=${latitude},${longitude}`
    const message = createMessage({ text, location })
    io.to(_room).emit('message', message)

    acknowledge()
  })

  /* disconnect user */
  socket.on('disconnect', () => {
    socket.broadcast.to(_room).emit('userDisconnected', _username)
    const leftMessage = createMessage({
      username: 'system',
      text: `${_username} has left!`
    })
    socket.broadcast.to(_room).emit('message', leftMessage)

    removeUser()
    io.to(_room).emit('users', _users[_room])
  })
})

server.listen(port, () => {
  console.log(`Running on port ${port}...`)
})
