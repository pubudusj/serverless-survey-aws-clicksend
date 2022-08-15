const AWS = require("aws-sdk");
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

const sqsQueue = process.env.SQS_QUEUE;

exports.index = async (event) => {
  const sqsMessage = {
    MessageBody: event.body,
    QueueUrl: sqsQueue,
  };

  // Send to SQS
  await sqs.sendMessage(sqsMessage).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
};
