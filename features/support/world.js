const { Before, After } = require('cucumber')

const assemblyName = process.env.CUCUMBER_ASSEMBLY || 'memory'
console.log(`\n🥒 ${assemblyName}\n`)
const AssemblyModule = require(`./assemblies/${assemblyName}`)
const assembly = new AssemblyModule()

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
