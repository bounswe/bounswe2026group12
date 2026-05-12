import { resolveTheme } from '../../utils/culturalCalendar';
import './PassportCover.css';

const THEME_LABELS = {
  classic_traveler:      'Classic Traveler',
  vintage_recipe_book:   'Vintage Recipe Book',
  street_food_explorer:  'Street Food Explorer',
  grandmothers_kitchen:  "Grandmother's Kitchen",
  heritage_archive:      'Heritage Archive',
  world_kitchen_explorer:'World Kitchen Explorer',
  ramadan:               'Ramadan',
  eid_al_fitr:           'Eid al-Fitr',
  eid_al_adha:           'Eid al-Adha',
  lunar_new_year:        'Lunar New Year',
  nowruz:                'Nowruz',
  diwali:                'Diwali',
  hanukkah:              'Hanukkah',
  christmas:             'Christmas',
  easter:                'Easter',
};

export default function PassportCover({ profile, level }) {
  const theme = resolveTheme(profile, level, new Date());
  const label = THEME_LABELS[theme] ?? theme;

  return (
    <div
      className={`passport-cover passport-cover--${theme}`}
      role="img"
      aria-label={`Cultural Passport — ${label} theme`}
    >
      <div className="passport-cover-inner">
        <span className="passport-cover-icon">🗺</span>
        <div className="passport-cover-text">
          <h2 className="passport-cover-title">Cultural Passport</h2>
          <span className="passport-cover-theme">{label}</span>
        </div>
      </div>
    </div>
  );
}
