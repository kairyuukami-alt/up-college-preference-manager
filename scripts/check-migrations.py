"""Validate the complete migration sequence against a fresh, disposable SQLite DB."""
import json
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parent.parent
journal = json.loads((root / 'drizzle/meta/_journal.json').read_text())
connection = sqlite3.connect(':memory:')
connection.execute('PRAGMA foreign_keys = ON')
for entry in journal['entries']:
    migration = root / 'drizzle' / (entry['tag'] + '.sql')
    connection.executescript(migration.read_text())
    print('Applied:', migration.name)
assert connection.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
assert not connection.execute('PRAGMA foreign_key_check').fetchall()
assert connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='student_directory'").fetchone()
print('Migration integrity and foreign-key checks passed.')
connection.close()
