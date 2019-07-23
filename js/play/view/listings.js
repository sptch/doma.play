import api from '../../api';
import * as THREE from 'three';
import Scene from '../../city/3d/scene';
import Grid from '../../city/3d/grid';
import InteractionLayer from '../../city/3d/interact';
import {shadeColor} from '../../city/3d/color';

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Config
const parcelColors = {
  'Empty': 0xffc2c200,
  'Residential': 0xffffff,
  'Park': 0x21b75f,
  'River': 0x2146b7
}

const textMat = new THREE.MeshLambertMaterial({
  color: 0x383838
});
const altTextMat = new THREE.MeshLambertMaterial({
  color: 0xffffff
});
const mutedTextMat = new THREE.MeshLambertMaterial({
  color: 0x383838,
  opacity: 0.2,
  transparent: true
});

const cellSize = 32;
function createMap(state, tenant, detailsEl, cb, onSelect) {
  let allVacantUnits = [];
  let {cols, rows, parcels} = state.map;
  const grid = new Grid(cols, rows, cellSize);

  let loader = new THREE.FontLoader();
  loader.load('/static/helvetiker_bold.typeface.json', function (font) {
    Object.keys(parcels).forEach((r) => {
      Object.keys(parcels[r]).forEach((c) => {
        let p = parcels[r][c];
        let color = parcelColors[p.type];
        let text, vacancies;
        let neighb = state.neighborhoods[parseInt(p.neighb)];
        if (p.type == 'Residential' && p.neighb !== null) {
          if (neighb) {
            color = neighb.color;
            vacancies = state.buildings[`${r}_${c}`].units
              .filter((uId) => state.units[uId].occupancy > state.units[uId].tenants);
            let vacantUnits = vacancies.map((id) => state.units[id]);
            allVacantUnits = allVacantUnits.concat(vacantUnits);
            let affordable = vacantUnits.filter((u) => {
              let rentPerTenant = Math.round(u.rent/(u.tenants + 1));
              return rentPerTenant <= tenant.income/12;
            });
            color = parseInt(color.substr(1), 16);
            if (vacancies.length > 0) {
              let anyDOMA = vacantUnits.some((u) => u.doma);
              let geometry = new THREE.TextGeometry(`${vacancies.length.toString()}${anyDOMA ? '*': ''}`, {
                font: font,
                size: 10,
                height: 5,
                curveSegments: 6,
                bevelEnabled: false,
              });
              text = new THREE.Mesh(geometry, affordable.length > 0 ? textMat : mutedTextMat);

              // Center text
              let bbox = new THREE.Box3().setFromObject(text);
              bbox.center(text.position);
              text.position.multiplyScalar(-1);
            }
          }
        }
        let cell = grid.setCellAt(c, r, color);
        if (text) {
          cell.mesh.add(text);
        }

        if (tenant.work[0] == parseInt(r) && tenant.work[1] == parseInt(c)) {
          let workGeo = new THREE.ConeBufferGeometry(4, 8, 4);
          let workMat = new THREE.MeshBasicMaterial({
            color: 0xf1f442
          });
          let workMesh = new THREE.Mesh(workGeo, workMat);
          workMesh.rotation.z = Math.PI;
          workMesh.position.y = 12;
          cell.mesh.add(workMesh);

          let geometry = new THREE.TextGeometry('Work', {
            font: font,
            size: 6,
            height: 5,
            curveSegments: 6,
            bevelEnabled: false,
          });
          text = new THREE.Mesh(geometry, altTextMat);

          // Center text
          let bbox = new THREE.Box3().setFromObject(text);
          bbox.center(text.position);
          text.position.multiplyScalar(-1);
          text.position.y = 18;
          cell.mesh.add(text);
        }

        cell.mesh.obj = {
          data: {
            onClick: (ev) => {
              detailsEl.innerHTML = '';
              if (vacancies) {
                vacancies.map((id) => {
                    let u = state.units[id];
                    let rentPerTenant = Math.round(u.rent/(u.tenants + 1));
                    let affordable = rentPerTenant <= tenant.income/12;
                    let el = document.createElement('li');
                    if (!affordable) el.style.opacity = 0.5;
                    el.className = 'listing';
                    el.innerHTML = `
                      ${u.doma ? '<b>📌 DOMA-owned apartment</b><br />': ''}
                      ${u.occupancy} bedroom (${u.occupancy - u.tenants} available)<br />
                      Rent: $${numberWithCommas(rentPerTenant)}/month<br />
                      Total Rent: $${numberWithCommas(Math.round(u.rent))}/month<br />
                      On the market for ${u.monthsVacant} months<br />`;

                    let select = document.createElement('div');
                    select.className = 'select-listing';
                    if (affordable) {
                      select.innerText = 'Select';
                      select.addEventListener('click', () => {
                        onSelect(u);
                      });
                    } else {
                      select.innerText = 'Too Expensive';
                    }
                    el.appendChild(select);
                    return el;
                }).forEach((el) => {
                  detailsEl.appendChild(el);
                });
              }
            },
            tooltip: p.type != 'Residential' || !neighb ? p.type : neighb.name
          },
          focus: (ev) => {
            cell.focus();
          },
          unfocus: () => {
            cell.unfocus();
          }
        }
      });
    });
    cb(grid, allVacantUnits);
  });
}

function displayListings(el, tenant, onSelect, noVacancies) {
  // Setup scene
  const scene = new Scene({
    width: el.clientWidth,
    height: 400,
    brightness: 0.9
  });
  scene.renderer.domElement.style.border = '1px solid #00000022';
  el.appendChild(scene.renderer.domElement);
  scene.camera.position.z = 10;
  scene.camera.position.y = 0;
  scene.camera.position.x = 0;
  scene.camera.zoom = 0.002;
  scene.camera.lookAt(scene.scene.position);
  scene.camera.updateProjectionMatrix();
  scene.controls.enableRotate = false;

  let listingDetailsEl = document.createElement('div');
  el.appendChild(listingDetailsEl);

  function render() {
    scene.render();
    requestAnimationFrame(render);
  }

  api.get('/state', (state) => {
    createMap(state, tenant, listingDetailsEl, (grid, vacantUnits) => {
      if (vacantUnits.length === 0) {
        noVacancies('No vacancies');
      } else {
        let affordableUnits = vacantUnits.filter((u) => Math.round(u.rent/(u.tenants + 1)) <= (tenant.income/12))
        if (false && affordableUnits.length === 0) { // TODO TEMPORARY FALSE
          noVacancies('No affordable vacancies');
        } else {
          // Setup interactable objects
          let selectables = grid.cells.filter(c => c !== null).map(c => c.mesh);
          let ixn = new InteractionLayer(scene, selectables);
          scene.add(grid.group);
          render();
        }
      }
    }, onSelect);
  });
}

export default displayListings;