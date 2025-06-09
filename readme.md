# Bitespeed Identity Reconciliation Service

A Node.js TypeScript service that provides identity reconciliation for customers across multiple purchases using different contact information.

## Features

- Links customer identities based on shared email addresses or phone numbers
- Maintains primary/secondary contact relationships
- Consolidates contact information across linked identities
- RESTful API with `/identify` endpoint

## Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd bitespeed-identity-reconciliation
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory:
```
DATABASE_URL=postgresql://username:password@localhost:5432/bitespeed_db
PORT=3000
```

4. Run database migrations
```bash
npm run migrate
```

5. Build the project
```bash
npm run build
```

6. Start the server
```bash
npm start
```

For development:
```bash
npm run dev
```

## API Documentation

### POST /identify

Identifies and consolidates customer contact information.

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": "number",
    "emails": ["string"],
    "phoneNumbers": ["string"],
    "secondaryContactIds": ["number"]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phoneNumber":"1234567890"}'
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "message": "Bitespeed Identity Reconciliation Service"
}
```

## Database Schema

```sql
CREATE TABLE Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(255),
  email VARCHAR(255),
  linkedId INTEGER REFERENCES Contact(id),
  linkPrecedence VARCHAR(20) CHECK (linkPrecedence IN ('primary', 'secondary')),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);
```

## Deployment

The service can be deployed on platforms like:
- Render.com
- Heroku
- Railway
- AWS EC2

Make sure to:
1. Set up a PostgreSQL database
2. Configure environment variables
3. Run migrations after deployment

## Testing

You can test the service using curl, Postman, or any HTTP client:

```bash
# Test with new contact
curl -X POST https://your-deployed-url.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","phoneNumber":"9876543210"}'

# Test with existing contact
curl -X POST https://your-deployed-url.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","phoneNumber":"1111111111"}'
```

## Hosted Endpoint

🚀 **Live API Endpoint:** `https://your-app-name.render.com/identify`

## License

MIT
