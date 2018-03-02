function escapeHtml (text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, t => map[t])
}

function renderDeployment (deployment) {
  return withLayout(
    {title: `${deployment.prAppName} deployment - ${deployment.id}`},
    () => `
      <div class="logChunks">
        ${
          deployment.LogChunks.map(({text}) => {
            return `<div class="logChunk">${escapeHtml(text)}</div>\n`
          })
        }
      </div>
    `
  )
}

function withLayout ({title}, renderBody) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    ${renderBody()}
  </body>
</html>
  `
}

module.exports = {
  renderDeployment
}
