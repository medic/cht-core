# API v1 Draft April 2015

HTTP response bodies are all in JSON format.  

Respond with HTTP 200 status on successful requests.


# Records

## POST /api/v1/records

Create a new record based on form data.  This assumes a form definition exists on the server side matching the form code.

### Form Parameters

- `message`

  Message string in a supported format like Muvuku or Textforms.

  If missing `message` parameter then HTTP body should contain parsed form in JSON format including a `reported_date` value.
    
- `reported_date`

  Unix or Moment.js compatible timestamp string of when the message was received on the gateway.
  
  Default: now()
  
- `locale`

  locale string
  
  Default: 'en'


### Errors

If invalid JSON return error response 500.

If message parameter and JSON body are not found return 500.

`_id` or `_rev` properties will be stripped.

### Examples

Creating new record returns JSON payload.

```
POST /api/v1/records
Content-Type: application/x-www-form-urlencoded

message=1!YYYZ!foo#bar&reported_date=1352399720000
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "id": "364c796a843fbe0a73476f9153012733"
}
```

# Messages

## GET /api/v1/messages

Returns list of messages, limited to 25, oldest first based on timestamp or due date.

### Query Parameters

- `state`

  Returns only messages that match a given state value. e.g. state=pending

- `start`

  Returns list of messages, limited to 25 starting at id (uuid). 
  
  
- `descending`

  Returns latest messages first.
  
- `limit`

  Modifies number of returned messages to specified value with hard max value of 100.

### Examples

Using start parameter returns list of messages.

```
GET /api/v1/messages?start=364c796a843fbe0a73476f9153012733
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

[
  {
    "message": "dinner time",
    "to": "+5511938849332",
    "id": "364c796a843fbe0a73476f9153012733",
    "state": "sent",
    "state_details": "more info about message state"
  },
  ...
]
```

## GET /api/v1/messages/{{id}}

Returns message object matching id (uuid).

### Errors

If message is not found return 404.

### Examples

Returns message object.

```
GET /api/v1/messages/364c796a843fbe0a73476f9153012733
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

{
  "id": "364c796a843fbe0a73476f9153012733",
  "message": "dinner time",
  "to": "+5511938849332",
  "state": "sent",
  "state_details": "more info about message state"
}
```

## PUT /api/v1/messages/state/{{id}}

Allows client to update a message's state values.  So when a message is sent or
delivered, or otherwise changes state, it can be recorded.

Expects a JSON object in the body of the request with the following properties:

- `state`

  String value: 'sent', 'pending', 'failed', 'scheduled', 'cleared' or 'delivered'. 
  
- `details`

  JSON object or string with more information regarding the state change.

Both properties are saved to the parent object (task) of the message and pushed
into the state history.

### Errors

If invalid JSON return error response 500.

If message is not found return 404.


### Examples

Success response includes id property.

```
PUT /api/v1/messages/state/364c796a843fbe0a73476f9153012733
Content-Type: application/json

{
  "state": "sent",
  "details": {
    "device": "339A"
  }
}
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "id": "364c796a843fbe0a73476f9153012733"
}
```

Failure includes error.

```
PUT /api/v1/messages/state/364c796a843fbe0a73476f9153012733
Content-Type: application/json; charset=utf-8

{"foo"}
```

```
HTTP/1.1 500 
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": "input is not JSON: Expected ':' instead of '}' at line 1, column 7"
}
```

## Backwards Compatibility

This is a new API so clients can start using it at will, the old one remains available.
