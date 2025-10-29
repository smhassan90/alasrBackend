'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create UUIDs for users
    const adminUserId = uuidv4();
    const imamUserId = uuidv4();
    const user1Id = uuidv4();
    const user2Id = uuidv4();

    // Hash passwords
    const hashedPassword = await bcrypt.hash('Password123', 10);

    // Insert users
    await queryInterface.bulkInsert('users', [
      {
        id: adminUserId,
        name: 'Admin Ahmed',
        email: 'admin@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: imamUserId,
        name: 'Imam Muhammad',
        email: 'imam@example.com',
        password: hashedPassword,
        phone: '+1234567891',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: user1Id,
        name: 'User Ali',
        email: 'ali@example.com',
        password: hashedPassword,
        phone: '+1234567892',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: user2Id,
        name: 'User Fatima',
        email: 'fatima@example.com',
        password: hashedPassword,
        phone: '+1234567893',
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Create UUIDs for masajids
    const masjid1Id = uuidv4();
    const masjid2Id = uuidv4();

    // Insert masajids
    await queryInterface.bulkInsert('masajids', [
      {
        id: masjid1Id,
        name: 'Masjid Al-Noor',
        location: 'Downtown Area',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postal_code: '10001',
        contact_email: 'contact@alnoor.com',
        contact_phone: '+1234567890',
        is_active: true,
        created_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: masjid2Id,
        name: 'Masjid Al-Rahma',
        location: 'Uptown District',
        address: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postal_code: '90001',
        contact_email: 'contact@alrahma.com',
        contact_phone: '+1234567891',
        is_active: true,
        created_by: user1Id,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Insert user-masjid associations
    await queryInterface.bulkInsert('user_masajids', [
      {
        id: uuidv4(),
        user_id: adminUserId,
        masjid_id: masjid1Id,
        role: 'admin',
        is_default: true,
        assigned_by: adminUserId,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: imamUserId,
        masjid_id: masjid1Id,
        role: 'imam',
        is_default: true,
        assigned_by: adminUserId,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: user1Id,
        masjid_id: masjid2Id,
        role: 'admin',
        is_default: true,
        assigned_by: user1Id,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: user2Id,
        masjid_id: masjid1Id,
        role: 'admin',
        is_default: false,
        assigned_by: adminUserId,
        assigned_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Insert prayer times for Masjid Al-Noor
    const today = new Date().toISOString().split('T')[0];
    await queryInterface.bulkInsert('prayer_times', [
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        prayer_name: 'Fajr',
        prayer_time: '05:30:00',
        effective_date: today,
        updated_by: imamUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        prayer_name: 'Dhuhr',
        prayer_time: '12:30:00',
        effective_date: today,
        updated_by: imamUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        prayer_name: 'Asr',
        prayer_time: '15:45:00',
        effective_date: today,
        updated_by: imamUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        prayer_name: 'Maghrib',
        prayer_time: '18:15:00',
        effective_date: today,
        updated_by: imamUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        prayer_name: 'Isha',
        prayer_time: '19:30:00',
        effective_date: today,
        updated_by: imamUserId,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Insert sample questions
    await queryInterface.bulkInsert('questions', [
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        user_name: 'Abdullah',
        user_email: 'abdullah@example.com',
        title: 'Question about Friday Prayer',
        question: 'What time does Jummah prayer start on Fridays?',
        status: 'new',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        user_name: 'Aisha',
        user_email: 'aisha@example.com',
        title: 'Question about Women Prayer Area',
        question: 'Is there a separate prayer area for women?',
        status: 'replied',
        reply: 'Yes, we have a dedicated prayer area for sisters on the second floor.',
        replied_by: imamUserId,
        replied_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Insert sample notifications
    await queryInterface.bulkInsert('notifications', [
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        title: 'Ramadan Prayer Times Updated',
        description: 'Prayer times have been updated for the month of Ramadan. Please check the new timings.',
        category: 'Prayer Times',
        created_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        title: 'Community Iftar Event',
        description: 'Join us for a community iftar this weekend. All are welcome!',
        category: 'Events',
        created_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Insert sample events
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await queryInterface.bulkInsert('events', [
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        name: 'Islamic Study Circle',
        description: 'Weekly study circle on Tafsir and Hadith. All ages welcome.',
        event_date: tomorrow.toISOString().split('T')[0],
        event_time: '19:00:00',
        location: 'Main Prayer Hall',
        created_by: imamUserId,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        masjid_id: masjid1Id,
        name: 'Youth Program',
        description: 'Monthly youth program with games, discussions, and activities.',
        event_date: nextWeek.toISOString().split('T')[0],
        event_time: '15:00:00',
        location: 'Community Center',
        created_by: adminUserId,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Insert user settings
    await queryInterface.bulkInsert('user_settings', [
      {
        id: uuidv4(),
        user_id: adminUserId,
        prayer_times_notifications: true,
        events_notifications: true,
        donations_notifications: true,
        general_notifications: true,
        questions_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        user_id: imamUserId,
        prayer_times_notifications: true,
        events_notifications: true,
        donations_notifications: false,
        general_notifications: true,
        questions_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_settings', null, {});
    await queryInterface.bulkDelete('events', null, {});
    await queryInterface.bulkDelete('notifications', null, {});
    await queryInterface.bulkDelete('questions', null, {});
    await queryInterface.bulkDelete('prayer_times', null, {});
    await queryInterface.bulkDelete('user_masajids', null, {});
    await queryInterface.bulkDelete('masajids', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};

