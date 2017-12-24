const fs = require('fs-extra')
const os = require('os')
const debug = require('debug')('pr-apps:fsAdapter')

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

module.exports = class FsAdapter {
  makeTempDir () {
    const path = `${os.tmpdir()}/${getRandomInt(1, 9999999)}`
    debug('Creating temp dir %s', path)

    fs.ensureDirSync(path)
    return path
  }

  rmRf (path) {
    debug('Removing path %s', path)
    fs.removeSync(path)
  }
}
