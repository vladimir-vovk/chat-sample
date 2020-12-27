const socket = io()

function formatTimestamp(timestamp) {
  const addZeroBefore = value => `0${value}`.slice(-2)
  const d = new Date(timestamp)
  const day = addZeroBefore(d.getDate())
  const month = addZeroBefore(d.getMonth() + 1)
  const year = d.getFullYear()
  const hours = addZeroBefore(d.getHours())
  const minutes = addZeroBefore(d.getMinutes())

  return `${hours}:${minutes} ${day}.${month}.${year}`
}

function parseParams() {
  let name = ''
  let room = ''

  const params = location.search
    .slice(1)
    .split('&')
    .map(p => p.replaceAll('+', ' ').split('='))
  params.forEach(param => {
    if (param[0] === 'name') {
      name = param[1]
    } else if (param[0] === 'room') {
      room = param[1]
    }
  })

  return { name, room }
}

/* join room */
const _params = parseParams()
socket.emit('join', _params)
document.querySelector('h1').innerText = `Welcome to ${_params.room} room`

/* update users */
socket.on('users', users => {
  const container = document.getElementById('users')
  container.innerHTML = ''

  users.forEach(({ id, username }) => {
    const div = document.createElement('div')
    div.appendChild(document.createTextNode(username))
    container.appendChild(div)
  })
})

/* receive message */
socket.on('message', message => {
  console.log('message:', message)
  const isYourMessage = message.socketId === socket.id

  const messages = document.getElementById('messages')
  const container = document.createElement('div')
  container.classList.add('message')
  if (isYourMessage) {
    container.classList.add('your-message')
  }

  const user = document.createElement('div')
  user.classList.add('user')
  const name = isYourMessage ? 'You' : message.username
  user.appendChild(document.createTextNode(name))
  container.appendChild(user)

  const timestamp = document.createElement('div')
  timestamp.classList.add('timestamp')
  const ts = formatTimestamp(message.createdAt)
  timestamp.appendChild(document.createTextNode(ts))

  if (message.location) {
    const { latitude, longitude } = message.location

    const a = document.createElement('a')
    a.appendChild(document.createTextNode('location'))
    a.href = `https://google.com/maps?q=${latitude},${longitude}`
    a.target = '_blank'

    const text = isYourMessage ? 'You send a ' : `User send a `
    const body = document.createElement('div')
    body.appendChild(document.createTextNode(text))
    body.appendChild(a)
    container.appendChild(body)
  } else {
    const body = document.createElement('div')
    body.appendChild(document.createTextNode(message.text))
    container.appendChild(body)
  }

  container.appendChild(timestamp)
  messages.appendChild(container)
  container.scrollIntoView({ behavior: 'smooth' })
})

socket.on('userConnected', id => {
  console.log('user connected:', id)
})

socket.on('userDisconnected', id => {
  console.log('user disconnected:', id)
})

/* send message */
document.querySelector('form').addEventListener('submit', e => {
  e.preventDefault()

  const input = e.target.elements.message
  const text = input.value
  input.value = ''
  input.focus()

  if (!text.trim()) {
    return
  }

  socket.emit('sendMessage', text, () => {
    console.log('The message was delivered!')
  })
})

/* send location */
document.querySelector('#send-location').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Sorry, geo location is not supported by your browser.')
  }

  const sendButton = document.querySelector('#send-location')
  sendButton.setAttribute('disabled', 'disabled')

  navigator.geolocation.getCurrentPosition(position => {
    console.log('position:', position)
    const {
      coords: { latitude, longitude }
    } = position

    socket.emit('sendLocation', { latitude, longitude }, () => {
      console.log('The location was delivered!')
    })

    sendButton.removeAttribute('disabled')
  })
})
