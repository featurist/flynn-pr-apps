module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Deployments', 'version', {
      type: Sequelize.STRING
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Deployments', 'version')
  }
}
