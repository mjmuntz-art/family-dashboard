# Muntz Family Dashboard (Echo Show 10)

A seasonal dashboard for the Echo Show 10 (1280×800). It shows a home screen for 1 minute, then rotates through Family → Photos → Scores → Plays → News → Weather for 30 seconds each. Every month, every holiday and every family birthday has its own painted, animated scene with matching fonts, colors and corner style.

## What's in the folder

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The dashboard |
| `themes.js` | The 12 monthly looks, 16 holiday looks and the birthday look |
| `scenes.js` | The painted, animated backgrounds (one per look) |
| `config.js` | **Your settings**: location, teams, timing, Apps Script link |
| `keepalive.mp4` | A tiny silent video that helps keep the Silk browser from closing |
| `apps-script/Code.gs` | The Google Apps Script that supplies the calendar, photos, news and plays |

Weather, radar and pro/college scores work as soon as the page is online. Calendar, photos, news, plays and Morris games start working after step 2.

---

## Step 1 — Put it on GitHub Pages

1. On GitHub, create a new **public** repository, for example `family-dashboard`.
2. Choose **Add file → Upload files** and drag in everything except the `apps-script` folder. Commit.
3. Go to **Settings → Pages**. Under *Branch*, pick `main` and `/ (root)`, then save.
4. After a minute your dashboard is at `https://YOUR-USERNAME.github.io/family-dashboard/`.

Test it on a computer first. Add `?demo` to the end of the address to see it filled with placeholder data.

## Step 2 — Connect your Google data (Apps Script)

1. Go to script.google.com and click **New project**. Name it "Family Dashboard".
2. Delete the starter code, then paste in all of `apps-script/Code.gs`.
3. Fill in the **SETTINGS** block at the top:
   - `KEY`: make up a long password-like string. It keeps strangers from reading your calendar.
   - `CALENDARS`: `primary` is your main Google calendar. To add others (a shared family calendar, a kids' calendar), find their IDs in Google Calendar under the calendar's **Settings → Integrate calendar**.
   - `PHOTO_FOLDER_ID`: make a Google Drive folder for dashboard photos. The ID is the long code at the end of the folder's web address. The folder can stay private. For birthdays, add a subfolder inside it named exactly like the person in `config.js` (for example `Mom`); on their birthday only those photos show.
   - `DASHBOARD_SHEET_ID`: optional. Make a Google Sheet with a tab named **Morris**, using the columns `Date | Time | Sport | Opponent | Home/Away | Morris | Opp | Status | Location | Notes | Opp Color`. Games within 10 days of today appear on the Scores screen.
   - `PLAY_MODELS`: for each model, fill in the spreadsheet ID and the tab that lists the day's plays. Then match the `{Header}` names to the column headers in that tab. Only rows dated today are shown.
4. In the left sidebar, click **Services (+)**, add **Drive API**, and click Add. The photos need this.
5. At the top, choose the `testAll` function and click **Run**. Approve the permissions; Google will warn that the app isn't verified, which is normal for your own script. Then check the log output. `testCalendars` lists each calendar as OK or FAIL, and `testNews` shows how many stories each news source returned.

   **Updating Code.gs later:** keep your settings at the top (everything above the `=====` line) and replace everything below it. Any setting your old block is missing falls back to a default. After every change: **Deploy → Manage deployments → pencil → Version: New version → Deploy**.
6. Click **Deploy → New deployment**, choose type **Web app**, set *Execute as* to **Me**, and set *Who has access* to **Anyone**. Click Deploy and copy the web app URL.
7. In `config.js`, paste that URL into `appsScriptUrl` and your KEY into `appsScriptKey`. Upload the updated `config.js` to GitHub.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## Step 3 — Show it on the Echo Show 10

1. Say "Alexa, open Silk".
2. Type in your GitHub Pages address and bookmark it.
3. Tap **Tap to start full screen**. If you skip it, the dashboard still runs, just with the browser bar showing.

To stop the Echo from going back to its own home screen:
- The page plays a hidden, muted, looping video. Silk treats that as media playing, which is the usual way to keep it open.
- If Silk still closes after a while, set up an Alexa routine, for example "Alexa, family board", with the custom action **open Silk**. Silk reopens the last page you had open.
- The page reloads itself every night at 3:30 AM (`nightlyReload` in `config.js`).

## Settings you might change (`config.js`)

- `timing`: home 60 s, other screens 30 s, pop-ups 20 s. Scores, News and Weather cycle through pages: the Scores overview shows for `scoresGrid` (15 s), then each of your teams' games for `page` (12 s); each news story shows for `story` (10 s); each weather page for `page` (12 s).
- `teams`: teams that always get a Scores tile. They use ESPN team codes, for example `{ sport: 'basketball', league: 'nba', team: 'chi', name: 'Bulls' }`. Logos and colors come from ESPN automatically.
- `fillLeagues`: which leagues fill the remaining Scores tiles with today's games.
- `birthdays`: each person's name and birthday, like `{ name: 'Mom', date: '03-14', year: 1985 }`. On that day the whole dashboard switches to the birthday look and says "Happy Birthday, Mom!", with "Turning 41 today" if you include the year. A week ahead, the top banner counts down to it.
- `lowPower: true`: fewer falling leaves and snowflakes, no paper-grain texture, and no blur behind the panels. Use it if the Echo ever feels sluggish.

## Through the day

- **Night mode (11 PM–5 AM)**: a dim, warm clock with tomorrow's first event and the overnight low. Tap to wake it for 10 minutes. Change the hours in `night`.
- **Morning briefing (5–8:30 AM weekdays, 5–10 AM weekends)**: replaces Home with today's plans, what to wear, tonight's dinner and games, and the next countdown. Change it in `briefing`.
- **Live games**: when one of your teams is playing, a live scorebug page shows right after Home: down and distance, the last play and win chances, refreshed every 30 seconds. In a close finish (last 5 minutes, within `closeFinish` points) it stays on the game. The final shows once.
- **Weather warnings**: tornado, severe thunderstorm, flash flood, extreme wind and snow squall warnings take over for 2½ minutes, then come back every 10 minutes while they're active (`alerts`). Watches, winter storm warnings and advisories show as their own pages at the start of Weather.
- **Trash day**: "Trash goes out tonight" Sunday after 3 PM, "Trash pickup today" Monday morning. Add other weekly things in `weekly`.

## Extra setup for the new features

1. **Leave-by times**: in Code.gs, set `HOME_ADDRESS` to your street address. Any event with a location gets a "leave by" time from Google Maps traffic. The first run asks you to allow Maps; say yes.
2. **Countdowns**: make a Google Calendar named **Countdowns**, share it with the account that runs the script, and add it to `CALENDARS` in Code.gs. Put each thing you're counting down to on its date. It shows on the Family countdowns page and in the morning briefing, never on the regular schedule.
3. **Grocery list and family board (iPhone Reminders)**: build a Shortcut (steps below). Any list with "grocer" or "shopping" in the name becomes the grocery list. A list named **Family Board** becomes sticky notes.
4. Save Code.gs, then **Deploy → Manage deployments → edit → New version**.

### The Reminders Shortcut

In the Shortcuts app, make a new shortcut named "Send lists to dashboard":

1. **Find Reminders** where *List* is *Groceries* and *Is Not Completed*.
2. **Get Details of Reminders** → *Title*.
3. **Combine Text** with *New Lines*.
4. **Get Contents of URL**: your Apps Script URL, Method **POST**, Request Body **JSON** with three fields: `key` = your KEY, `list` = `Groceries`, `items` = *Combined Text*.
5. Repeat steps 1–4 for the **Family Board** list (with `list` = `Family Board`).

Then in **Automation**, add **App → Reminders → Is Closed → Run Immediately** with that shortcut, plus a **Time of Day** automation (e.g. every morning) so it stays fresh.

## Preview tricks (add to the end of the address)

- `?screen=weather&page=2`: jump to a page of a cycling screen (pages count from 0).

| Add | What it does |
|---|---|
| `?demo` | Placeholder data, no accounts needed |
| `?date=2026-11-26` | Pretend it's that date, for example to see the Thanksgiving look |
| `?theme=christmas` | Force a look: `january` … `december`, `newyear`, `mlk`, `valentines`, `presidents`, `stpatricks`, `easter`, `mothers`, `memorial`, `fathers`, `july4`, `labor`, `halloween`, `veterans`, `thanksgiving`, `christmas`, `nye`, `birthday` |
| `?screen=weather` | Start on a screen: `home`, `family`, `photos`, `scores`, `plays`, `news`, `weather` |
| `?static` | Stop the rotation |
| `?night` / `?briefing` | Preview night mode or the morning briefing |
| `?demo&alerts=demo` | Preview a winter storm warning page (`alerts=urgent` for a takeover) |

You can combine them with `&`, for example `?demo&date=2026-12-25&static`.

## Where the data comes from

- **Weather**: the National Weather Service supplies the official hourly and 7-day forecast and alerts. Open-Meteo supplies current conditions, UV, sunrise/sunset and air quality. The moon phase is calculated on the page.
- **Radar**: RainViewer radar over an Esri map.
- **Standings**: ESPN standings for your NFL, NBA, NHL and MLB teams while they're in season.
- **Drive times**: Google Maps, through your Apps Script.
- **Scores, logos, team colors, box scores and pre-game odds**: ESPN's public scoreboard data.
- **News**: AP (through its Flipboard feed), the Chicago Tribune, Sun-Times, WGN, NBC 5 and ABC 7, plus Shaw Local (Kendall County Now). These are fetched by your Apps Script. Stories without a picture borrow the article's share image.
- **Calendar, photos, plays, Morris games**: your own Google account, through the Apps Script.

None of these need an API key. These are free public services, so if one changes or goes down, that panel shows "retrying" and the rest of the dashboard keeps working.
