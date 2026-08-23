/**
 * Static country / state / city catalog for masjid location dropdowns.
 * Extra values already stored on masajids are merged in at request time.
 */
const LOCATION_CATALOG = [
  {
    name: 'Pakistan',
    states: [
      {
        name: 'Sindh',
        cities: [
          'Karachi',
          'Hyderabad',
          'Sukkur',
          'Larkana',
          'Nawabshah',
          'Mirpur Khas',
          'Jacobabad',
          'Shikarpur',
          'Khairpur',
          'Dadu',
          'Tando Allahyar',
          'Kotri',
          'Thatta',
          'Badin',
          'Ghotki',
          'Sanghar',
          'Umerkot',
          'Jamshoro'
        ]
      },
      {
        name: 'Punjab',
        cities: [
          'Lahore',
          'Faisalabad',
          'Rawalpindi',
          'Multan',
          'Gujranwala',
          'Sialkot',
          'Bahawalpur',
          'Sargodha',
          'Sheikhupura',
          'Rahim Yar Khan',
          'Gujrat',
          'Sahiwal',
          'Wah Cantonment',
          'Kasur',
          'Okara',
          'Jhelum',
          'Dera Ghazi Khan',
          'Vehari',
          'Attock',
          'Chakwal',
          'Mianwali',
          'Chiniot',
          'Hafizabad',
          'Khanewal',
          'Jhang'
        ]
      },
      {
        name: 'Khyber Pakhtunkhwa',
        cities: [
          'Peshawar',
          'Mardan',
          'Mingora',
          'Kohat',
          'Abbottabad',
          'Dera Ismail Khan',
          'Nowshera',
          'Swabi',
          'Charsadda',
          'Mansehra',
          'Bannu',
          'Haripur',
          'Chitral'
        ]
      },
      {
        name: 'Balochistan',
        cities: [
          'Quetta',
          'Turbat',
          'Khuzdar',
          'Hub',
          'Chaman',
          'Gwadar',
          'Sibi',
          'Zhob',
          'Loralai'
        ]
      },
      {
        name: 'Islamabad Capital Territory',
        cities: ['Islamabad']
      },
      {
        name: 'Azad Jammu and Kashmir',
        cities: ['Muzaffarabad', 'Mirpur', 'Kotli', 'Rawalakot', 'Bhimber', 'Bagh']
      },
      {
        name: 'Gilgit-Baltistan',
        cities: ['Gilgit', 'Skardu', 'Chilas', 'Hunza', 'Ghanche']
      }
    ]
  }
];

const DEFAULT_AREAS = {
  Pakistan: {
    Sindh: {
      Karachi: [
        'Clifton',
        'DHA',
        'PECHS',
        'Saddar',
        'Gulshan-e-Iqbal',
        'Gulistan-e-Jauhar',
        'North Nazimabad',
        'Nazimabad',
        'Federal B Area',
        'Malir',
        'Korangi',
        'Landhi',
        'Shah Faisal Colony',
        'Liaquatabad',
        'Orangi Town',
        'Keamari',
        'Lyari',
        'Bahadurabad',
        'North Karachi',
        'New Karachi',
        'Gulberg',
        'Shahrah-e-Faisal',
        'Buffer Zone',
        'Scheme 33',
        'Surjani Town',
        'Garden'
      ]
    },
    Punjab: {
      Lahore: [
        'DHA',
        'Gulberg',
        'Model Town',
        'Johar Town',
        'Allama Iqbal Town',
        'Garden Town',
        'Cantt',
        'Wapda Town',
        'Township',
        'Bahria Town',
        'Faisal Town',
        'Muslim Town',
        'Ichhra',
        'Samanabad'
      ]
    }
  }
};

function cloneCatalog() {
  return JSON.parse(JSON.stringify(LOCATION_CATALOG));
}

function findOrCreateCountry(catalog, countryName) {
  const trimmed = String(countryName || '').trim();
  if (!trimmed) {
    return null;
  }
  let country = catalog.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (!country) {
    country = { name: trimmed, states: [] };
    catalog.push(country);
  }
  return country;
}

function findOrCreateState(country, stateName) {
  const trimmed = String(stateName || '').trim();
  if (!country || !trimmed) {
    return null;
  }
  let state = country.states.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (!state) {
    state = { name: trimmed, cities: [] };
    country.states.push(state);
  }
  return state;
}

function addCity(state, cityName) {
  const trimmed = String(cityName || '').trim();
  if (!state || !trimmed) {
    return;
  }
  const exists = state.cities.some(
    (city) => city.toLowerCase() === trimmed.toLowerCase()
  );
  if (!exists) {
    state.cities.push(trimmed);
  }
}

function mergeStoredLocations(catalog, rows = []) {
  rows.forEach((row) => {
    const country = findOrCreateCountry(catalog, row.country);
    const state = findOrCreateState(country, row.state);
    addCity(state, row.city);
  });
  return catalog;
}

function sortCatalog(catalog) {
  catalog.sort((a, b) => {
    if (a.name === 'Pakistan') return -1;
    if (b.name === 'Pakistan') return 1;
    return a.name.localeCompare(b.name);
  });
  catalog.forEach((country) => {
    country.states.sort((a, b) => a.name.localeCompare(b.name));
    country.states.forEach((state) => {
      state.cities.sort((a, b) => a.localeCompare(b));
    });
  });
  return catalog;
}

function flattenDefaultAreas() {
  const rows = [];
  Object.entries(DEFAULT_AREAS).forEach(([country, states]) => {
    Object.entries(states).forEach(([state, cities]) => {
      Object.entries(cities).forEach(([city, areas]) => {
        areas.forEach((name) => {
          rows.push({ country, state, city, name });
        });
      });
    });
  });
  return rows;
}

module.exports = {
  LOCATION_CATALOG,
  DEFAULT_AREAS,
  cloneCatalog,
  mergeStoredLocations,
  sortCatalog,
  flattenDefaultAreas
};
