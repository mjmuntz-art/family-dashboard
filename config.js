// =====================================================================
//  Muntz Family Dashboard — settings
//  This is the only file you should need to edit.
// =====================================================================
window.DASH_CONFIG = {
  // Where the weather, sunrise/sunset and radar are centered.
  location: { name: 'Yorkville, IL', lat: 41.6411, lon: -88.4473, timezone: 'America/Chicago' },

  // Your Google Apps Script web app (see README, step 2).
  // Leave blank until it's deployed — those screens show a setup note until then.
  appsScriptUrl: '',
  appsScriptKey: '',          // the same secret you put in Code.gs (KEY)

  // How long each screen stays up (seconds).
  timing: {            // seconds
    home: 60,          // home dashboard
    screen: 30,        // Family, Photos and Plays
    scoresGrid: 15,    // Scores overview (all games)
    game: 12,          // each of your teams' game pages (box score / up next)
    story: 10,         // each news story (6 stories)
    photo: 10,         // each photo collage (3 per visit)
    weather: 12,       // each weather page (5 pages: now, hours, week, sun & moon, radar)
    detail: 20,        // pop-ups after you tap something
    live: 40,          // each live game page (your teams); refreshes every 30 seconds while it's up
    standings: 15,     // each standings page on Scores
    alert: 15,         // each watch / advisory page on Weather
    board: 20          // grocery list / family board and countdowns pages on Family
  },

  // Night mode: dim clock only. Tap the screen to wake it for 10 minutes. Hours use a 24-hour clock.
  night: { start: 23, end: 5, wakeMin: 10 },

  // Morning briefing replaces Home in the morning: today's plans, what to wear, tonight's dinner and games.
  briefing: { start: '05:00', weekdayEnd: '08:30', weekendEnd: '10:00' },

  // Urgent warnings (tornado, severe storm, flash flood…) take over the screen for takeoverSec,
  // then come back every everyMin minutes while they're active. Watches and winter alerts show on Weather.
  alerts: { takeoverSec: 150, everyMin: 10 },

  // Weekly reminders. day: 0 = Sunday, 1 = Monday … 6 = Saturday.
  // Shows "tonight" the evening before (from 3 PM) and "today" that morning (until noon).
  weekly: [
    { day: 1, emoji: '🗑️', tonight: 'Trash goes out tonight', today: 'Trash pickup today' }
  ],

  // A live game stays on screen in a close finish: last 5 minutes, within this many points.
  closeFinish: { football: 8, basketball: 6, hockey: 1, baseball: 1 },

  // Your teams: they always get a tile, plus full-screen pages for their last final and next game.
  // team can be the abbreviation ('chi'), the nickname ('Bears'), the school ('Illinois') or ESPN's ID number.
  // Every line needs a comma after it except the last one. Logos and colors come from ESPN automatically.
  // league options: nfl, nba, wnba, mlb, nhl, college-football, mens-college-basketball
  // sport options:  football, basketball, baseball, hockey
  teams: [
    { sport: 'football',   league: 'nfl',                     team: 'ten',            name: 'Titans' },
    { sport: 'football',   league: 'nfl',                     team: 'det',            name: 'Lions' },
    { sport: 'baseball',   league: 'mlb',                     team: 'stl',            name: 'Cardinals' },
    { sport: 'baseball',   league: 'mlb',                     team: 'det',            name: 'Tigers' },
    { sport: 'hockey',     league: 'nhl',                     team: 'chi',            name: 'Blackhawks' },
    { sport: 'hockey',     league: 'nhl',                     team: 'det',            name: 'Red Wings' },
    { sport: 'basketball', league: 'nba',                     team: 'chi',            name: 'Bulls' },
    { sport: 'basketball', league: 'mens-college-basketball', team: 'Michigan State', name: 'Michigan State', id: '127' },
    { sport: 'basketball', league: 'mens-college-basketball', team: 'Illinois State', name: 'Illinois State', id: '2287' },
    { sport: 'football',   league: 'college-football',        team: 'Notre Dame',     name: 'Notre Dame',     id: '87' },
    { sport: 'football',   league: 'college-football',        team: 'Illinois State', name: 'Illinois State', id: '2287' }
  ],

  // Leagues used to fill the remaining Scores tiles with today's games.
  fillLeagues: [
    { sport: 'football', league: 'nfl', label: 'NFL' },
    { sport: 'basketball', league: 'nba', label: 'NBA' },
    { sport: 'football', league: 'college-football', label: 'CFB' }
  ],

  // Morris (IHSA) games come from the "Morris" tab of your dashboard sheet via Apps Script.
  morris: { enabled: true, name: 'Morris', abbr: 'MOR', color: '#5D2E2F', altColor: '#C1A675' },

  // Birthdays get their own look for the whole day: date is 'MM-DD'; add year to show their age.
  // Photos in a Drive subfolder named exactly like the person show on their day.
  birthdays: [
    // { name: 'Mom', date: '03-14', year: 1985 },
    // { name: 'Jack', date: '08-02', year: 2016 },
  ],

  // Turn this on if animations ever feel sluggish on the Echo.
  lowPower: false,

  // Reload the whole page once a night to pick up changes and stay fresh.
  nightlyReload: '03:30'
};
