# Serverless Survey with AWS and ClickSend

This repository contains source code required to build a simple survey system using AWS Serverless and [ClickSend](https://clicksend.com).

## System architecture

![System architecture](https://i.imgur.com/r1154Gd.png)

## Set up the system
### Prerequisites
1. AWS SAM CLI with AWS CLI profile.
2. ClickSend API Key - you can create an API key in ClickSend account under `Developers > API Credentials`.
3. [Postman](https://www.postman.com/) to test the system.

### Steps
1. Clone the Github repository.
2. Go to the `serverless-survey-aws-clicksend` directory and run `sam build` to install the required dependencies.
3. Then generate `clicksendAuthKey`, with your ClickSend username and the API key. Concat those 2 values with a `:`, and encode it with base64 to obtain `clicksendAuthKey`. For example:
```
base64_encode(username:APIkey);
```
4. You may use any free online tool available for base64 encoding.
5. Then run, `sam deploy -g` which will prompt you to provide Stack Name, AWS Region, `clicksendAuthKey` and other related values.
![SAM CLI parameters](https://i.imgur.com/H9Xsk3C.png)
6. Please note: For demo purposes, API endpoints and Lambda function URL are not protected. In a production environment, those must be defined with proper authorizations.
7. Once the stack is created, there will be 2 output values returned.
    1. ApiBaseUrl
    2. WebhookUrl
8. To set up the webhook url to receive responses from the customer, go to [https://dashboard.clicksend.com/messaging-settings/sms/inbound-sms](https://dashboard.clicksend.com/messaging-settings/sms/inbound-sms).
9. Here, add a new inbound rule with `Action` as `URL` and the URL value as the `WebhookUrl` value output in Step 7.
![Inbound SMS Rule](https://i.imgur.com/ezAASXc.png)
10. To test the system, we can use Postman.
11. In the project root directory, there is a `ServerlessSurvey.postman_collection.json` which includes the sample API endpoints.
12. Import this file into Postman.
13. Update the `API` parameter with the value of the `ApiBaseUrl` output in Step 7.

### Testing the system with Postman
1. Use the API endpoint `create customer` to create a new customer providing first name, last name and the phone number (with country code).
2. This will return customer data with an id.
3. An SMS should be received to the given phone number requesting consent. Reply with `Y` to approve.
3. Next send the `send survey` API request with the id received from the `create customer` API response.
4. This will send a survey to the given phone number. You can respond with any value 1 - 10.
5. Using `get survey results` API, you can check the status of the survey you sent to the customer.

### Delete the stack
1. Run `sam delete` to remove the stack.