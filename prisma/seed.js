const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data (optional, for clean seeding)
  await prisma.caregiverpatientlinks.deleteMany();
  await prisma.medicalrecords.deleteMany();
  await prisma.events.deleteMany();
  await prisma.alerts.deleteMany();
  await prisma.devices.deleteMany();
  await prisma.caregivers.deleteMany();
  await prisma.patients.deleteMany();
  await prisma.users.deleteMany();

  // Create users
  const user1 = await prisma.users.create({
    data: {
      email: 'user1@example.com',
      password: 'securepassword1',
      fcm_token: 'token_user1',
    },
  });

  const user2 = await prisma.users.create({
    data: {
      email: 'user2@example.com',
      password: 'securepassword2',
    },
  });

  // Create devices
  const device1 = await prisma.devices.create({
    data: {
      mac: '00:11:22:33:44:55',
      name: 'Device Alpha',
      user_id: user1.id,
    },
  });

  const device2 = await prisma.devices.create({
    data: {
      mac: '66:77:88:99:AA:BB',
      user_id: user2.id,
    },
  });

  // Create alerts
  await prisma.alerts.createMany({
    data: [
      {
        message: 'Fall detected in living room',
        lat: 40.712776,
        lng: -74.005974,
        device_id: device1.id,
        user_id: user1.id,
        handled: false,
      },
      {
        message: 'Low battery on device',
        lat: 34.052235,
        lng: -118.243683,
        device_id: device2.id,
        user_id: user2.id,
        handled: true,
      },
    ],
  });

  // Create or find caregiver
  let caregiver = await prisma.caregivers.findFirst({
    where: { user_id: user1.id },
  });

  if (!caregiver) {
    caregiver = await prisma.caregivers.create({
      data: {
        user_id: user1.id,
      },
    });
  }

  // Create or find patient
  let patient = await prisma.patients.findFirst({
    where: { user_id: user2.id },
  });

  if (!patient) {
    patient = await prisma.patients.create({
      data: {
        user_id: user2.id,
      },
    });
  }

  // Link caregiver and patient
  await prisma.caregiverpatientlinks.create({
    data: {
      caregiver_id: caregiver.id,
      patient_id: patient.id,
    },
  });

  // Create medical record
  await prisma.medicalrecords.create({
    data: {
      patient_id: patient.id,
      medical_condition: 'Diabetes',
      notes: 'Needs regular glucose monitoring.',
    },
  });

  await prisma.devices.upsert({
  where: { mac: 'B8:D6:1A:12:34:56' },
  update: {},
  create: {
    mac: 'B8:D6:1A:12:34:56',
    name: 'ESP32 Test',
    user_id: 1
  }
});


  // Create event
  await prisma.events.create({
    data: {
      user_id: user2.id,
      title: 'Follow-up Checkup',
      description: 'Visit to endocrinologist',
      start_time: new Date(),
      end_time: new Date(new Date().getTime() + 60 * 60 * 1000),
      type: 'appointment',
    },
  });

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
