# Database Setup Guide

## MongoDB Indexes

Create unique indexes on phoneNumber and googleId for data integrity. Run these commands in your MongoDB instance:

### Using MongoDB CLI:

```bash
# Connect to your database
mongo "mongodb+srv://accomadationtz_db_user:tydHNbJhsY5svzwL@cluster0.rtsxmcz.mongodb.net/Accomtz"

# Create indexes
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })

# Verify indexes were created
db.users.getIndexes()
```

### Using MongoDB Compass (GUI):

1. Connect to your MongoDB cluster
2. Navigate to the `Accomtz` database
3. Select the `users` collection
4. Go to the `Indexes` tab
5. Create new indexes:
   - **Field:** `phoneNumber`, **Unique:** Yes, **Sparse:** Yes
   - **Field:** `googleId`, **Unique:** Yes, **Sparse:** Yes
   - **Field:** `username`, **Unique:** Yes
   - **Field:** `email`, **Unique:** Yes

### Using Mongoose (In Your Application):

The User model schema already includes sparse unique constraints in field definitions. To ensure indexes are created when the app starts, add this to your `server.js`:

```javascript
import mongoose from 'mongoose';
import User from './models/User.js';

// After connecting to MongoDB
const connection = await mongoose.connect(process.env.MONGO_URL);

// Create indexes
await User.syncIndexes();
console.log('Database indexes synced');
```

---

## User Data Migration (If Needed)

If you have existing Google users without phone numbers, you need to either:

### Option 1: Set Bulk Phone Numbers via Script

```javascript
// Add temporary placeholder phones for Google users without phones
await User.updateMany(
  { 
    authProvider: 'google',
    phoneNumber: { $exists: false }
  },
  {
    $set: {
      phoneNumber: `temp_${Date.now()}_${Math.random()}`,
      onboardingComplete: false
    }
  }
);

console.log('Updated Google users without phones');
```

### Option 2: Allow NULL Phones During Transition

Modify User model temporarily to allow null phones:

```javascript
phoneNumber: {
  type: String,
  required: false,  // Allow null during transition
  unique: true,
  sparse: true,
  minlength: 8,
  maxlength: 20,
}
```

Then prompt users to add phone on next login.

### Option 3: Manual Cleanup

Export user list, identify users without phones, and contact them to update their profiles.

---

## Existing Collection Updates

If your `users` collection already exists, you may need to handle duplicate indexes:

### Remove Duplicate Indexes (if any):

```javascript
// Connect to MongoDB
use Accomtz

// Drop all existing indexes and rebuild
db.users.dropIndexes()

// Recreate only the needed indexes
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
```

---

## Schema Validation

MongoDB can enforce schema validation. Add to your collection (optional):

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "authProvider", "role", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        username: {
          bsonType: "string",
          minLength: 3,
          maxLength: 50
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        phoneNumber: {
          bsonType: "string",
          pattern: "^[0-9]{9,15}$"
        },
        password: {
          bsonType: "string"
        },
        authProvider: {
          enum: ["local", "google"]
        },
        googleId: {
          bsonType: ["string", "null"]
        },
        picture: {
          bsonType: ["string", "null"]
        },
        role: {
          enum: ["user", "agent", "admin"]
        },
        onboardingComplete: {
          bsonType: "bool"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        }
      }
    }
  }
});
```

---

## MongoDB Atlas Specific Setup

If using MongoDB Atlas (cloud):

### 1. Create Index via Web UI:

1. Go to MongoDB Atlas dashboard
2. Select your cluster
3. Go to **Browse Collections**
4. Select `Accomtz` database → `users` collection
5. Click **Indexes** tab
6. Click **Create Index**
7. Add indexes as specified above

### 2. Monitor Index Usage:

```bash
# See index performance stats
db.users.aggregate([
  { $indexStats: {} }
])
```

### 3. Check Index Size:

```bash
db.users.stats()
```

---

## Backup Before Changes

Always backup before making schema changes:

### Using MongoDB Compass:

1. Right-click collection
2. Select **Export Collection**
3. Choose format (JSON recommended)
4. Save backup file

### Using mongodump:

```bash
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/Accomtz" \
          --out ./backups/$(date +%Y%m%d_%H%M%S)
```

### Using mongo shell:

```javascript
// Back up users collection
db.users.aggregate([]).toArray().forEach(doc => print(JSON.stringify(doc)));
```

---

## Verification Queries

After setup, verify indexes with these queries:

```javascript
// View all indexes
db.users.getIndexes()

// Count total users
db.users.countDocuments()

// Check users by auth provider
db.users.countDocuments({ authProvider: "google" })
db.users.countDocuments({ authProvider: "local" })

// Check users with phone
db.users.countDocuments({ phoneNumber: { $exists: true } })

// Check onboarding completion
db.users.countDocuments({ onboardingComplete: true })
db.users.countDocuments({ onboardingComplete: false })

// Find users without phone
db.users.find({ phoneNumber: { $exists: false } }).pretty()

// Find duplicate phones (if any)
db.users.aggregate([
  { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]).pretty()
```

---

## Troubleshooting

### Error: "E11000 duplicate key error"

**Cause:** Unique index violation (duplicate email, phone, or username)

**Solution:**
```javascript
// Find duplicates
db.users.aggregate([
  { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]).pretty()

// Remove one of the duplicates manually
db.users.deleteOne({ _id: ObjectId("...") })
```

### Error: "Index build failed"

**Cause:** Existing data violates unique constraint

**Solution:**
```javascript
// Drop the problematic index
db.users.dropIndex("phoneNumber_1")

// Clean up duplicates
db.users.deleteMany({ 
  phoneNumber: { $eq: null } 
})

// Recreate index
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
```

### Index Not Being Used

**Check index usage:**
```javascript
db.users.explain("executionStats").find({ phoneNumber: "1234567890" })
```

**If index not used, rebuild:**
```javascript
db.users.dropIndex("phoneNumber_1")
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
```

---

## Performance Optimization

### Index Selection for Common Queries:

```javascript
// Fast lookup by phone
db.users.find({ phoneNumber: "1234567890" })
// Index: { phoneNumber: 1 }

// Fast lookup by googleId
db.users.find({ googleId: "105694172..." })
// Index: { googleId: 1 }

// Fast lookup by username
db.users.find({ username: "johndoe" })
// Index: { username: 1 }

// Fast lookup by email
db.users.find({ email: "john@example.com" })
// Index: { email: 1 }

// Combined lookup (email OR phone)
db.users.find({
  $or: [
    { email: "john@example.com" },
    { phoneNumber: "1234567890" }
  ]
})
// Use individual indexes
```

---

## Connection String Reference

Your MongoDB Atlas connection string:
```
mongodb+srv://accomadationtz_db_user:tydHNbJhsY5svzwL@cluster0.rtsxmcz.mongodb.net/Accomtz?retryWrites=true&w=majority&appName=Cluster0
```

### Parameters explanation:
- **User:** `accomadationtz_db_user`
- **Database:** `Accomtz`
- **Cluster:** `cluster0.rtsxmcz.mongodb.net`
- **retryWrites:** true (retry failed writes)
- **w:** majority (write to majority of replicas)
- **appName:** Cluster0

---

## Testing the Setup

After creating indexes, test with Node.js:

```javascript
import mongoose from 'mongoose';
import User from './models/User.js';

async function testSetup() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    // Create user with phone
    const user1 = await User.create({
      username: 'testuser1',
      email: 'test1@example.com',
      phoneNumber: '1234567890',
      password: 'testpass123',
      authProvider: 'local'
    });
    console.log('✓ Created user with phone');
    
    // Try to create duplicate phone (should fail)
    try {
      await User.create({
        username: 'testuser2',
        email: 'test2@example.com',
        phoneNumber: '1234567890',  // Duplicate!
        password: 'testpass123',
        authProvider: 'local'
      });
    } catch (err) {
      console.log('✓ Duplicate phone correctly rejected:', err.code);
    }
    
    // Create Google user
    const googleUser = await User.create({
      username: 'googleuser1',
      email: 'google@gmail.com',
      googleId: '105694172123456789',
      authProvider: 'google'
    });
    console.log('✓ Created Google user');
    
    console.log('\nDatabase setup verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('✗ Setup verification failed:', err);
    process.exit(1);
  }
}

testSetup();
```

---

## Cleanup & Reset

To completely reset the users collection (use with caution):

```javascript
// Drop the entire collection
db.users.drop()

// Or delete all documents
db.users.deleteMany({})

// Recreate with fresh indexes
db.users.createIndex({ phoneNumber: 1 }, { unique: true, sparse: true })
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
```

---

## Database Checklist

- [ ] MongoDB indexes created
- [ ] Unique constraints verified
- [ ] Existing duplicates handled
- [ ] `onboardingComplete` field exists
- [ ] Schema validation enabled (optional)
- [ ] Backup created before changes
- [ ] Test queries executed successfully
- [ ] Application can create users
- [ ] Phone uniqueness enforced
- [ ] Google users can be created
