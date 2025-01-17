// email.js Copyright 2020 Paul Beaudet ~ MIT License

const LambdaForwarder = require('aws-lambda-ses-forwarder')
const { request } = require("https")
const email_config = require('./email_config.json')
const twilio_client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)

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
    let match = data.emailData.match(/^((?:.+\r?\n)*)(\r?\n(?:.*\s+)*)/m);
    let header = match && match[1] ? match[1] : data.emailData;
    let body = match && match[2] ? match[2] : '';
    let from = ""
    if (!/^reply-to:[\t ]?/mi.test(header)) {
      match = header.match(/^from:[\t ]?(.*(?:\r?\n\s+.*)*\r?\n)/mi);
      from = match && match[1] ? match[1] : '';
    }
    const messageToSend = `Received a new email from ${from}`
    // slack.send(messageToSend)
    twilio_client.messages
      .create({
        body: messageToSend,
        from: process.env.TWILIO_NUMBER,
        to: process.env.RECIPIENT_NUMBER
      })
      .then(message => {
        data.log({
          level: "info",
          message: `successfully sent message ${message.sid}`
        })
      })
    data.log({
      level: "info",
      message: "Got message from " + from,
    })
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
