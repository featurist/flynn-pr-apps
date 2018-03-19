module.exports = (sequelize, DataTypes) => {
  const Deployment = sequelize.define('Deployment', {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    status: DataTypes.STRING,
    appName: DataTypes.STRING,
    deployedAppUrl: DataTypes.STRING,
    flynnAppUrl: DataTypes.STRING
  }, {})

  Deployment.associate = function (models) {
    Deployment.hasMany(models.LogChunk)
  }
  return Deployment
}
