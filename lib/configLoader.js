const yaml = require('js-yaml')
const fs = require('fs-extra')
const path = require('path')

module.exports = class ConfigLoader {
  constructor ({contextDebug = require('debug')} = {}) {
    this.debug = contextDebug('pr-apps:configLoader')
  }

  load (cwd) {
    const configPath = path.join(cwd, 'pr-app.yaml')
    if (fs.existsSync(configPath)) {
      this.debug('Loading config %s', configPath)

      const config = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'))
      this.debug('Config loaded %o', config)
      return config
    } else {
      this.debug('No config file found at %s', configPath)
    }
  }
}
