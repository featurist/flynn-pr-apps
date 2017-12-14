const net = require('net')

module.exports = function () {
  return new Promise(function (resolve, reject) {
    const server = net.createServer()
      .listen(0, function () {
        const port = server.address().port
        server.close(() => resolve(port))
      })
      .on('error', reject)
  })
}
