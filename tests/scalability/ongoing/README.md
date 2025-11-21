# Real-world Data Scalability testing suite

## Test phases

1. **Initial Sync (Two-Phase)**: Users download initial data in batches
2. **Workflow Upload**: All users upload generated data simultaneously  
3. **Workflow Download**: All users download shared data simultaneously

## Requirements

- **Java 8+** (for JMeter)
- **Node.js 16+** 
- **CHT instance** (local Docker or remote)

## Configuration

Edit `config.js` to adjust scale:

```javascript
module.exports = {
  contactsNbr: {
    health_center: 19,    // 19 CHWs + 1 supervisor = 20 total users
    clinic: 1,            // 1 clinic per health center
    person: 3,            // 3 persons per clinic (initial data)
    chw: 1,               // 1 CHW per health center
    supervisor: 1,        // 1 supervisor per district hospital
  },
  workflowContactsNbr: {
    person: 5,            // 5 persons per user per iteration
    iterations: 3,        // 3 sync cycles
  },
};
```

## Usage

### Local Testing

1. **Setup environment:**
   ```bash
   cd tests/scalability/ongoing
   npm ci
   ```

2. **Configure CHT instance:**
   ```bash
   export BASE_URL="https://your-cht-instance.com"
   export ADMIN_USER="medic"
   export ADMIN_PASSWORD="password"
   ```

3. **Run test:**
   ```bash
   ./run.sh local
   ```

4. **View results:**
   - JMeter HTML report: `report/index.html`
   - Individual user logs: `report/workflow-*-stdout*`

