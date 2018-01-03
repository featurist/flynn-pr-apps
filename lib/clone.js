module.exports = function clone (thing) {
  return JSON.parse(JSON.stringify(thing))
}
