const handler = require('../jest/mockfunction/handler.initialTags');


const enabled = 
{
    "state": "Enabled"
}

test('Print out Responses from the Lambda for Initial Tagging and Alarm Creation', () => {
    response = handler.initialTags(enabled)
});