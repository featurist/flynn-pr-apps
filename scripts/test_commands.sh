export DEBUG=${DEBUG:-pr-apps*}

function cucumber_normal {
  if [[ $COVERAGE ]]; then
    node_modules/.bin/istanbul cover node_modules/.bin/cucumberjs -- "$@"
  else
    node_modules/.bin/cucumberjs --backtrace -- "$@"
  fi
}

function cucumber_debug {
  node_modules/.bin/cucumber-electron --electron-debug "$@"
}
