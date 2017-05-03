'use strict'

const logger = require('./logger')

/**
 * Starts an express server for slash commands, incoming webhooks, and OAuth flow
 *
 * @param controller
 * @param config
 */
module.exports.start = (controller, config, cb) => {
  getServer(controller, config, (err) => {
    if (err) {
      logger.error(`Error setting up server on port ${config.port}`, err)
      return cb(err)
    }

    controller.createWebhookEndpoints(controller.webserver) // synchronous method

    controller.createOauthEndpoints(controller.webserver, (err, req, res) => {
      if (err) {
        logger.error(`Error in OAuth authentication.`, err)
        if (config.errorRedirectUri) {
          res.redirect(config.errorRedirectUri)
        } else {
          res.status(500).send({message: `Error authenticating. Please try again.`})
        }
        return
      }

      if (config.successRedirectUri) {
        res.redirect(config.successRedirectUri)
      } else {
        res.status(200).send({message: `Success!`})
      }
    })

    cb(null, controller.webserver)
  })
}

function getServer(controller, config, cb) {
  if (config.server) {
    controller.webserver = config.server;
    return cb(null)
  }
  controller.setupWebserver(config.port, cb)
}
