const { Op } = require('sequelize');
const { Area, sequelize } = require('../models');
const { ensureAreasTable } = require('./ensureAreasTable');

function normalize(value) {
  return String(value || '').trim();
}

async function upsertArea({ name, city, state, country, createdBy } = {}) {
  const areaName = normalize(name);
  const areaCity = normalize(city);
  const areaState = normalize(state);
  const areaCountry = normalize(country);

  if (!areaName || !areaCity || !areaState || !areaCountry) {
    return null;
  }

  await ensureAreasTable(sequelize);

  const existing = await Area.findOne({
    where: {
      city: areaCity,
      state: areaState,
      country: areaCountry,
      [Op.and]: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        areaName.toLowerCase()
      )
    }
  });

  if (existing) {
    return existing;
  }

  return Area.create({
    name: areaName,
    city: areaCity,
    state: areaState,
    country: areaCountry,
    created_by: createdBy || null
  });
}

module.exports = { upsertArea, normalize };
