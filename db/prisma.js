// Import the PrismaClient class from the @prisma/client package.
const { PrismaClient } = require('@prisma/client');

// Declare a variable to hold our Prisma client instance.
let prisma;

// Check if the application is running in a production environment.
if (process.env.NODE_ENV === 'production') {
  // In production, always create a new instance of PrismaClient with the timeout configuration.
  prisma = new PrismaClient({
    queryTimeoutInMs: 30000, // Set the timeout to 30 seconds (30000 milliseconds)
  });
} else {
  // In development or other non-production environments...
  // Check if there is already an instance of PrismaClient attached to the global object.
  if (!global.prisma) {
    // If not, create a new instance of PrismaClient with the timeout configuration...
    global.prisma = new PrismaClient({
      queryTimeoutInMs: 30000, // Set the timeout to 30 seconds (30000 milliseconds)
    });
  }
  // ...and assign it to the prisma variable. This ensures that in development,
  // the same instance of PrismaClient is reused across hot reloads and server restarts.
  prisma = global.prisma;
}

// Export the prisma client instance, making it available for import in other parts of the application.
module.exports = prisma;