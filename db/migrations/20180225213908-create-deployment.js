module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Deployments', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      status: Sequelize.STRING,
      deployedAppUrl: Sequelize.STRING,
      flynnAppUrl: Sequelize.STRING,
      appName: Sequelize.STRING,
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Deployments')
  }
}
