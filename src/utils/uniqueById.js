const {Op} = require('sequelize');

function uniqueById(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter(row => {
    const id = row?.id || row?.dataValues?.id;
    if (!id) {
      return true;
    }
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function upcomingEventWhere(masjidId, today) {
  return {
    [Op.and]: [
      {masjid_id: masjidId},
      {status: 'active'},
      {
        [Op.or]: [
          {event_type: 'recurring'},
          {
            [Op.and]: [
              {event_type: 'one_time'},
              {event_date: {[Op.gte]: today}},
            ],
          },
        ],
      },
    ],
  };
}

module.exports = {uniqueById, upcomingEventWhere};

