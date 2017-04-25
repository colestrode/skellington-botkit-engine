'use strict'

const _ = require('lodash')

/**
 * Adds all help listeners for plugins
 *
 * @param controller
 * @param botName
 * @param plugins
 */
module.exports.addHelpListeners = (controller, helpConfigs) => {
  _.forEach(helpConfigs, (helpConfig) => {
    if (_.get(helpConfig, 'text') && _.get(helpConfig, 'keyword')) {
      registerHelpListener(controller, helpConfig)
    }
  })

  controller.hears('^help$', 'direct_mention,direct_message', (bot, message) => {
    let helpKeywords = _.chain(helpConfigs)
      .filter((helpConfig) => !!_.get(helpConfig, 'keyword'))
      .map((helpConfig) => `\`@${bot.identity.name} help ${helpConfig.keyword}\``)
      .value()
      .join('\n')

    if (!helpKeywords.length) {
      return bot.reply(message, 'I can\'t help you with anything right now. I still like you though :heart:')
    }

    return bot.reply(message, 'Here are some things I can help you with:\n' + helpKeywords)
  })
}

/**
 * Adds a single help listener for a plugin
 *
 * @param controller
 * @param helpInfo
 */
function registerHelpListener (controller, helpInfo) {
  controller.hears(`^help ${helpInfo.keyword}$`, 'direct_mention,direct_message', (bot, message) => {
    let replyText = helpInfo.text

    if (typeof helpInfo.text === 'function') {
      let helpOpts = _.merge({botName: bot.identity.name}, _.pick(message, ['team', 'channel', 'user']))

      replyText = helpInfo.text(helpOpts)
    }

    bot.reply(message, replyText)
  })
}
