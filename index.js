const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const io = require('socket.io-client');
const request = require('axios')

const serial = function() {
  const data = fs.readFileSync('/proc/cpuinfo', 'utf8')
  const arr = data.split('\n')
  const serialLine = arr[arr.length - 2]
  const serial = serialLine.split(':')
  return serial[1].slice(1)
}

const socket = io.connect('http://192.168.0.100:3000')

socket.on('connect', () => {
  const id = serial()
  console.log(id)
  socket.emit('initialize-device-user', ['pi', id, null])
})

const filename = function(hash, num) {
  const index = `000${num}`.slice(-3)
  return `${hash}-${index}.jpg`
}

const filepath = function(hash, num) {
  return path.join('/media', 'pi', '42B4-3100', filename(hash, num))
}

const img = function(hash, num) {
  return spawn('fswebcam', ['-r', '1280x720', '--no-banner', filepath(hash, num)])
}

socket.on('device-record', ([interval, iteration, hash]) => {
  let tick = 0;

  let period = setInterval(() => {
    const num = tick
    if (num >= iteration) {
      socket.emit('device-upload-complete', [socket.id, hash])
      return clearInterval(period)
    }
    
    img(hash, num).on('close', code => {
      fs.readFile(filepath(hash, num), (err, data) => {
        console.log(num, tick)
        console.log(data.length)
        request({
          url: `http://192.168.0.100:3000/device-api/post-image/${hash}/${num}`,
          method: 'POST',
          data,
          header: {
            'Content-Type': 'image/jpeg',
            'Content-Encoding': 'base64',
            'Connection': 'Keep-Alive'
          }
        })
      })
    })

    tick++

  }, interval)
})