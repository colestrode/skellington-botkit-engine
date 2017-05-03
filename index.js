const _ = require('lodash')
const Botkit = require('botkit')
const server = require('./lib/server')
const help = require('./lib/help')
const logger = require('./lib/logger')

const slackbotDefaults = {
  debug: false,
  stats_optout: true,
  logger: require('skellington-logger')('botkit')
}

class BotkitEngine {
  constructor () {
    this.type = 'botkit'
  }

  bootstrap (config) {
    this.config = _.cloneDeep(config)
    logger.setLogger(config.logger)

    this.formatConfig()

    this.controller = Botkit.slackbot(this.getSlackbotConfig())
  }

  addHelp (helpConfigs) {
    help.addHelpListeners(this.controller, helpConfigs)
  }

  addPlugins (plugins) {
    this.plugins = plugins

    this.config.scopes = _.chain(this.plugins)
      .map('scopes')
      .flatten()
      .concat(_.isArray(this.config.scopes) ? this.config.scopes : [])
      .uniq()
      .remove((val) => _.isString(val))
      .value()

    if (this.config.isSlackApp) {
      require('./lib/slack-app').start(this.controller, this.config, this.plugins)
    } else {
      require('./lib/single-team-bot').start(this.controller, this.config, this.plugins)
    }
  }

  /**
   * Formats config values so they are normalized, will exit the process with an error if required config is missing
   *
   * @param config
   */
  formatConfig () {
    _.defaults(this.config, {debug: false})

    const hasSlackAppConfigs = this.config.clientId && this.config.clientSecret && (this.config.server)

    this.config.connectedTeams = new Set()

    this.config.isSlackApp = !this.config.slackToken

    if (!this.config.slackToken && !hasSlackAppConfigs) {
      logger.error(`Missing configuration. Config must include either slackToken AND/OR clientId, clientSecret, and server`)
      process.exit(1)
    }
  }

  /**
   * Gets the config object for Botkit.slackbot
   * @param config
   */
  getSlackbotConfig () {
    return _.defaults(this.config.slackbot, {debug: !!this.config.debug}, slackbotDefaults)
  }
}

module.exports = new BotkitEngine()
