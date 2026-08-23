const { Op } = require('sequelize');
const { Masjid, Area, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const {
  cloneCatalog,
  mergeStoredLocations,
  sortCatalog
} = require('../data/locations');
const { ensureAreasTable } = require('../utils/ensureAreasTable');
const { ensureAreaColumn } = require('../utils/ensureAreaColumn');
const { upsertArea, normalize } = require('../utils/upsertArea');

async function getLocationCatalog(req, res) {
  try {
    const catalog = cloneCatalog();
    const stored = await Masjid.findAll({
      attributes: ['country', 'state', 'city'],
      raw: true
    });
    mergeStoredLocations(catalog, stored);
    sortCatalog(catalog);
    return responseHelper.success(res, { countries: catalog }, 'Location catalog retrieved successfully');
  } catch (error) {
    logger.error(`Get location catalog error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve location catalog', 500);
  }
}

async function getAreas(req, res) {
  try {
    await ensureAreasTable(sequelize);
    await ensureAreaColumn(sequelize);

    const country = normalize(req.query.country);
    const state = normalize(req.query.state);
    const city = normalize(req.query.city);

    if (!country || !state || !city) {
      return responseHelper.success(res, [], 'Areas retrieved successfully');
    }

    const [savedAreas, masjidAreas] = await Promise.all([
      Area.findAll({
        where: { country, state, city },
        attributes: ['id', 'name', 'city', 'state', 'country'],
        order: [['name', 'ASC']]
      }),
      Masjid.findAll({
        where: {
          country,
          state,
          city,
          [Op.and]: [
            { area: { [Op.ne]: null } },
            { area: { [Op.ne]: '' } }
          ]
        },
        attributes: ['area'],
        raw: true
      })
    ]);

    const names = new Map();
    savedAreas.forEach((area) => {
      names.set(area.name.toLowerCase(), {
        id: area.id,
        name: area.name,
        city: area.city,
        state: area.state,
        country: area.country
      });
    });
    masjidAreas.forEach((row) => {
      const name = normalize(row.area);
      if (name && !names.has(name.toLowerCase())) {
        names.set(name.toLowerCase(), { id: null, name, city, state, country });
      }
    });

    const areas = Array.from(names.values()).sort((a, b) => a.name.localeCompare(b.name));
    return responseHelper.success(res, areas, 'Areas retrieved successfully');
  } catch (error) {
    logger.error(`Get areas error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve areas', 500);
  }
}

async function createArea(req, res) {
  try {
    await ensureAreasTable(sequelize);

    const name = normalize(req.body.name);
    const city = normalize(req.body.city);
    const state = normalize(req.body.state);
    const country = normalize(req.body.country);

    if (!name || !city || !state || !country) {
      return responseHelper.error(res, 'Country, state, city and area name are required', 400);
    }

    const area = await upsertArea({
      name,
      city,
      state,
      country,
      createdBy: req.userId
    });

    logger.info(`Area created: ${area.name} (${city}, ${state}, ${country}) by user ${req.userId}`);
    return responseHelper.success(res, area, 'Area added successfully', 201);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return responseHelper.error(res, 'This area already exists for the selected city', 409);
    }
    logger.error(`Create area error: ${error.message}`);
    return responseHelper.error(res, 'Failed to add area', 500);
  }
}

module.exports = {
  getLocationCatalog,
  getAreas,
  createArea
};
