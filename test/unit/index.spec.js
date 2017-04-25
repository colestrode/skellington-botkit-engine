'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()
const _ = require('lodash')

chai.use(require('sinon-chai'))
chai.use(require('dirty-chai'))

describe.only('Skellington', function () {
  let engine
  let botkitMock
  let controllerMock
  let debugLoggerMock
  let serverMock
  let helpMock
  let singleBotMock
  let slackAppMock
  let loggerInstanceMock
  let skellingtonLoggerMock

  beforeEach(function () {
    controllerMock = {}

    botkitMock = {
      slackbot: sinon.stub().returns(controllerMock)
    }

    sinon.stub(process, 'exit')

    loggerInstanceMock = {
      setLogger: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    }
    loggerInstanceMock.setLogger.returns(loggerInstanceMock)

    skellingtonLoggerMock = sinon.stub().returnsArg(0)

    debugLoggerMock = {
      addLogger: sinon.stub()
    }

    serverMock = {
      start: sinon.stub()
    }

    helpMock = {
      addHelpListeners: sinon.stub()
    }

    singleBotMock = {
      start: sinon.stub()
    }

    slackAppMock = {
      start: sinon.stub()
    }

    engine = proxyquire('../../index', {
      'botkit': botkitMock,
      'skellington-logger': skellingtonLoggerMock,
      './lib/server': serverMock,
      './lib/help': helpMock,
      './lib/slack-app': slackAppMock,
      './lib/single-team-bot': singleBotMock
    })()
  })

  afterEach(function () {
    process.exit.restore()
  })

  describe.only('constructor', function () {
    it('should set a type', function () {
      expect(engine.type).to.equal('botkit')
    })
  })

  describe.only('bootstrap', function () {
    let testConfig

    beforeEach(function () {
      testConfig = {
        slackbot: {
          thisone: 'iscool'
        },
        clientId: 'nope',
        clientSecret: 'nope',
        plugins: ['nope'],
        port: 'nope',
        redirectUri: 'nope',
        scopes: ['nope'],
        slackToken: 'nope',
        state: 'nope',
        logger: 'logger'
      }
    })

    it('should pass botkit config to botkit with defaults', function () {
      const expectedConfg = _.clone(testConfig.slackbot)
      expectedConfg.stats_optout = true
      expectedConfg.debug = false
      expectedConfg.logger = skellingtonLoggerMock('botkit')

      engine.bootstrap(testConfig)
      expect(botkitMock.slackbot).to.have.been.calledWith(expectedConfg)
    })

    it('should pass defaults to botkit if no botkit config is passed', function () {
      const expectedConfg = {
        debug: false,
        stats_optout: true,
        logger: skellingtonLoggerMock('botkit')
      }

      delete testConfig.botkit

      engine.bootstrap(testConfig)
      expect(botkitMock.slackbot).to.have.been.calledWith(expectedConfg)
    })

    it('should set logger from config', function () {
      const newLogger = 'new'

      testConfig.logger = newLogger
      engine.bootstrap(testConfig)
      expect(loggerInstanceMock.setLogger).to.have.been.calledWith(newLogger)
    })

    it('should add a set of connectedTeams', function () {
      testConfig.debug = true
      const instance = engine.bootstrap(testConfig)

      expect(instance.__config.connectedTeams).to.be.instanceOf(Set)
    })

    it('should exit if required configs are missing', function () {
      engine.bootstrap({})
      expect(process.exit).to.have.been.calledWith(1)

      process.exit.reset()
      engine({clientId: 'close'})
      expect(process.exit).to.have.been.calledWith(1)

      process.exit.reset()
      engine({clientId: 'close', clientSecret: 'closer'})
      expect(process.exit).to.have.been.calledWith(1)
    })
  })

  describe('addPlugins', function () {
    let plugins
    let testConfig

    function noop () {}

    beforeEach(function () {
      plugins = []
      testConfig = {}
    })

    it('should take a non-array plugins and wrap it as an array', function () {
      plugins = 'plugin'
      testConfig.debug = true
      const instance = engine.addPlugins(plugins)
      expect(instance.__config.plugins).to.be.an('array')
    })

    it('should flatten scopes', function () {
      testConfig.scopes = ['a']
      testConfig.plugins = [{scopes: ['b', 'c'], init: noop}, {scopes: ['c', 'd'], init: noop}]
      testConfig.debug = true
      const instance = engine.addPlugins(plugins)

      expect(instance.__config.scopes.sort()).to.deep.equal(['a', 'b', 'c', 'd'])
    })
  })

  describe('init', function () {
    let testConfig

    beforeEach(function () {
      testConfig = {
        debug: true,
        botkit: {
          thisone: 'iscool'
        },
        plugins: ['plugin'],
        port: 'port',
        slackToken: 'token'
      }
    })

    it('should add help listeners', function () {
      engine(testConfig)
      expect(helpMock.addHelpListeners).to.have.been.calledWith(controllerMock, testConfig.plugins)
    })

    it('should set up a webserver if port is passed', function () {
      const instance = engine(testConfig)
      expect(serverMock.start).to.have.been.calledWith(controllerMock, instance.__config)
    })

    it('should not set up a webserver if port is not pased', function () {
      delete testConfig.port
      engine(testConfig)
      expect(serverMock.start).not.to.have.been.called()
    })

    it('should set up a single team bot if slack token is passed', function () {
      const instance = engine(testConfig)
      expect(singleBotMock.start).to.have.been.calledWith(controllerMock, instance.__config)
      expect(slackAppMock.start).not.to.have.been.called()
    })

    it('should set up a slack app if slackToken is missing', function () {
      testConfig.clientId = 'the one who knocks'
      testConfig.clientSecret = 'shhhh'
      delete testConfig.slackToken

      const instance = engine(testConfig)
      expect(slackAppMock.start).to.have.been.calledWith(controllerMock, instance.__config)
      expect(singleBotMock.start).not.to.have.been.called()
    })
  })

  describe('debug', function () {
    let testConfig

    beforeEach(function () {
      testConfig = {
        debug: false,
        slackToken: 'abc123'
      }
    })

    it('should not expose config if debug is false', function () {
      const instance = engine(testConfig)
      expect(instance.__config).not.to.exist()
    })

    it('should expose config if debug is true', function () {
      testConfig.debug = true
      const instance = engine(testConfig)
      expect(instance.__config).to.exist()
    })

    it('should not set up debug logger if debug is false', function () {
      engine(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).not.to.have.been.calledWith(controllerMock, {})
      expect(botkitDebug).to.be.false()
    })

    it('should pass debug options', function () {
      testConfig.debugOptions = {walter: 'white'}
      engine(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).not.to.have.been.calledWith(controllerMock, testConfig.debugOptions)
      expect(botkitDebug).to.be.false()
    })

    it('should set up debug logger and botkit logging if debug is true', function () {
      testConfig.debug = true

      engine(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).to.have.been.called()
      expect(botkitDebug).to.be.true()
    })

    it('should set up botkit debug false if botkit config.debug is false and debug is true', function () {
      testConfig.debug = true
      testConfig.botkit = {debug: false}

      engine(testConfig)
      const botkitDebug = botkitMock.slackbot.args[0][0].debug

      expect(debugLoggerMock.addLogger).to.have.been.called()
      expect(botkitDebug).to.be.false()
    })
  })
})
