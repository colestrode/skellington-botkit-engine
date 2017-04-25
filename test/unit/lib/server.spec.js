'use strict'

var chai = require('chai')
var expect = chai.expect
var sinon = require('sinon')
var proxyquire = require('proxyquire').noCallThru()

chai.use(require('sinon-chai'))
chai.use(require('dirty-chai'))

describe('server', function () {
  let testConfig
  let loggerMock
  let controllerMock
  let err
  let server

  beforeEach(function () {
    testConfig = {port: 1234}

    loggerMock = {
      info: sinon.stub(),
      error: sinon.stub()
    }

    controllerMock = {
      webserver: 'webserver',
      setupWebserver: sinon.stub().yields(),
      createWebhookEndpoints: sinon.stub(),
      createOauthEndpoints: sinon.stub()
    }

    err = new Error('GUSFRING')

    server = proxyquire('../../../lib/server', {
      './logger': loggerMock
    })
  })

  it('should set up a server if port is passed', function () {
    server.start(controllerMock, testConfig)
    expect(controllerMock.setupWebserver).to.have.been.calledWith(1234)
    expect(controllerMock.createWebhookEndpoints).to.have.been.calledWith(controllerMock.webserver)
    expect(controllerMock.createOauthEndpoints).to.have.been.calledWith(controllerMock.webserver)
  })

  it('should not create endpoints if server is not created', function () {
    controllerMock.setupWebserver.yields(err)
    server.start(controllerMock, testConfig)
    expect(controllerMock.setupWebserver).to.have.been.called()
    expect(controllerMock.createWebhookEndpoints).not.to.have.been.called()
    expect(controllerMock.createOauthEndpoints).not.to.have.been.called()
  })

  describe('Oauth callback', function () {
    let oauthCallback
    let reqMock
    let resMock

    beforeEach(function () {
      server.start(controllerMock, testConfig)
      oauthCallback = controllerMock.createOauthEndpoints.args[0][1]

      reqMock = {}
      resMock = {
        status: sinon.stub(),
        send: sinon.stub(),
        redirect: sinon.stub()
      }

      resMock.status.returns(resMock)
    })

    it('should respond with 200 and success', function () {
      oauthCallback(null, reqMock, resMock)
      expect(resMock.status).to.have.been.calledWith(200)
      expect(resMock.send).to.have.been.called()
    })

    it('should redirect to successRedirect on success', function () {
      testConfig.successRedirectUri = 'https://dont.evenworryabout.it'
      oauthCallback(null, reqMock, resMock)
      expect(resMock.redirect).to.have.been.calledWith(testConfig.successRedirectUri)
    })

    it('should respond with a 500 and error if oauth fails', function () {
      oauthCallback(err, reqMock, resMock)
      expect(resMock.status).to.have.been.calledWith(500)
      expect(resMock.send).to.have.been.called()
    })

    it('should redirect to errorRedirect on error', function () {
      testConfig.errorRedirectUri = 'https://iwill.evenworryabout.it'
      oauthCallback(err, reqMock, resMock)
      expect(resMock.redirect).to.have.been.calledWith(testConfig.errorRedirectUri)
    })
  })
})
