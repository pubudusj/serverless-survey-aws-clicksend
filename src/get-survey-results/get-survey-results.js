const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.DDB_TABLE;

exports.index = async (event) => {
  if (event.httpMethod !== "GET") {
    throw new Error(
      `Only GET method is accepted, you tried: ${event.httpMethod} method.`
    );
  }

  var params = {
    IndexName: "gsiType",
    KeyConditionExpression: "#type = :type",
    ExpressionAttributeValues: {
      ":type": "survey",
    },
    ExpressionAttributeNames: {
      "#id": "id",
      "#type": "type",
      "#status": "status",
      "#result": "result",
    },
    ProjectionExpression:
      "pk, #id, userId, clickSendMessageId, #status, #result",
    TableName: tableName,
  };

  let data = await docClient.query(params).promise();
  let result = [];
  data.Items.forEach((element) => {
    result.push({
      id: element.id,
      userId: element.userId,
      clickSendMessageId: element.clickSendMessageId,
      status: element.status,
      result: element.result ?? null,
    });
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ data: result }),
  };
};
