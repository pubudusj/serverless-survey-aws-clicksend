const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const { v4: uuidv4 } = require("uuid");

const tableName = process.env.DDB_TABLE;
const sqsQueue = process.env.SQS_QUEUE;

exports.index = async (event) => {
  if (event.httpMethod !== "POST") {
    throw new Error(
      `postMethod only accepts POST method, you tried: ${event.httpMethod} method.`
    );
  }

  const body = JSON.parse(event.body);
  const customerId = body.customerId;
  const messgeId = uuidv4();

  var params = {
    TableName: tableName,
    Key: { pk: "customer_" + customerId, type: "customer" },
  };

  const customer = await docClient.get(params).promise();
  const item = customer.Item;

  if (!item) {
    return {
      statusCode: 422,
      body: JSON.stringify({message: 'Customer not found with id ' + customerId}),
    };
  }

  if (item.consent !== true) {
    return {
      statusCode: 422,
      body: JSON.stringify({message: 'Cannot send survey. Customer is not consent to receive surveys.'}),
    };
  }

  // Create a entry for sending message
  const message = 'Thanks for using our service. Please rate our service by replying to this message with a rating 1-10. (1 is poor and 10 is the best). -XYZCo.';
  var dbData = {
    TableName: tableName,
    Item: {
      pk: "survey_" + messgeId,
      type: "survey",
      id: messgeId,
      message: message,
      customerId: item.id,
      phoneNumber: item.phoneNumber,
      status: "pending",
    },
  };

  await docClient.put(dbData).promise();

  const sqsMessage = {
    MessageBody: JSON.stringify({
      pk: "survey_" + messgeId,
      messageType: "survey",
      id: messgeId,
      phoneNumber: item.phoneNumber,
      message: message,
    }),
    QueueUrl: sqsQueue,
  };

  // Send to SQS
  await sqs.sendMessage(sqsMessage).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({message: 'Survey sent to customer.'}),
  };
};
