const fs = require('fs-extra')
const os = require('os')

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

module.exports = class FsAdapter {
  constructor ({contextDebug = require('debug')} = {}) {
    this.debug = contextDebug('pr-apps:fsAdapter')
  }

  makeTempDir () {
    const path = `${os.tmpdir()}/${getRandomInt(1, 9999999)}`
    this.debug('Creating temp dir %s', path)

    fs.ensureDirSync(path)
    return path
  }

  rmRf (path) {
    this.debug('Removing path %s', path)
    fs.removeSync(path)
  }
}
