function cucumber_normal {
  DEBUG=${DEBUG:-pr-apps*} node_modules/.bin/cucumberjs --backtrace "$@"
}

function cucumber_debug {
  DEBUG=${DEBUG:-pr-apps*} node_modules/.bin/cucumber-electron --electron-debug "$@"
}
