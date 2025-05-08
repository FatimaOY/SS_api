const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create users
  const user1 = await prisma.users.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      FirstName: 'John',
      LastName: 'Doe',
      email: 'john@example.com',
      password: 'hashed_password',
      role_id: 1, // Assuming Admin
    },
  });

  const user2 = await prisma.users.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      FirstName: 'Jane',
      LastName: 'Smith',
      email: 'jane@example.com',
      password: 'hashed_password',
      role_id: 2, // Assuming User
    },
  });

  // Create device
  const device1 = await prisma.devices.upsert({
    where: { device_id: 'device-001' },
    update: {},
    create: {
      device_id: 'device-001',
      user_id: user1.user_id,
      status_id: 1, // Assuming 'Active'
      last_seen: new Date(),
    },
  });

  // Create emergency alert
  await prisma.emergency_alerts.create({
    data: {
      user_id: user1.user_id,
      device_id: device1.device_id,
    },
  });

  // Create GPS location
  await prisma.gps_locations.create({
    data: {
      device_id: device1.device_id,
      latitude: 37.774929,
      longitude: -122.419416,
      accuracy: 5.5,
    },
  });

  // Create voice assistant log
  await prisma.voiceassistantlogs.create({
    data: {
      user_id: user1.user_id,
      message: 'Turn on the light',
      response: 'Light is on',
    },
  });

  // Create userlink: user1 (patient), user2 (caregiver)
  await prisma.userlinks.create({
    data: {
      patient_id: user1.user_id,
      caregiver_id: user2.user_id,
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
