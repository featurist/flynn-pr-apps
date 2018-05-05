const {spawn} = require('child_process')
const debug = require('debug')('pr-apps:shell')
const debugStdout = require('debug')('pr-apps:shell:stdout')
const debugStderr = require('debug')('pr-apps:shell:stderr')

const nullCollector = {
  write () {},
  end () {}
}

module.exports = class ShellAdapter extends Function {
  constructor ({cwd}) {
    async function shell (cmd, {logCollector = nullCollector} = {}) {
      debug('Running `%s`', cmd)
      return new Promise((resolve, reject) => {
        const sp = spawn(cmd, [], {cwd, shell: true})
        let result = ''

        sp.stdout.on('data', (data) => {
          result += data
          logCollector.write(data)
          debugStdout(data.toString())
        })
        sp.stderr.on('data', (data) => {
          result += data
          logCollector.write(data)
          debugStderr(data.toString())
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
    return shell
  }
}
