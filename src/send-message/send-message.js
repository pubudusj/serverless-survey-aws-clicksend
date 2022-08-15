const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();
const axios = require("axios");

const authKey = process.env.CLICKSEND_AUTHKEY;
const tableName = process.env.DDB_TABLE;

exports.index = async (event) => {
  const body = JSON.parse(event["Records"][0].body);
  const id = body.pk;
  const messageType = body.messageType;

  try {
    const result = await axios.post(
      "https://rest.clicksend.com/v3/sms/send",
      {
        messages: [
          {
            body: body.message,
            to: body.phoneNumber,
            custom_string: id + ":" + messageType,
          },
        ],
      },
      {
        headers: {
          Authorization: "Basic " + authKey,
        },
      }
    );

    const messageResponseData = result.data.data.messages[0];
    var messageStatus = messageResponseData.status;
    var clickSendMessageId = messageResponseData.message_id;
  } catch (error) {
    var messageStatus = "failed";
    var clickSendMessageId = "";
  }

  var params = {
    TableName: tableName,
    Key: { pk: id, type: messageType },
    UpdateExpression:
      "set #status = :status, clickSendMessageId = :clickSendMessageId",
    ExpressionAttributeValues: {
      ":status": messageStatus,
      ":clickSendMessageId": clickSendMessageId,
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  await docClient.update(params).promise();
};
