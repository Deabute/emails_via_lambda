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
    const match = data.emailData.match(/^((?:.+\r?\n)*)(\r?\n(?:.*\s+)*)/m);
    const header = match && match[1] ? match[1] : data.emailData;
    const body = match && match[2] ? match[2] : '';
    const from = ""
    if (!/^reply-to:[\t ]?/mi.test(header)) {
      match = header.match(/^from:[\t ]?(.*(?:\r?\n\s+.*)*\r?\n)/mi);
      from = match && match[1] ? match[1] : '';
    }

    slack.send(body + "\n from " + from)
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
      slack.dm_step,
      LambdaForwarder.processMessage,
      LambdaForwarder.sendMessage,
    ]
  }
  LambdaForwarder.handler(event, context, callback, overrides)
};
