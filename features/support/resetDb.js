const Umzug = require('umzug')

module.exports = async function ({sequelize}) {
  const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize
    },
    migrations: {
      params: [
        sequelize.getQueryInterface(), // queryInterface
        sequelize.constructor // DataTypes
      ],
      path: './db/migrations',
      pattern: /\.js$/
    }
  })
  await umzug.down({to: 0})
  await umzug.up()
}
