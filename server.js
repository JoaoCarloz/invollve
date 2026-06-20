const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

// Auto-deploy: copia .next e public do invollve_deploy se o build for diferente
const deployDir = '/home/invollvecom/invollve_deploy'
const appDir = '/home/invollvecom/invollve'
try {
  if (fs.existsSync(deployDir + '/.next/BUILD_ID')) {
    const newId = fs.readFileSync(deployDir + '/.next/BUILD_ID', 'utf8').trim()
    const curId = fs.existsSync(appDir + '/.next/BUILD_ID')
      ? fs.readFileSync(appDir + '/.next/BUILD_ID', 'utf8').trim()
      : ''
    if (newId !== curId) {
      console.log('Copying new build: ' + newId)
      fs.cpSync(deployDir + '/.next', appDir + '/.next', { recursive: true, force: true })
      fs.cpSync(deployDir + '/public', appDir + '/public', { recursive: true, force: true })
      console.log('Copy done.')
    }
  }
} catch (e) { console.error('Copy error:', e.message) }

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, () => {
    console.log(`> Ready on port ${port}`)
  })
})
