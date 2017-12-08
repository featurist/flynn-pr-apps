(async function () {
  try {
    const { Before, After, defineSupportCode } = require('cucumber')

    const assemblyName = process.env.CUCUMBER_ASSEMBLY || 'memory'
    console.log(`\n🥒 ${assemblyName}\n`)
    const AssemblyModule = require(`./assemblies/${assemblyName}`)
    const assembly = new AssemblyModule()

    defineSupportCode(function ({setDefaultTimeout}) {
      setDefaultTimeout(60 * 1000)
    })

    Before(async function () {
      process.env.NODE_ENV = 'test'
      this.assembly = assembly
      await this.assembly.start()
      this.actorsByName = {}
    })

    After(async function () {
      await Promise.all(Object.values(this.actorsByName).map(actor => actor.stop()))
      await this.assembly.stop()
    })

    await assembly.setup()
  } catch (e) {
    throw e
  }
})()
