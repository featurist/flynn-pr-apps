const { defineParameterType } = require('cucumber')

defineParameterType({
  name: 'actor',
  regexp: /Frank/,
  async transformer (name) {
    this.actorsByName = this.actorsByName || {}
    const actor = this.actorsByName[name] || (await createActor(this.assembly, name))
    this.actorsByName[name] = actor
    this.lastActor = actor
    return actor
  }
})

async function createActor (assembly, name) {
  const actor = assembly.createActor({ name })
  await actor.start()
  return actor
}
