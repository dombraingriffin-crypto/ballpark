-- Ballpark results. One row per player per day.
CREATE TABLE IF NOT EXISTS results (
  day     TEXT    NOT NULL,  -- YYYY-MM-DD, the player's local date
  sig     TEXT    NOT NULL,  -- the day's five item names joined with "|"
  player  TEXT    NOT NULL,  -- anonymous random id from the player's browser
  guesses TEXT    NOT NULL,  -- JSON array of five prices in dollars
  total   INTEGER NOT NULL,  -- 0 to 500
  created INTEGER NOT NULL,  -- milliseconds since 1970
  PRIMARY KEY (day, player)
);
CREATE INDEX IF NOT EXISTS results_day_sig ON results (day, sig);
