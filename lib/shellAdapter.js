const promisify = require('./promisify')
const exec = promisify(require('child_process').exec)
const debug = require('debug')('pr-apps:shell')
const debugStdout = require('debug')('pr-apps:shell:stdout')
const debugStderr = require('debug')('pr-apps:shell:stderr')

module.exports = class ShellAdapter extends Function {
  constructor ({cwd}) {
    async function shell (cmd) {
      debug('Running `%s`', cmd)
      const {stdout, stderr} = await exec(cmd, {cwd})
      if (stdout) {
        debugStdout(stdout)
      }
      if (stderr) {
        debugStderr(stderr)
      }
    }
    Object.setPrototypeOf(shell, ShellAdapter.prototype)
    return shell
  }
}
