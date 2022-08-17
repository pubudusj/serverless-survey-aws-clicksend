const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require("uuid");
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

const tableName = process.env.DDB_TABLE;
const sqsQueue = process.env.SQS_QUEUE;

exports.index = async (data) => {
  const event = JSON.parse(data["Records"][0].body);
  const originalMessageId = event["original_message_id"].trim();
  const messageId = event["message_id"].trim();
  const messageContent = event["body"].trim();
  const pk = event["custom_string"].trim();
  const customData = pk.split("_");
  const messageType = customData[0];

  try {
    var params = {
      TableName: tableName,
      Key: { pk: pk, type: messageType },
    };

    const result = await docClient.get(params).promise();
    const message = result.Item;

    if (!message) {
      console.log("Original message not found: " + originalMessageId);
      return;
    }
  } catch (error) {
    console.log(error);
    return;
  }

  switch (messageType) {
    case "consent":
      // Update customer consent
      let customer = await updateCustomer(pk, messageId, messageContent);
      await sendConsentSuccessMessage(customer.Attributes);
      break;

    case "survey":
      // Update survey result
      let survey = await updateSurveyResult(pk, messageId, messageContent);
      await sendSurveyResponseSuccessMessage(survey.Attributes);
      break;

    default:
      break;
  }
};

async function updateCustomer(pk, clickSendMessageId, messageContent) {
  let consent = false;

  if (messageContent == "Y") {
    consent = true;
  }

  const ids = pk.split("_");

  var params = {
    TableName: tableName,
    Key: { pk: "customer_" + ids[1], type: "customer" },
    UpdateExpression:
      "set consent = :consent, clickSendMessageId = :clickSendMessageId",
    ExpressionAttributeValues: {
      ":consent": consent,
      ":clickSendMessageId": clickSendMessageId,
    },
    ReturnValues: "ALL_NEW",
  };

  return await docClient.update(params).promise();
}

async function sendConsentSuccessMessage(customer) {
  let id = uuidv4();
  let message = "Thank you! You are now subscribed to surveys from XYZCo.";
  var params = {
    TableName: tableName,
    Item: {
      pk: "consentsuccess_" + id,
      type: "consentsuccess",
      id: id,
      customerId: customer.id,
      message: message,
      status: "pending",
    },
  };

  await docClient.put(params).promise();

  const sqsMessage = {
    MessageBody: JSON.stringify({
      pk: "consentsuccess_" + id,
      messageType: "consentsuccess",
      phoneNumber: customer.phoneNumber,
      message: message,
    }),
    QueueUrl: sqsQueue,
  };

  // Send to SQS
  await sqs.sendMessage(sqsMessage).promise();
}

async function updateSurveyResult(pk, clickSendMessageId, messageContent) {
  let rating = 0;
  try {
    const messageContentInt = parseInt(messageContent);
    if (messageContentInt > 0 && messageContentInt < 11) {
      rating = messageContentInt;
    }
  } catch (error) {
    console.log(
      "Survey response - Invalid response received: " + messageContent
    );
  }

  var params = {
    TableName: tableName,
    Key: { pk: pk, type: "survey" },
    UpdateExpression:
      "set #status = :status, clickSendMessageId = :clickSendMessageId, #result = :result",
    ExpressionAttributeValues: {
      ":status": "answered",
      ":clickSendMessageId": clickSendMessageId,
      ":result": rating,
    },
    ExpressionAttributeNames: {
      "#status": "status",
      "#result": "result",
    },
    ReturnValues: "ALL_NEW",
  };

  return await docClient.update(params).promise();
}

async function sendSurveyResponseSuccessMessage(survey) {
  let message = "Thanks for rating our service. -XYZCo.";
  if (survey.result < 5) {
    message =
      "Thanks for rating our service. We will contact you soon to learn more about your experience. -XYZCo.";
  }

  var params = {
    TableName: tableName,
    Item: {
      pk: "ratingsuccess_" + survey.id,
      type: "ratingsuccess",
      id: survey.id,
      customerId: survey.customerId,
      phoneNumber: survey.phoneNumber,
      message: message,
      status: "pending",
    },
  };

  await docClient.put(params).promise();

  const sqsMessage = {
    MessageBody: JSON.stringify({
      pk: "ratingsuccess_" + survey.id,
      messageType: "ratingsuccess",
      phoneNumber: survey.phoneNumber,
      message: message,
    }),
    QueueUrl: sqsQueue,
  };

  // Send to SQS
  await sqs.sendMessage(sqsMessage).promise();
}
