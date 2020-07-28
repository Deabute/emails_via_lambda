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
  dm_step: function (data) {
    slack.send(data.emailData)
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
