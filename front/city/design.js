import Scene from './3d/scene';
import Grid from './3d/grid';
import InteractionLayer from './3d/interact';
import dat from 'dat.gui';

const parcelColors = {
  'Empty': 0xffc2c2,
  'Residential': 0xffffff,
  'Park': 0x21b75f,
  'River': 0x2146b7
}
const noneNeighbColor = 0xffd4c1;

const scene = new Scene({});
const main = document.getElementById('main');
main.appendChild(scene.renderer.domElement);

// Initialize grid
const cellSize = 32;
const cols = 50, rows = 50;
const grid = new Grid(cols, rows, cellSize);
let selectedCells = [];
let neighborhoods = [{
  id: 0,
  name: 'Neighborhood 0',
  color: '#ff0000',
  desirability: 1
}];

const parcelTypes = ['Empty', 'Residential', 'Park', 'River'];

for (let col=0; col<cols; col++) {
  for (let row=0; row<rows; row++) {
    let data = {
      neighborhood: 'None',
      neighborhoodId: -1,
      type: parcelTypes[0]
    };
    let cell = grid.setCellAt(col, row, parcelColors['Empty'], data);
    cell.mesh.obj = {
      data: {
        onClick: (ev) => {
          if (!ev.shiftKey) {
            // Reset selection
            if (selectedCells) selectedCells.forEach(c => c.unfocus());
            selectedCells = [cell];
          } else {
            if (selectedCells.includes(cell)) {
              selectedCells = selectedCells.filter(c => c !== cell);
            } else {
              selectedCells.push(cell);
            }
          }

          Object.keys(selectedCells[0].data).forEach((k) => {
            dummyCell[k] = cell.data[k];
          });

          // hack b/c dat.gui won't update
          // focused inputs
          document.activeElement.blur()
          cgui.updateDisplay();
        },
        tooltip: () => `${cell.data.type} (${cell.data.neighborhood})`
      },
      focus: (ev) => {
        cell.focus();
        if (ev.shiftKey && ev.ctrlKey) {
          selectedCells.push(cell);
        }
      },
      unfocus: () => {
        if (!selectedCells.includes(cell)) {
          cell.unfocus();
        }
      }
    }
  }
}

const guis = {};
const control = {
  addNeighborhood: () => {
    let id = Math.max.apply(Math, neighborhoods.map((n) => n.id)) + 1;
    let n = {
      id: id,
      name: `Neighborhood ${id}`,
      color: '#ff0000',
      desirability: 1
    };
    neighborhoods.push(n);
    makeNeighborhoodGUI(n);
  }
};

function makeNeighborhoodGUI(n) {
  let ngui = gui.addFolder(n.name);
  let name = ngui.add(n, 'name');
  name.onFinishChange((val) => {
    ngui.domElement.getElementsByClassName('title')[0].innerHTML = val;
    updateNeighbOpts();

    // Rename in UI as necessary
    grid.cells.map(c => {
      if (c.data.neighborhoodId == n.id) {
        c.data.neighborhood = val;
      }
    });
    if (dummyCell.neighborhoodId == n.id) {
      dummyCell.neighborhood = val;
    }
  });
  ngui.addColor(n, 'color').onFinishChange((val) => {
    console.log('changedColor');
    grid.cells.map(c => {
      if (c.data.neighborhoodId == n.id) {
        c.color = parseInt(n.color.substring(1), 16);
        c.setColor(c.color);
      }
    });
  });
  ngui.add(n, 'desirability').min(0).step(1);
  ngui.add({
    delete: () => {
      gui.removeFolder(guis[n.id]);
      delete guis[n.id];
      neighborhoods.splice(neighborhoods.findIndex((n_) => n_.id == n.id), 1);
      updateNeighbOpts();
    }
  }, 'delete');
  guis[n.id] = ngui;
  updateNeighbOpts();
}

let nOpts;
function updateNeighbOpts() {
  if (nOpts) {
    cgui.remove(nOpts);
  }
  let opts = ['None'].concat(neighborhoods.map(n => n.name));
  nOpts = cgui.add(dummyCell, 'neighborhood').options(opts).onChange((name) => {
    selectedCells.forEach((c) => {
      c.data.neighborhood = name;
      if (name == 'None') {
        c.data.neighborhoodId = -1;
        if (c.data.type == 'Residential' || c.data.type == 'Commercial') {
          c.color = noneNeighbColor;
        }
      } else {
        let neighborhood = neighborhoods.filter(n => n.name == name)[0];
        c.data.neighborhoodId = neighborhood.id;
        if (c.data.type == 'Residential' || c.data.type == 'Commercial') {
          c.color = parseInt(neighborhood.color.substring(1), 16);
        }
      }
    });
  });
}

let gui = new dat.GUI();

let cgui = gui.addFolder('Selected Cell');
let dummyCell = {
  neighborhood: 'None',
  type: parcelTypes[0]
};
cgui.add(dummyCell, 'type').options(parcelTypes).listen().onChange((t) => {
  selectedCells.forEach(c => {
    if (t == 'Residential' || t == 'Commercial') {
      if (c.data.neighborhood == 'None') {
        c.color = noneNeighbColor;
      } else {
        let neighborhood = neighborhoods.filter(n => n.name == c.data.neighborhood)[0];
        c.color = parseInt(neighborhood.color.substring(1), 16);
      }
    } else {
      c.color = parcelColors[t];
    }
    c.data.type = t;
  });
});
cgui.open();

gui.add(control, 'addNeighborhood').name('+Neighborhood');
neighborhoods.forEach(makeNeighborhoodGUI);


// Setup interactable objects
let selectables = grid.cells.map(c => c.mesh);
let ixn = new InteractionLayer(scene, selectables);
scene.add(grid.group);

scene.camera.position.z = 0;
scene.camera.position.y = 0;
scene.camera.position.x = 0;
scene.camera.zoom = 0.002;
scene.camera.lookAt(scene.scene.position);
scene.camera.updateProjectionMatrix();
scene.controls.enableRotate = false;

function render() {
  scene.render();
  requestAnimationFrame(render);
}
render();