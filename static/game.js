let mazeData = [];
let playerX = 1, playerY = 1;
let goalX, goalY;

function fetchMazeData() {
  fetch('/api/maze')
    .then(response => response.json())
    .then(data => {
      mazeData = data;
      renderMaze(data);
    });
}

function renderMaze(data) {
  const container = document.getElementById("maze-container");
  container.innerHTML = '';
  const gridSize = data.length;

  // Set up grid based on maze size
  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${gridSize}, 30px)`;
  container.style.gridTemplateRows = `repeat(${gridSize}, 30px)`;

  data.forEach((row, y) => {
    row.forEach((cell, x) => {
      const div = document.createElement("div");
      div.style.width = '30px';
      div.style.height = '30px';
      div.style.border = '1px solid #111';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.style.fontSize = '20px';
      div.style.backgroundColor = cell === 1 ? 'black' : 'white';
      div.setAttribute("data-x", x);
      div.setAttribute("data-y", y);
      container.appendChild(div);
    });
  });

  // Set start and goal
  playerX = 1;
  playerY = 1;
  goalX = gridSize - 2;
  goalY = gridSize - 2;

  renderPlayer();
  renderGoal();
}

function renderPlayer() {
  const index = playerY * mazeData.length + playerX;
  const cell = document.getElementById("maze-container").children[index];
  cell.innerHTML = "🐍";
}

function renderGoal() {
  const index = goalY * mazeData.length + goalX;
  const cell = document.getElementById("maze-container").children[index];
  cell.innerHTML = "🍎";
}

window.onload = fetchMazeData;

document.getElementById("generate-maze-btn").addEventListener("click", fetchMazeData);

document.addEventListener("keydown", (e) => {
  let newX = playerX;
  let newY = playerY;

  switch (e.key) {
    case "ArrowUp":
      newY -= 1;
      break;
    case "ArrowDown":
      newY += 1;
      break;
    case "ArrowLeft":
      newX -= 1;
      break;
    case "ArrowRight":
      newX += 1;
      break;
    default:
      return;
  }

  // Check for boundaries and walls
  if (
    newX >= 0 &&
    newY >= 0 &&
    newY < mazeData.length &&
    newX < mazeData[0].length &&
    mazeData[newY][newX] === 0
  ) {
    // Clear current snake
    const oldIndex = playerY * mazeData.length + playerX;
    document.getElementById("maze-container").children[oldIndex].innerHTML = "";

    // Move to new position
    playerX = newX;
    playerY = newY;

    renderPlayer();

    // Check if player reached goal
    if (playerX === goalX && playerY === goalY) {
      setTimeout(() => alert("🎉 You reached the apple!"), 100);
    }
  }
});

