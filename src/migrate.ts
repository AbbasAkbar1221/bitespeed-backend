import pool from './database';

const createContactTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS Contact (
      id SERIAL PRIMARY KEY,
      phoneNumber VARCHAR(255),
      email VARCHAR(255),
      linkedId INTEGER REFERENCES Contact(id),
      linkPrecedence VARCHAR(20) CHECK (linkPrecedence IN ('primary', 'secondary')),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deletedAt TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_contact_email ON Contact(email);
    CREATE INDEX IF NOT EXISTS idx_contact_phone ON Contact(phoneNumber);
    CREATE INDEX IF NOT EXISTS idx_contact_linked_id ON Contact(linkedId);
  `;

  try {
    await pool.query(query);
    console.log('Contact table created successfully');
  } catch (error) {
    console.error('Error creating Contact table:', error);
  }
};

// Run migration
createContactTable().then(() => {
  process.exit(0);
});