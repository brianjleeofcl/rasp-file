const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const io = require('socket.io-client');
const request = require('axios')

const getSerial = function() {
  const data = fs.readFileSync('/proc/cpuinfo', 'utf8')
  const arr = data.split('\n')
  const serialLine = arr[arr.length - 2]
  const serial = serialLine.split(':')
  return serial[1].slice(1)
}
const serial = getSerial()
console.log(`ezfwd-pi| serial: ${serial}`)

const getIp = function() {
  return spawnSync('hostname', ['-I']).stdout
}
const ip = getIp()
console.log(`ezfwd-pi| ip: ${ip}`)

const socket = io.connect('http://brianjleeofcl-capstone.herokuapp.com')
socket.on('connect', () => {
  console.log(`connected to socket ${socket.id}`)
  socket.emit('initialize-device-user', ['pi', serial, null])
})

const filename = function(hash, num) {
  const index = `000${num}`.slice(-3)
  return `${hash}-${index}.jpg`
}

const filepath = function(hash, num) {
  return path.join('/media', 'pi', '42B4-3100', filename(hash, num))
}

const img = function(hash, num) {
  return spawn('raspistill', ['-w', '848', '-h', '480', '-vf', '-hf', '-o', filepath(hash, num)])
}

socket.on('device-record', ([interval, iteration, hash]) => {
  let tick = 0;

  let period = setInterval(() => {
    const num = tick
    if (num > iteration) {
      socket.emit('device-upload-complete', [socket.id, hash])
      return clearInterval(period)
    }
    console.log('52'+num)
    img(hash, num).on('close', code => {
      // if (code > 0) console.error(`error code ${code}`)
      console.log('55'+num)
      fs.readFile(filepath(hash, num), (err, data) => {
        console.log('57'+num)
        if (err) console.error(err)
        console.log('59'+num)
        console.log(data.length)
        request({
          url: `http://brianjleeofcl-capstone.herokuapp.com/device-api/post-image/${hash}/${num}`,
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