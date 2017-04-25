'use strict'

const logger = require('./logger')
const _ = require('lodash')

/**
 * Initializes plugins, called on Skellington initialization
 *
 * @param plugins
 * @param controller
 * @param bot
 */
module.exports.initialize = (plugins, controller, bot) => {
  bot = bot || null // bot may be undefined for multi-teams
  _.forEach(plugins, (plugin) => {
    if (_.isFunction(plugin.init)) {
      try {
        const server = controller.webserver
        plugin.init({ controller, bot, server })
      } catch (err) {
        logger.error(`error calling init on plugin`, err)
      }
    }
  })
}

/**
 * Calls plugin botConnected callbacks when a bot is added
 *
 * @param plugins
 * @param controller
 * @param bot
 */
module.exports.botConnected = (plugins, controller, bot) => {
  _.forEach(plugins, (plugin) => {
    if (_.isFunction(plugin.botConnected)) {
      try {
        const server = controller.webserver
        plugin.botConnected({ controller, bot, server })
      } catch (err) {
        logger.error(`error calling botConnected on plugin`, err)
      }
    }
  })
}
