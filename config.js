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
  timing: { home: 60, screen: 30, detail: 20 },

  // Teams that always get a spot on the Scores screen (ESPN team codes).
  // Logos and colors come from ESPN automatically.
  teams: [
    { sport: 'football', league: 'nfl', team: 'ten', name: 'Titans' },
    { sport: 'football', league: 'nfl', team: 'det', name: 'Lions' },
    { sport: 'football', league: 'college-football', team: 'nd', name: 'Notre Dame' },
    // Add more, e.g.:
    // { sport: 'basketball', league: 'nba', team: 'chi', name: 'Bulls' },
    // { sport: 'football', league: 'college-football', team: '356', name: 'Illinois' },
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
