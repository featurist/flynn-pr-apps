const yaml = require('js-yaml')
const fs = require('fs-extra')
const path = require('path')
const debug = require('debug')('pr-apps:configLoader')

module.exports = class ConfigLoader {
  load (cwd) {
    const configPath = path.join(cwd, 'pr-app.yaml')
    if (fs.existsSync(configPath)) {
      debug('Loading config %s', configPath)

      const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
      debug('Config loaded %o', config)
      return config
    } else {
      debug('No config file found at %s', configPath)
    }
  }
}
