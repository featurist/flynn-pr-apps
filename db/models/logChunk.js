module.exports = (sequelize, DataTypes) => {
  const LogChunk = sequelize.define('LogChunk', {
    id: {
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    DeploymentId: {
      type: DataTypes.UUID,
      references: {
        model: 'Deployments'
      }
    },
    text: DataTypes.STRING
  }, {})
  return LogChunk
}
