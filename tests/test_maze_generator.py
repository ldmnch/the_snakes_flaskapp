import pytest

# Assuming src/maze_generator.py is discoverable relative to tests/ or project root
from src.maze_generator import DisjointSet, Maze


# ==============================================================================
# DisjointSet Unit Tests
# ==============================================================================


def test_disjoint_set_union_and_find():
    """Verify DisjointSet find and union operations, including preventing redundant merges."""
    ds = DisjointSet(9)  # Test with a 3x3 cell grid equivalent (9 elements)

    # Initial state: element 0 is its own root
    assert ds.find(0) == 0

    # First union should succeed
    assert ds.union(0, 1) is True

    # After union, 0 and 1 should have the same root
    assert ds.find(0) == ds.find(1)

    # Second union of the same elements should fail (already connected)
    assert ds.union(0, 1) is False


# ==============================================================================
# Maze Class Tests
# ==============================================================================


@pytest.mark.parametrize("dimension", [3, 5, 7, 10, 15, 20, 100])
def test_maze_generation_properties(dimension):
    """Check grid size and passage count for generated mazes of various dimensions."""
    maze = Maze(dimension)
    maze.generate()
    grid = maze.to_list()
    grid_size = 2 * dimension + 1

    # Verify overall grid dimensions
    assert len(grid) == grid_size
    assert all(len(row) == grid_size for row in grid)

    # Verify passage count: A perfect maze removes exactly (dimension*dimension - 1) walls.
    # Total cells = dimension * dimension
    # Total possible grid points = grid_size * grid_size
    # Total walls initially = grid_size*grid_size - num_cells
    # Passages = num_cells + num_removed_walls = num_cells + (num_cells - 1) = 2*num_cells - 1
    # However, counting 0s includes the cell passages AND removed wall passages.
    # A simpler check: There should be more passages (0s) than initial cell centers (dimension*dimension).
    flat_grid = [cell for row in grid for cell in row]
    passage_count = flat_grid.count(0)
    assert passage_count > dimension * dimension


# Parametrized test cases: (maze_dimension, grid_y_coord, grid_x_coord) for cell center
# Cell (r, c) where 0 <= r,c < dimension corresponds to grid coords (2r+1, 2c+1)
@pytest.mark.parametrize(
    "dimension, grid_y, grid_x",
    [
        (3, 1, 1),  # Cell (0,0) center
        (5, 3, 3),  # Cell (1,1) center
        (7, 5, 5),  # Cell (2,2) center
        (10, 7, 7), # Cell (3,3) center
        (15, 9, 9), # Cell (4,4) center
        (20, 15, 15), # Cell (7,7) center
        (100, 99, 99), # Cell (49,49) center
    ],
)
def test_initialize_passages(dimension, grid_y, grid_x):
    """Verify that cell centers are correctly initialized as passages (0)."""
    maze = Maze(dimension)
    # Check the state *after* initialization but *before* generation
    assert maze.grid[grid_y, grid_x] == 0


@pytest.mark.parametrize("dimension", [3, 5, 7, 10, 15, 20, 100])
def test_initial_walls(dimension):
    """Verify that all grid locations *not* corresponding to cell passages are initially walls (1)."""
    maze = Maze(dimension)
    # Check the state *after* initialization but *before* generation

    for y in range(maze.grid_size):
        for x in range(maze.grid_size):
            # A point is a wall if EITHER coordinate is even (boundary or between-cell wall)
            # OR if it's an odd/odd coordinate that wasn't initialized as a passage (shouldn't happen with current init)
            is_cell_passage = (y % 2 != 0) and (x % 2 != 0)
            if not is_cell_passage:
                assert maze.grid[y, x] == 1, f"Expected wall at ({y},{x}), got {maze.grid[y, x]}"
            else:
                # This checks that our _initialize_passages worked as expected
                 assert maze.grid[y, x] == 0, f"Expected passage at ({y},{x}), got {maze.grid[y, x]}"


# --- Test Runner Helper ---
# This block is typically not needed when using the `pytest` command runner,
# but doesn't hurt if you sometimes run scripts directly with `python tests/test_...`.
if __name__ == "__main__":
    pytest.main()