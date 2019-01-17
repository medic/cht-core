poe cli
-------

### Setup
```
npm ci
cp .env.example .env
npm link
```

### Define your api key and project id
```
vi .env
```

### Upload translation file
```
poe import ./messages-en.properties
```

# Download Translation file(s)
```
poe export .
```
