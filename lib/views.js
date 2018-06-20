const AnsiUp = require('ansi_up').default

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

function removeAnsiEsc (text) {
  return new AnsiUp().ansi_to_text(text)
}

function renderDeployment (deployment) {
  return withLayout(
    {title: `PR #${deployment.prNumber} deployment - ${deployment.id}`},
    () => `
      <div class="deployInfo">
        <div class="status ${deployment.status}">${deployment.status}</div>
        <div>${deployment.createdAt.toUTCString()}</div>
        <div class="version" title="Deployed git sha">${deployment.version}</div>
        ${
          deployment.flynnAppUrl
            ? `<div><a class="flynnAppUrl" href="${deployment.flynnAppUrl}">flynn dashboard</a></div>`
            : ''
        }
        ${
          deployment.deployedAppUrl
            ? `<div><a class="deployedAppUrl" href="${deployment.deployedAppUrl}">deployed app</a></div>`
            : ''
        }
        ${
          deployment.prNumber && deployment.branch ? `
            <div>
              <form action="/deployments/${deployment.id}/redeploy" method="POST">
                <button class="redeploy" ${deployment.status === 'pending' ? 'disabled' : ''}>⟳ redeploy</button>
              </form>
            </div>
          ` : ''
        }
      </div>
      <h2>Deploy Log</h2>
      <div class="logChunks">
        ${
          deployment.LogChunks.map(({text}) => {
            return `<div class="logChunk"><code>${escapeHtml(removeAnsiEsc(text))}</code></div>`
          }).join('\n')
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
    <link rel="stylesheet" href="/style.css" type="text/css">
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
