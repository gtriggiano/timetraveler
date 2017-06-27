'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = socket;

var _socket = require('socket.io');

var _socket2 = _interopRequireDefault(_socket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function socket(httpServer, timetraveler) {
  const io = (0, _socket2.default)(httpServer);

  io.on('connection', socket => {
    socket.emit('state', timetraveler.state);
    socket.on('stopTraveler', () => timetraveler.stop());
    socket.on('startTraveler', () => timetraveler.start());
  });

  timetraveler.on('state', state => io.sockets.emit('state', state));
  timetraveler.on('eventProcessingError', (event, error) => {
    io.sockets.emit('eventProcessingError', {
      event,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  });
}