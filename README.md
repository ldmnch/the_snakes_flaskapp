Okay, here's the revised README.md. I've kept your original content and integrated the concise additions as planned.

# Maze Game 🐍

**Course:** Data Structures & Algorithms (Hertie School)  
**Instructor:** Meysam Goodarzi  
**Group members:** Ashley Razo, Nadine Daum, Laia Domenech Burin, Franco Bastida, Mika Erik Moeser, Nicolas Reichardt

---
**Live Demo:** [Play the Maze Game on PythonAnywhere!](https://thesnakegame.pythonanywhere.com/) 🚀
---

## Project Description

Hello and thanks for checking out our project!

We've built a **maze game web application** that lets players generate and solve mazes with varying difficulty levels. The game is hosted on **PythonAnywhere** and developed using **Python’s Flask** framework for the backend.
Maze generation is achieved using **Kruskal's algorithm** (optimized with a Disjoint Set Union data structure), and maze solutions are found via **Breadth-First Search (BFS)**. These algorithms are implemented in Python and made available via API calls, while the frontend is built with **HTML, CSS, and JavaScript** for a smooth user experience.

---

## Key Technologies & Structure

*   **Backend:** Python, Flask, NumPy
*   **Frontend:** HTML, CSS, JavaScript (see `static/js/game.js` for client-side logic)
*   **Core Logic (`src/`):**
    *   `maze_generator.py`: Implements Kruskal's algorithm and Disjoint Set Union (DSU).
    *   `maze_solver.py`: Implements Breadth-First Search (BFS).
*   **Data Management:** Leaderboard scores are stored in `data/leaderboard.json` (auto-created by `app.py` if permissions allow). The `leaderboard_archives/` directory stores daily backups.
*   **Automated Archival:** The `archive_leaderboard.py` script manages daily backups of the leaderboard.
*   **Presentation & Documentation:** Project slides (`slides/`) developed with RMarkdown; error help in `documentation/`.
*   **Testing:** Pytest suite in `tests/` for API, generator, and solver logic.

---

## Key Features

Our game includes the following features:
- 🏠 A landing page (`templates/index.html`)
- 🧩 Dynamic maze generation with adjustable difficulty levels (3x3 up to 100x100).
- 🔄 Maze-solving assistance for stuck players using BFS.
- 🎮 Interactive gameplay with multi-key support (Arrow keys & WASD).
- ⏱️ Game timer and player avatar color selection.
- 🏆 Persistent leaderboard with filtering by maze size and player name saving.
- 🏅 Achievements system for various milestones.
- 🔊 Background music and sound effects with a mute option.
- 🚀 More features coming soon!

---

## Leaderboard Automation & Archival

The game features a persistent leaderboard stored in `data/leaderboard.json`. To manage this data:
1.  The `archive_leaderboard.py` script creates a daily backup of the current `leaderboard.json` into the `leaderboard_archives/` directory, named with the date (e.g., `leaderboard_YYYY-MM-DD.json`).
2.  On our PythonAnywhere deployment, this script is **automated via a daily cron job**. This ensures regular data backup and helps manage the size of the live leaderboard file.
*(Note: The script has a `RESET_LEADERBOARD_AFTER_ARCHIVE` flag, currently `False`, which could allow for daily/weekly leaderboard resets if desired in the future).*

---

We followed the **Scrum methodology** for iterative development, enabling us to build and refine features effectively. Laia took on the role of surrogate Product Owner, and Nicolas served as Scrum Master.

Feel free to explore the code, contribute, or reach out with any questions! 🎯

---

## Running Locally

1.  **Clone the repository.**
2.  **Set up a Python virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Linux/macOS
    # venv\Scripts\activate    # On Windows
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the Flask application:**
    For debug mode (recommended for development):
    ```bash
    export FLASK_DEBUG=1  # On Linux/macOS
    # set FLASK_DEBUG=1     # On Windows Command Prompt
    # $env:FLASK_DEBUG="1" # On Windows PowerShell
    flask run
    ```
    Alternatively, run `python app.py`.
5.  Access the game in your browser, typically at `http://127.0.0.1:5000/`.

---

## List of Contributors
- Ashley Razo is a first-year Master of Data Science student at Hertie School.
- Nadine Daum is a first-year Master of Data Science student at Hertie School.
- Laia Domenech Burin is a first-year Master of Data Science student at Hertie School.
- Franco Bastida is a second-year Master of Public Policy + Master of Data Science (Dual Degree) student at Hertie School.
- Mika Erik Moeser is a first-year Master of Data Science student at Hertie School.
- Nicolas Reichardt is a first-year Master of Data Science student at Hertie School.
