module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('LogChunks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      DeploymentId: {
        type: Sequelize.UUID,
        references: {
          model: 'Deployments'
        },
        onDelete: 'cascade'
      },
      text: Sequelize.TEXT,
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
    return queryInterface.dropTable('LogChunks')
  }
}
