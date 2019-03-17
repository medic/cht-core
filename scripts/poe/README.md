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
// Uploads translation with tag provided in ../../package.json
poe import ./messages-en.properties

// Uploads translation with specific tag
poe import ./messages-en.properties 3.5.0
```

# Download Translation file(s)
```
// Downloads latest translations (no tag)
poe export .

// Downloads latest translations for given tag
poe export . 3.5.0
```
