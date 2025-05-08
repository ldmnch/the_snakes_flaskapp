import json
import logging
import os
import shutil
import sys
from datetime import datetime, timedelta
from typing import NoReturn


# ==============================================================================
# Configuration
# ==============================================================================

# Determine project root based on this script's location
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# --- Path Configuration ---
# Modify these paths if your structure differs or you need absolute paths elsewhere.

# Assumes leaderboard.json is in a 'data' subdirectory within the project root.
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
LEADERBOARD_FILENAME = "leaderboard.json"
CURRENT_LEADERBOARD_PATH = os.path.join(DATA_DIR, LEADERBOARD_FILENAME)

# Directory where daily archives will be stored.
ARCHIVE_DIR = os.path.join(PROJECT_ROOT, "leaderboard_archives")

# Set to True to clear the current leaderboard after successful archival.
RESET_LEADERBOARD_AFTER_ARCHIVE = False

# --- Logging Configuration ---
# Basic logging to stdout, similar to app.py for consistency if run manually.
# Cron jobs should redirect stdout/stderr to capture this output.
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s [ArchiveScript]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ==============================================================================
# Helper Functions
# ==============================================================================


def get_yesterdays_date_str() -> str:
    """Returns yesterday's date formatted as YYYY-MM-DD."""
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime("%Y-%m-%d")


def ensure_dir_exists(directory_path: str) -> bool:
    """
    Creates a directory if it doesn't exist. Returns True if exists or created, False on error.
    """
    if os.path.exists(directory_path):
        return True
    try:
        os.makedirs(directory_path)
        logger.info(f"Created directory: {directory_path}")
        return True
    except OSError as e:
        logger.error(f"Error creating directory {directory_path}: {e}")
        return False


def exit_script(message: str, level: int = logging.INFO) -> NoReturn:
    """Logs a final message and exits the script."""
    logger.log(level, message)
    logger.info(f"--- Leaderboard Archival Script Finished: {datetime.now()} ---")
    sys.exit(1 if level >= logging.ERROR else 0)


# ==============================================================================
# Main Archival Logic
# ==============================================================================


def main():
    logger.info(f"--- Leaderboard Archival Script Started: {datetime.now()} ---")

    # Ensure archive directory exists, exit on failure
    if not ensure_dir_exists(ARCHIVE_DIR):
        exit_script(f"Failed to create or access archive directory: {ARCHIVE_DIR}", logging.ERROR)

    # Check if the current leaderboard file exists
    if not os.path.exists(CURRENT_LEADERBOARD_PATH):
        exit_script(
            f"Current leaderboard not found at {CURRENT_LEADERBOARD_PATH}. Nothing to archive."
        )

    # --- Prepare Archive File Path ---
    yesterday_str = get_yesterdays_date_str()
    archive_filename = f"leaderboard_{yesterday_str}.json"
    archive_filepath = os.path.join(ARCHIVE_DIR, archive_filename)

    # Check if archive for yesterday already exists
    if os.path.exists(archive_filepath):
        exit_script(
            f"Archive for {yesterday_str} already exists at {archive_filepath}. Skipping."
        )

    # --- Perform Archival (Copy) ---
    try:
        # copy2 preserves metadata like modification time
        shutil.copy2(CURRENT_LEADERBOARD_PATH, archive_filepath)
        logger.info(f"Successfully archived leaderboard to: {archive_filepath}")
    except (OSError, shutil.Error) as e:
        exit_script(f"Error copying leaderboard to archive: {e}", logging.ERROR)
    except Exception as e: # Catch any other unexpected error during copy
         exit_script(f"An unexpected error occurred during copy: {e}", logging.ERROR)


    # --- Optional: Reset Current Leaderboard ---
    if RESET_LEADERBOARD_AFTER_ARCHIVE:
        logger.info(f"Resetting current leaderboard file: {CURRENT_LEADERBOARD_PATH}")
        try:
            # Overwrite the current file with an empty JSON list
            with open(CURRENT_LEADERBOARD_PATH, "w") as f:
                json.dump([], f, indent=4)
            logger.info(f"Successfully reset current leaderboard.")
        except OSError as e:
            # Log error but don't necessarily exit with error status, as archive succeeded
            logger.error(f"Error resetting current leaderboard: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred while resetting leaderboard: {e}")

    exit_script("Archival process completed successfully.")


# ==============================================================================
# Script Execution
# ==============================================================================

if __name__ == "__main__":
    main()