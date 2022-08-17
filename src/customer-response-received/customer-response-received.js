const AWS = require("aws-sdk");
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const { Buffer } = require("buffer");
const sqsQueue = process.env.SQS_QUEUE;

exports.index = async (event) => {
  var buf = Buffer.from(event.body, "base64");
  var queryString = decodeURIComponent(buf.toString("utf8"));
  let queryStringParams = queryString.split("&");
  let messageBody = {};

  for (val of queryStringParams) {
    let entry = val.split("=");
    messageBody[entry[0]] = entry[1];
  }

  const sqsMessage = {
    MessageBody: JSON.stringify(messageBody),
    QueueUrl: sqsQueue,
  };

  // Send to SQS
  await sqs.sendMessage(sqsMessage).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
};
