module.exports = {
  default: `--format node_modules/cucumber-pretty ${process.env.FAIL_FAST ? '--fail-fast' : ''} --format-options '{"snippetInterface": "promise"}'`
}
