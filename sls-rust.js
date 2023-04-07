'use strict'

const { spawn } = require('node:child_process')
const { join } = require('node:path')

class SlsRust {
  constructor (serverless, options) {
    this.serverless = serverless
    this.log = serverless.cli.log
    this.options = options
    this.targetRuntime = 'x86_64-unknown-linux-musl'
    this.hooks = {
      'before:package:createDeploymentArtifacts': this.buildPrepare.bind(this),
      'before:deploy:function:packageFunction': this.buildPrepare.bind(this),
      'before:offline:start': this.buildPrepare.bind(this),
      'before:offline:start:init': this.buildPrepare.bind(this),
    }


    this.serverless.service.package.excludeDevDependencies = false
  }

  async buildPrepare () {
    const service = this.serverless.service
    if (service.provider.name !== 'aws') return
    const rustFns = this.serverless.service.getAllFunctions().filter(fnName => {
      const fn = service.getFunction(fnName)
      return fn.tags?.rust === 'true'
    })

    if (rustFns.length === 0) {
      throw new SlsRustPluginNoRustFnsError()
    }

    const buildPromises = rustFns.map(fnName => {
      const fn = this.serverless.service.getFunction(fnName)
      return this.build(fn)
    })

    await Promise.all(buildPromises)
    this.log('finished building all rust functions!')
  }

  runCommand ({ command, cwd }) {
    const [mainCommand, ...args] = command.split(' ')
    return new Promise((resolve, reject) => {
      const build = spawn(mainCommand, args, { inherit: 'stdio', cwd })
      build.on('error', (error) => {
        reject(error.toString())
      })
      build.on('close', (code) => {
        resolve(code)
      })
    })

  }

  async runBuildCommand ({ path, projectName }) {
    try {
      await this.runCommand({ 
        command: `cargo build --release --target ${this.targetRuntime}`, 
        cwd: path,
      })
    } catch (error) {
      throw new Error(`Error building project ${projectName}: ${error}`)
    }
  }

  async runZipArtifact ({ path, projectName }) {
    const projectDir = `${projectName}-dir`
    const projectFullPath = join(projectDir, projectName)
    const bootstrapFullPath = join(projectDir, 'bootstrap')

    try {
      await this.runCommand({ command: `rm ${projectName}.zip`, cwd: path })
      await this.runCommand({ command: `rm bootstrap`, cwd: path })
      await this.runCommand({ command: `rm -rf ${projectDir}`, cwd: path })
      await this.runCommand({ command: `mkdir ${projectDir}`, cwd: path })
      await this.runCommand({ command: `mv ${projectName} ${projectDir}/`, cwd: path })
      await this.runCommand({ command: `mv ${projectFullPath} ${bootstrapFullPath}`, cwd: path })
      await this.runCommand({ command: `zip -j ${projectFullPath}.zip ${bootstrapFullPath}`, cwd: path })
      await this.runCommand({ command: `mv ${projectFullPath}.zip .`, cwd: path })
    } catch (error) {
      throw new Error(`Error trying to zip artefact in ${projectName}: ${error}`)
    }
  }

  async build (fn) {
    const { projectPath, projectName } = this.getProjectPathAndName(fn)
    this.log(`Building Rust ${fn.handler} func...`)
    const path = join('.', projectPath)
    const targetPath = join(path, 'target', this.targetRuntime, 'release')
    await this.runBuildCommand({ path, projectName })
    await this.runZipArtifact({ path: targetPath, projectName })

    const artifactPath = join(targetPath, `${projectName}.zip`)
    fn.package = fn.package || {}
    fn.package.artifact = artifactPath
    fn.handler = 'bootstrap'
    fn.runtime = 'provided.al2'
    this.log(`Finished building ${projectName}!`)
  }

  getProjectPathAndName (fn) {
    const [projectPath, projectName] = fn.handler.split('.')
    if (!projectPath || !projectName) {
      throw new SlsRustPluginWrongHandlerError()
    }

    return { projectPath, projectName }
  }
}

class SlsRustPluginMainError extends Error {
  constructor ({ name, message }) {
    super()
    this.name = `SlsRustPlugin${name}Error`
    this.message = `[sls-rust plugin] ${message}`
  }
}

class SlsRustPluginNoRustFnsError extends SlsRustPluginMainError {
  constructor () {
    super({
      name: 'NoRustFns',
      message: [
        'no Rust functions found. In order to use this plugin, you must put ',
        '`tags.rust: true` in your function configuration, like this:',
        `

# serverless.yml
functions:
  rust:
    handler: your_rust_project_name
    runtime: provided.al2
    tags:
      rust: true
      `
      ].join('')
    })
  }
}

class SlsRustPluginWrongHandlerError extends SlsRustPluginMainError {
  constructor () {
    super({
      name: 'WrongHandler',
      message: [
        'the handler of your function must follow the pattern: ',
        'project_path.project_name, when `project_path` is the path of your ',
        'project, and `project_name` is the name of your project in Cargo.toml.\n'
      ].join('')
    })
  }
}


module.exports = SlsRust
