const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const { v4: uuidv4 } = require("uuid");

const tableName = process.env.DDB_TABLE;
const sqsQueue = process.env.SQS_QUEUE;

exports.index = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new Error(
      `Only POST method is accepted, you tried: ${event.httpMethod} method.`
    );
  }

  const body = JSON.parse(event.body);
  const id = uuidv4();
  const firstName = body.firstName;
  const lastName = body.lastName;
  const phoneNumber = body.phoneNumber;

  const userData = {
    id: id,
    firstName: firstName,
    lastName: lastName,
    phoneNumber: phoneNumber,
  };

  var params = {
    TableName: tableName,
    Item: {
      pk: "user_" + id,
      type: "user",
      id: id,
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      consent: false,
    },
  };

  await docClient.put(params).promise();

  // Create a entry for sending message
  const message =
    "Please reply this message with Y if you wish to receive surveys from XYZCo.";
  var dbData = {
    TableName: tableName,
    Item: {
      pk: "consent_" + id,
      type: "consent",
      message: message,
      userId: id,
      status: "pending",
    },
  };

  await docClient.put(dbData).promise();

  const sqsMessage = {
    MessageBody: JSON.stringify({
      pk: "consent_" + id,
      messageType: "consent",
      phoneNumber: phoneNumber,
      message: message,
    }),
    QueueUrl: sqsQueue,
  };

  // Send to SQS
  await sqs.sendMessage(sqsMessage).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(userData),
  };
};
