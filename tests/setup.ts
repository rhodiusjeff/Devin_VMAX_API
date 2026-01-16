import { sequelize } from '../src/models';

// Increase timeout for database operations
jest.setTimeout(30000);

// Setup before all tests
beforeAll(async () => {
  // Use in-memory SQLite for tests
  process.env.NODE_ENV = 'test';
});

// Cleanup after all tests
afterAll(async () => {
  await sequelize.close();
});
