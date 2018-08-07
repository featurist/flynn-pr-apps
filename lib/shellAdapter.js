const {spawn} = require('child_process')

const nullCollector = {
  write () {},
  end () {}
}

module.exports = class ShellAdapter extends Function {
  constructor ({cwd, contextDebug = require('debug')}) {
    const debug = contextDebug('pr-apps:shell')

    async function shell (cmd, {logCollector = nullCollector} = {}) {
      debug('Running `%s`', cmd)
      return new Promise((resolve, reject) => {
        const sp = spawn(cmd, [], {cwd, shell: true})
        let result = ''

        sp.stdout.on('data', (data) => {
          result += data
          logCollector.write(data)
          debug('stdout:', data.toString())
        })
        sp.stderr.on('data', (data) => {
          result += data
          logCollector.write(data)
          debug('stderr:', data.toString())
        })
        sp.on('close', (code) => {
          logCollector.end()
          if (code === 0) {
            resolve(result.replace(/\n$/, ''))
          } else {
            reject(new Error(`Non-zero exit code: ${code}`))
          }
        })
        sp.on('error', (err) => {
          logCollector.end()
          reject(err)
        })
      })
    }
    Object.setPrototypeOf(shell, ShellAdapter.prototype)
    shell.cwd = cwd
    return shell
  }
}
