# archive_leaderboard.py
import json
import os
import shutil
from datetime import datetime, timedelta

# --- Configuration ---
# Adjust these paths based on your project structure and where leaderboard.json lives.
# Assumes this script is run from the project root or paths are absolute.
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
LEADERBOARD_FILENAME = 'leaderboard.json'

# Option 1: Leaderboard in a 'data' subdirectory (RECOMMENDED)
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
CURRENT_LEADERBOARD_PATH = os.path.join(DATA_DIR, LEADERBOARD_FILENAME)

# Option 2: Leaderboard at project root (matches your current app.config if not changed)
# CURRENT_LEADERBOARD_PATH = os.path.join(PROJECT_ROOT, LEADERBOARD_FILENAME)

ARCHIVE_DIR = os.path.join(PROJECT_ROOT, 'leaderboard_archives')

# --- Helper Functions ---
def get_yesterdays_date_str() -> str:
    """Returns yesterday's date as YYYY-MM-DD."""
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime('%Y-%m-%d')

def ensure_dir_exists(directory_path: str):
    """Creates a directory if it doesn't exist."""
    if not os.path.exists(directory_path):
        try:
            os.makedirs(directory_path)
            print(f"Created directory: {directory_path}")
        except OSError as e:
            print(f"Error creating directory {directory_path}: {e}")
            raise # Re-raise if directory creation is critical

def main():
    print(f"--- Leaderboard Archival Script Started: {datetime.now()} ---")

    ensure_dir_exists(ARCHIVE_DIR)
    # If using a 'data' directory, ensure it exists (though app should handle it)
    # ensure_dir_exists(DATA_DIR) # Less critical if app creates/uses it

    if not os.path.exists(CURRENT_LEADERBOARD_PATH):
        print(f"Current leaderboard file not found at {CURRENT_LEADERBOARD_PATH}. Nothing to archive.")
        return

    # 1. Determine archive filename
    yesterday_str = get_yesterdays_date_str()
    archive_filename = f"leaderboard_{yesterday_str}.json"
    archive_filepath = os.path.join(ARCHIVE_DIR, archive_filename)

    if os.path.exists(archive_filepath):
        print(f"Archive for {yesterday_str} already exists at {archive_filepath}. Skipping.")
        # Optionally, overwrite or append a timestamp if multiple runs per day are possible
        # For a daily cron, this check is usually sufficient.
        return

    # 2. Copy current leaderboard to archive
    try:
        shutil.copy2(CURRENT_LEADERBOARD_PATH, archive_filepath) # copy2 preserves metadata
        print(f"Successfully archived leaderboard to: {archive_filepath}")
    except IOError as e:
        print(f"Error copying leaderboard to archive: {e}")
        return
    except Exception as e:
        print(f"An unexpected error occurred during archival: {e}")
        return

    # 3. OPTIONAL: Reset current leaderboard
    # If you want to clear the main leaderboard daily after archiving:
    # try:
    #     with open(CURRENT_LEADERBOARD_PATH, 'w') as f:
    #         json.dump([], f, indent=4)
    #     print(f"Successfully reset current leaderboard: {CURRENT_LEADERBOARD_PATH}")
    # except IOError as e:
    #     print(f"Error resetting current leaderboard: {e}")
    # except Exception as e:
    #     print(f"An unexpected error occurred while resetting leaderboard: {e}")

    print(f"--- Leaderboard Archival Script Finished: {datetime.now()} ---")

if __name__ == "__main__":
    main()