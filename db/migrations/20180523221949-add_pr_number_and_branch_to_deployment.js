module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Deployments', 'prNumber', {
      type: Sequelize.INTEGER
    })
    await queryInterface.addColumn('Deployments', 'branch', {
      type: Sequelize.STRING
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Deployments', 'prNumber')
    await queryInterface.removeColumn('Deployments', 'branch')
  }
}
