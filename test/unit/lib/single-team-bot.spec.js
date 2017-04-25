'use strict'

const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const proxyquire = require('proxyquire').noCallThru()

chai.use(require('sinon-chai'))
chai.use(require('dirty-chai'))

describe('single-team-bot', function () {
  let testConfig
  let plugin
  let botMock
  let controllerMock
  let lifecycleMock
  let utilsMock
  let loggerMock
  let err
  let singleTeamBot

  beforeEach(function () {
    plugin = {
      init: sinon.stub(),
      botConnected: sinon.stub()
    }

    botMock = {
      startRTM: sinon.stub().yields(null, botMock)
    }

    controllerMock = {
      spawn: sinon.stub().returns(botMock),
      log: sinon.stub(),
      on: sinon.stub()
    }

    testConfig = {
      slackToken: 'abc123',
      plugins: [plugin]
    }

    lifecycleMock = {
      initialize: sinon.stub(),
      botConnected: sinon.stub()
    }

    utilsMock = {
      identity: sinon.stub()
    }

    loggerMock = {
      error: sinon.stub(),
      info: sinon.stub()
    }

    sinon.stub(process, 'exit')

    err = new Error('GUSFRING')

    singleTeamBot = proxyquire('../../../lib/single-team-bot', {
      './plugin-lifecycle': lifecycleMock,
      './utils': utilsMock,
      './logger': loggerMock
    })
  })

  afterEach(function () {
    process.exit.restore()
  })

  it('should spawn a bot and start rtm', function () {
    singleTeamBot.start(controllerMock, testConfig)

    expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'})
    expect(botMock.startRTM).to.have.been.called()
    expect(lifecycleMock.initialize).to.have.been.called()
    expect(lifecycleMock.botConnected).to.have.been.called()
  })

  it('should exit if starting rtm fails', function () {
    botMock.startRTM.yields(err)
    singleTeamBot.start(controllerMock, testConfig)

    expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'})
    expect(botMock.startRTM).to.have.been.called()
    expect(process.exit).to.have.been.calledWith(1)
  })

  it('should not exit if starting rtm fails and exitOnRtmFailure is false', function () {
    botMock.startRTM.yields(err)
    testConfig.exitOnRtmFailure = false
    singleTeamBot.start(controllerMock, testConfig)

    expect(controllerMock.spawn).to.have.been.calledWith({token: 'abc123'})
    expect(botMock.startRTM).to.have.been.called()
    expect(process.exit).not.to.have.been.called()
    expect(lifecycleMock.initialize).not.to.have.been.called()
    expect(lifecycleMock.botConnected).not.to.have.been.called()
  })

  describe('rtm_reconnect_failed', function () {
    let callback

    function getRTMCallback (config) {
      singleTeamBot.start(controllerMock, config)

      botMock.startRTM.reset()
      botMock.startRTM.yields(null)

      return controllerMock.on.args[0][1]
    }

    it('should exit if exitOnRtmFailure is not false', function () {
      const config = {slackToken: 'abc'}
      callback = getRTMCallback(config)
      callback(botMock, err)

      expect(process.exit).to.have.been.calledWith(1)
    })

    it('should not exit if exitOnRtmFailure is false', function () {
      const config = {slackToken: 'abc', exitOnRtmFailure: false}
      callback = getRTMCallback(config)
      callback(botMock, err)

      expect(process.exit).not.to.have.been.called()
    })
  })
})
