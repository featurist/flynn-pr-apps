module.exports = function (fn) {
  return function () {
    return new Promise((resolve, reject) => {
      fn(...arguments, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }
}
