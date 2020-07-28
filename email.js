const LambdaForwarder = require('aws-lambda-ses-forwarder')
const { request } = require("https")
const email_config = require('./email_config.json')

const slack = {
  send: function (msg, webhook) {
    const postData = JSON.stringify({ 'text': msg })
    const options = {
      hostname: 'hooks.slack.com', port: 443, method: 'POST',
      path: webhook ? webhook : process.env.DM_WH,
      headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
    }
    const req = request(options, function (res) { }) // just do it, no need for response
    req.on('error', function (error) { console.log(error) })
    req.write(postData)
    req.end()
  },
  dm: function (event, context, callback) {
    const response = {
      statusCode: 200,
      headers: {
        'Content-type': 'application/json',
      }
    }
    try {
      event.body = JSON.parse(event.body)
    } catch (error) {
      console.log(error)
      response.statusCode = 400
    }
    if (response.statusCode === 200) {
      console.log("event text:" + event.body.text)
      slack.send(event.body.text)
    }
    callback(null, response)
  },
  dm_step: function (data) {
    slack.send("got an email")
    return Promise.resolve(data)
  }
};

exports.forward = function (event, context, callback) {
  const overrides = {
    config: email_config,
    steps: [
      LambdaForwarder.parseEvent,
      LambdaForwarder.transformRecipients,
      LambdaForwarder.fetchMessage,
      LambdaForwarder.processMessage,
      LambdaForwarder.sendMessage,
      slack.dm_step,
    ]
  }
  LambdaForwarder.handler(event, context, callback, overrides)
};
