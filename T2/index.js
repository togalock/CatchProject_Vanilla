// Helper Functions
function createElementFromHTML(htmlString) {
  let div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild; 
}

function appendChildren(parent, children) {
  for (let child of children) {
    parent.appendChild(child);
  }
  return parent;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Map
const HONG_KONG = [22.302711, 114.177216];

let lmap = L.map("lmap", {
  center: HONG_KONG,
  zoom: 13,
  minZoom: 13,
});

let OSM_M = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

OSM_M.addTo(lmap);

// Checkpoint Add Tests
function generateCheckpoint(name, latlng, radius = 30) {
  let circleMarker = L.circle(latlng, {
    radius: radius,
    fillColor: "gray",
  });

  let nameBox = createElementFromHTML(`
  <div class="box p-1 has-text-centered is-size-6">${name}</div>`);
  let nameTooltip = L.tooltip({
    direction: "center",
    permanent: true,
    className: "nobox",
  }).setContent(nameBox);

  let progresses = [createElementFromHTML(`
  <progress class="progress small" value="0" max="15"></progress>`),
	createElementFromHTML(`
  <progress class="progress small"></progress>`)];
  progresses.forEach((element) => {element.style.width = "3em";});
  let progressesDiv = appendChildren(
    createElementFromHTML(`<div class="container"></div>`),
    progresses);

  let progressesTooltip = L.tooltip({
      direction: "right",
      permanent: true,
      className: "nobox",
    }).setContent(progressesDiv);
  
  let renderTo = function (lmap) {
    let checkpoint = this;
    checkpoint.circleMarker.addTo(lmap);
    checkpoint.circleMarker.bindTooltip(checkpoint.nameTooltip);
    checkpoint.nameTooltip.bindTooltip(checkpoint.progressesTooltip);
  }
  
  let unrender = function () {
    let checkpoint = this;
    checkpoint.nameTooltip.unbindTooltip();
    checkpoint.circleMarker.unbindTooltip();
    checkpoint.circleMarker.remove();
  }

  let checkpoint = {
    name: name, latlng: latlng, radius: radius,
    circleMarker: circleMarker,
    nameBox: nameBox, nameTooltip: nameTooltip,
    progresses: progresses, progressesDiv: progressesDiv, 
    progressesTooltip: progressesTooltip,
    renderTo: renderTo,
    unrender: unrender,
  }


  return checkpoint;
}

// Sample Click Add Checkpoint
let checkpoints = [];
let latest_checkpoint_assignment = 0;

function checkpointOnClick(mouseEvent) {
  let latlng = mouseEvent.latlng;
  let filteredCheckpoints = [];
  let checkpointRemoved = false;

  for (let checkpoint of checkpoints) {
    if (L.latLng(checkpoint.latlng).distanceTo(latlng) <= checkpoint.radius) {
      checkpoint.unrender();
      checkpointRemoved = true;
    } else {
      filteredCheckpoints.push(checkpoint);
    }
  }
  
  if (!checkpointRemoved) {
    new_alphabet = ALPHABET[latest_checkpoint_assignment];
    latest_checkpoint_assignment += 1;
    latest_checkpoint_assignment %= 26;
    new_checkpoint = generateCheckpoint(new_alphabet, latlng);
    new_checkpoint.renderTo(lmap);
    filteredCheckpoints.push(new_checkpoint);
  }

  checkpoints = filteredCheckpoints;
}

lmap.on("click", checkpointOnClick);

// Geoposition Handling
location_marker = L.circleMarker([0, 0], {
  radius: 10,
  color: "#fff",
  fillColor: "#30b7ff",
  fillOpacity: 0.8,
});
location_accuracy_marker = L.circle([0, 0], {
  radius: 0,
});

function onLocated(locationEvent) {
  let lmap = locationEvent.target;

  if (!lmap.hasLayer(location_marker)) {
    location_marker.addTo(lmap);
  }
  if (!lmap.hasLayer(location_accuracy_marker)) {
    location_accuracy_marker.addTo(lmap);
  }

  let latlng = locationEvent.latlng;
  let accuracy = locationEvent.accuracy;
  location_marker.setLatLng(latlng);
  location_accuracy_marker.setLatLng(latlng);
  location_accuracy_marker.setRadius(accuracy);
}

function onFailedLocate(errorEvent) {
  let lmap = locationEvent.target;
  
  if (lmap.hasLayer(location_marker)) {
    location_marker.removeFrom(lmap);
  }
  if (lmap.hasLayer(location_marker)) {
    location_marker.removeFrom(lmap);
  }
}

function onLocate(event) {
  event.stopPropagation();
  lmap.setView(location_marker.getLatLng(), 17, {
    animate: true,
  });
}

lmap.on("locationfound", onLocated);
lmap.on("locationerror", onFailedLocate);
lmap.locate({
  watch: true,
  enableHighAccuracy: true,
})

locate_button = createElementFromHTML(`
<button class="leaflet-bar button">
  <span class="icon is-small">
    <i class="fas fa-location-arrow"></i>
  </span>
</button>`);

locate_button.addEventListener("click", onLocate);

L.Control.Locate = L.Control.extend({
  onAdd: function(lmap) {
    return locate_button;
  }
})

L.control.locate = function(props) {
  return new L.Control.Locate(props);
}

locate_control = L.control.locate({
  position: "bottomright"}).addTo(lmap);