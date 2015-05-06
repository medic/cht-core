# API v1 Draft

HTTP response bodies are all in JSON format.  

Respond with HTTP 200 status on successful requests.


# Records

## POST /api/v1/records

Create a new record based on a form.  This requires a form definition exists on the server side matching the form code.

Records can be created one of two ways, parsing the form data yourself and submitting a JSON object or by submitting the raw message string.

### Content-Type: application/x-www-form-urlencoded


#### Required Fields

- `message`

  Message string in a supported format like Muvuku or Textforms.  Depending if your Medic Mobile instance is configured in forms-only mode or not you might recieve an error if the form is not found.
  
- `from`

  Reporting phone number.
    
#### Optional Fields

- `reported_date`

  Unix or Moment.js compatible timestamp of when the message was received on the gateway.
  
  Default: now()
  
- `locale`

  locale string
  

### Content-Type: application/json

Encode form data prior to submission as a JSON object.  Special values reside in the property `_meta`, so you can't have a form field named `_meta`.  Only strings and numbers are currently support in field values.

All property names will be lowercased and any properties beginning with `_` (underscore) will be ignored.

#### Required Fields

- `_meta.form`
  
  The form code.
  
- `_meta.from`

  Reporting phone number.

#### Optional Fields

- `_meta.reported_date`

  Unix or Moment.js compatible timestamp of when the message was received on the gateway.
  
  Default: now()
  
  Example: 
  
- `_meta.locale`

  Optional locale string. 
  
  Example: 'fr'
    
### Errors

If required fields are not found return 500.

If invalid JSON return error response 500.

If submitting JSON and correspending form is not found on the server you will receive an error.

### Examples

Creating new record using message field.

```
POST /api/v1/records
Content-Type: application/x-www-form-urlencoded

message=1!YYYZ!Sam#23#2015#ANC&from=+5511943348031&reported_date=1352399720000
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "id": "364c796a843fbe0a73476f9153012733"
}
```
Creating new record with JSON.

```
POST /api/v1/records
Content-Type: application/json

{
  "nurse": "Sam",
  "week": 23,
  "year": 2015,
  "visit": "ANC",
  "_meta": {
    "form": "YYYZ",
    "reported_date": 1352399720000
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

# Messages

## GET /api/v1/messages

Returns list of messages, oldest first based on timestamp or due date.

### Query Parameters

- `state`

  Returns only messages that match a given state value. e.g. state=pending

- `start` (todo)

  Returns list of messages, limited to 25 starting at id (uuid). 
  
- `descending`

  Returns latest messages first.
  
- `limit`

  Modifies number of returned messages to specified value with hard max value of 1000.

### Examples

Get oldest pending messages.

```
GET /api/v1/messages?state=pending
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

[
  {
    "message": "Thank you for registering Prudence. Their pregnancy ID is 88500, and EDD is Sun, Nov 8th, 2015",
    "to": "+2840915732",
    "id": "4fbc1cb6-1408-4954-b08b-2da33630ae5c",
    "state": "pending",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-04-23T02:24:57.207Z"
      }
    ]
  },
  {
    "message": "Thank you Janet, visit for Prudence (88500) has been recorded.",
    "to": "+2840915732",
    "id": "ef8dbed5-335e-4cdd-bdbe-885a4fd93d11",
    "state": "pending",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-04-23T02:25:04.205Z"
      }
    ]
  }
]
```

Get latest sent messages.

```
GET /api/v1/messages?state=sent&descending
```

```
HTTP/1.1 200 
Content-Type: application/json; charset=utf-8

[
  {
    "message": "[Sample message] Yep, we're all set for Monday afternoon.",
    "to": "+2840915732",
    "id": "c8ca60c6c19d4e253f5d107ac800bdd4",
    "state": "sent",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-04-08T20:09:00.000Z"
      },
      {
        "state": "sent",
        "timestamp": "2015-04-08T20:10:00.000Z"
      }
    ]
  },
  {
    "message": "[Sample message] Of course, I will send some with Charles tomorrow. Let me know when you get it.",
    "to": "+2896503099",
    "id": "c8ca60c6c19d4e253f5d107ac801594e",
    "state": "sent",
    "state_history": [
      {
        "state": "pending",
        "timestamp": "2015-03-08T13:09:00.000Z"
      },
      {
        "state": "sent",
        "timestamp": "2015-03-08T13:10:00.000Z"
      }
    ]
  }
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
