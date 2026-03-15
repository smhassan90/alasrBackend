const { Event, Masjid, User } = require('./src/models');

async function testEvents() {
  try {
    console.log('--- Starting Event Tests ---');
    
    // 1. Get a test user and a masjid or create them
    let user = await User.findOne();
    if (!user) {
      user = await User.create({
        name: 'Test Imam',
        email: 'testimam@example.com',
        password: 'password123',
        role: 'user'
      });
      console.log('Created test user');
    }

    let masjid = await Masjid.findOne();
    if (!masjid) {
      masjid = await Masjid.create({
        name: 'Test Masjid',
        location: '0,0',
        city: 'Test City',
        created_by: user.id
      });
      console.log('Created test masjid');
    }

    // 2. Create one-time event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = tomorrow.toISOString().split('T')[0];

    const oneTimeEvent = await Event.create({
      masjid_id: masjid.id,
      name: 'One Time Event',
      event_type: 'one_time',
      event_date: eventDate,
      event_time: '14:00',
      created_by: user.id
    });
    console.log('Created one-time event:', oneTimeEvent.id);

    // 3. Create recurring event
    const recurringEvent = await Event.create({
      masjid_id: masjid.id,
      name: 'Friday Jumma Byan',
      event_type: 'recurring',
      day_of_week: 5, // Friday
      event_time: '13:30',
      created_by: user.id
    });
    console.log('Created recurring event:', recurringEvent.id);

    // 4. Test logic inside eventController.getUpcomingEvents directly
    const { Op } = require('sequelize');
    const today = new Date().toISOString().split('T')[0];
    
    const events = await Event.findAll({
      where: {
        masjid_id: masjid.id,
        status: 'active',
        [Op.or]: [
          { event_type: 'recurring' },
          { 
            event_type: 'one_time',
            event_date: {
              [Op.gte]: today
            }
          }
        ]
      }
    });

    console.log(`Found ${events.length} upcoming events (expected at least 2).`);
    events.forEach(e => {
      console.log(`- ${e.name} (Type: ${e.event_type}, Day: ${e.day_of_week}, Date: ${e.event_date})`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testEvents();
