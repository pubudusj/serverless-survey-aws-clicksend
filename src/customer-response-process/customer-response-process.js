const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.DDB_TABLE;

exports.index = async (data) => {
  const event = JSON.parse(data["Records"][0].body);
  const originalMessageId = event["data"]["original_message_id"];
  const messageId = event["data"]["message_id"];
  const messageContent = event["data"]["body"];
  const customString = event["data"]["custom_string"].split(":");
  const pk = customString[0];
  const messageType = customString[1];

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

  switch (messageType) {
    case "consent":
      // Update user consent
      await updateUser(pk, messageId, messageContent);
      break;

    case "survey":
      // Update survey result
      await updateSurveyResult(pk, messageId, messageContent);
      break;

    default:
      break;
  }
};

async function updateUser(pk, clickSendMessageId, messageContent) {
  let consent = false;

  if (messageContent == "Y") {
    consent = true;
  }

  const ids = pk.split("_");

  var params = {
    TableName: tableName,
    Key: { pk: "user_" + ids[1], type: "user" },
    UpdateExpression:
      "set consent = :consent, clickSendMessageId = :clickSendMessageId",
    ExpressionAttributeValues: {
      ":consent": consent,
      ":clickSendMessageId": clickSendMessageId,
    },
  };

  await docClient.update(params).promise();
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
  };

  await docClient.update(params).promise();
}
