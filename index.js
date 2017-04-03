const fs = require('fs');
const path = require('path');

const { spawn } = require('child_process');

const frame = spawn('fswebcam', ['-r', '1280x720', '--no-banner', path.join('/media', 'pi', '42B4-3100')])

frame.on('close', code => {
  if (code) console.error(`Exit with error code ${code}`)
  process.exit(code)
})