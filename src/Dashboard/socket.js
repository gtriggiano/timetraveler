import SocketIO from 'socket.io'

export default function socket (httpServer, timetraveler) {
  const io = SocketIO(httpServer)

  io.on('connection', socket => {
    socket.emit('state', timetraveler.state)
    socket.on('stopTraveler', () => timetraveler.stop())
    socket.on('startTraveler', () => timetraveler.start())
  })

  timetraveler.on('state', state => io.sockets.emit('state', state))
  timetraveler.on('eventProcessingError', (event, error) => {
    io.sockets.emit('eventProcessingError', {
      event,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    })
  })
}
