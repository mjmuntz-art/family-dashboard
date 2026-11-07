// =====================================================================
//  Muntz Family Dashboard — settings
//  This is the only file you should need to edit.
// =====================================================================
window.DASH_CONFIG = {
  // Where the weather, sunrise/sunset and radar are centered.
  location: { name: 'Yorkville, IL', lat: 41.6411, lon: -88.4473, timezone: 'America/Chicago' },

  // Your Google Apps Script web app (see README, step 2).
  // Leave blank until it's deployed — those screens show a setup note until then.
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbz7k4Tst0Tj0AtIYF45mipxAJTrFF8xZ7nlkT3vtfmepS6Gl518MwO8FvnOnlo46TWL/exec',
  appsScriptKey: 'FranklinandWestonarebabies604!',          // the same secret you put in Code.gs (KEY)

  // How long each screen stays up (seconds).
  timing: {            // seconds
    home: 90,          // home dashboard
    screen: 30,        // Family, Photos and Plays
    scoresGrid: 30,    // Scores overview (all games)
    game: 30,          // each of your teams' game pages (box score / up next)
    photo: 30,
    story: 30,         // each news story (6 stories)
    weather: 30,       // each weather page (5 pages: now, hours, week, sun & moon, radar)
    detail: 60         // pop-ups after you tap something
  },

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
    { name: 'Cate', date: '02-15', year: 1994 },
    { name: 'Mike', date: '04-06', year: 1990 },
    { name: 'Weston', date: '12-23', year: 2025 },
    // { name: 'Mom', date: '03-14', year: 1985 },
    // { name: 'Jack', date: '08-02', year: 2016 },
  ],

  // Turn this on if animations ever feel sluggish on the Echo.
  lowPower: false,

  // Reload the whole page once a night to pick up changes and stay fresh.
  nightlyReload: '03:30'
};
