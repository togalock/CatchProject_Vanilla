const HONG_KONG = [22.302711, 114.177216];
const HONG_KONG_BOUNDS = {
  lat: [22.13333, 22.58333],
  lng: [113.8167, 114.5167],}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const AVATARS_AVAILABLE = 13;

const MAP_DIV = "lmap";

// Helper Functions
const min = Math.min;
const max = Math.max;
const pass = () => undefined;
const int = (any => Math.floor(Number(any)));
const ceil = (any => Math.ceil(Number(any)));
const round = ((float, precision) => Number.parseFloat(float).toPrecision(precision));
const deepcopy = (obj) => JSON.parse(JSON.stringify(obj)); // wtf... might be changed or ignored completely


function createNode(_html) {
  let div = document.createElement('div');
  div.innerHTML = _html.trim();
  return div.firstChild;
}

const json_push = (obj) => JSON.stringify(obj);
const json_pull = (json_string) => JSON.parse(json_string);

const randomString = (length, bits = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") => {
  let res = "";
  for (let i = 0; i < length; i++) {
    res += bits[int(Math.random() * bits.length)];
  }
  return res;
}

// Map Helper
let getLatlngArray = (Llatlng) => [Llatlng.lat, Llatlng.lng];


// Bulma Helper
function bulma_color(color, is_light = null) {
  let colors = {
    "red": "danger",
    "yellow": "warning",
    "green": "success",
    "blue": "info",
    "purple": "link",
    "grass": "primary",
    "black": "black",
    "dark": "dark",
    "gray": "light",
    "white": "white",
  };

  for (let color of Object.values(colors)) {
    colors[color] = color;
  }

  if (colors[color] === undefined) {
    return "";
  }

  if (is_light === null) {
    return `${colors[color]}`
  }
  else {
    return `${colors[color]}-${is_light ? "light" : "dark"}`
  }
}

// TeamProgress
function getTeamProgressBars(progress) {
  let bars = [];
  
  for (let team of Object.keys(progress.teams)) {
    let team_info = progress.teams[team];
    bars.push(createNode(
      `<progress class="progress_bar progress is-small is-${team_info.color}" 
      value="${min(progress.capture_score, team_info.score)}" max="${progress.capture_score}">
      </progress>`
    ));
  }

  return bars;
}

function newTeamProgressRender(progress) {
  let renders = {
    target_feature: null,
    container: undefined,
    box: undefined,
  };
  
  if (!!progress.captured_by) {
    let team_color = progress.captured_by.color;
    let color_lock = createNode(
      `<div class="container is-size-5 has-background-${team_color} p-1 m-1">
        <span class="icon">
        <i class="fas fa-lock"></i>
        </span>
      </div>
    `);
    renders.container = color_lock;
  }
  else {
    renders.container = createNode(`<div class="container progress_box"></div>`);
    let bars = getTeamProgressBars(progress);
    for (let bar of bars) {
      renders.container.appendChild(bar);
    }
  }

  renders.box = L.tooltip({
    direction: "right",
    permanent: "true",
    className: "nobox",
  }).setContent(renders.container);


  renders.attachTo = function(feature) {
    this.target_feature = feature;
    feature.bindTooltip(this.box);
  }

  renders.unrender = function() {
    this.target_feature = null;
    this.box.remove();
  }

  renders.rerender = function(progress) {
    let target_feature = this.target_feature;
    this.unrender();
    progress.renders = newTeamProgressRender(progress);
    progress.renders.attachTo(target_feature);
  }

  return renders;
}

function newTeamProgress(team_colors, starting_score = 0, capture_score = 5) {
  let progress = {
    teams: {},
    capture_score: capture_score,
    captured_by: null,
    renders: undefined,
  }

  for (let team of Object.keys(team_colors)) {
    progress.teams[team] = {
      team: team,
      color: team_colors[team],
      score: starting_score,
    }
  }

  progress.renders = newTeamProgressRender(progress);

  progress.update_status = function() {
    if (!!!this.captured_by) {
      for (let team of Object.keys(this.teams)) {
        if (this.teams[team].score >= this.capture_score) {
          this.teams[team].score = int(this.capture_score * 1.25);
          this.captured_by = this.teams[team];
          break;
        }
      }
    }
  }

  progress.set_score = function(team, score) {
    this.teams[team].score = score;
    this.update_status();
    this.renders.rerender(this);
  }

  progress.delta_score = function(team, delta) {
    progress.set_score(team, this.teams[team].score + delta);
  }

  return progress;
}

// Checkpoint
function newCheckpointRender(checkpoint) {
  let renders = {
    target_lmap: null,
    circle: L.circle(checkpoint.latlng,
      {
        radius: checkpoint.radius,
      }),

    name: L.tooltip({
      direction: "center",
      permanent: true,
      opacity: 0.7,
      }).setContent(checkpoint.name)
      .setLatLng(checkpoint.latlng),
  }

  renders.renderTo = function(lmap) {
    this.target_lmap = lmap;
    this.circle.addTo(lmap);
    this.name.addTo(lmap);
  }

  renders.unrender = function() {
    this.target_lmap = null;
    this.circle.remove();
    this.name.remove();
    
    if (this.progress !== undefined) {
      this.progress.renders.unrender();
    }
  }

  renders.rerender = function(checkpoint) {
    let target_lmap = this.target_lmap;
    this.unrender();
    checkpoint.renders = newCheckpointRender(checkpoint);
    checkpoint.renders.renderTo(target_lmap);
  }

  return renders;
}

function newCheckpoint(name, latlng, radius = 30) {
  let checkpoint = {
    name: name,
    latlng: latlng,
    radius: radius,
    progress: undefined, 
    renders: undefined,
  }

  checkpoint.renders = newCheckpointRender(checkpoint);

  return checkpoint;
}


// Players
function newPlayerBoxRender(player, background_color = "") {
  let background_class = background_color ? ` has-background-${background_color}` : "";
  let renders = {
    target_div: null,
    box: createNode(`
    <div class="box p-1${background_class}">
      <figure class="image is-32x32 m-auto">
        <img class="is-rounded" src="./avatars/th-c${player.avatar_id}.png">
      </figure>
      <p class="is-size-7 has-text-centered">${player.name}</p>
    </div>
    `),
  }

  renders.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.box);
  }

  renders.unrender = function() {
    this.target_div = null;
    this.box.remove();
  }

  return renders;
}

function newPlayerCircleRender(player) {
  let renders = {
    target_lmap: null,
    icon: createNode(`
      <figure class="image is-64x64">
        <img class="is-rounded" src="./avatars/th-c${player.avatar_id}.png">
      </figure>
      `
    ),
    circle: undefined,
  }

  renders.circle = L.tooltip({
    direction: "center",
    permanent: true,
    className: "nobox",
  }).setContent(renders.icon)
  .setLatLng(player.latlng);

  renders.renderTo = function(lmap) {
    this.target_lmap = lmap;
    this.circle.addTo(lmap);
  }

  renders.unrender = function() {
    this.target_lmap = null;
    this.circle.remove();
  }

  return renders;
}


function newPlayer(name, latlng, avatar_id = 1) {
  let player = {
    name: name,
    latlng: latlng,
    avatar_id: min(avatar_id, AVATARS_AVAILABLE),
    role: undefined,
    renders: undefined,
  }

  return player;
}

// Game
function newTeamProgressRole(game, team, is_host = false) {
  let role = {
    game: game,
    team: team,
    is_host: is_host,
    last_captured: null,
    score: 0,
    distance_travelled: 0,
  }

  return role;
}

function newTeamProgressPendingGame(gid, duration = 15, checkpoints = {}, team_colors = {}, players = {}) {
  let game = {
    gid: gid,
    mode: "TEAM_PROGRESS",
    start_time: null,
    duration: duration,
    status: "PENDING",
    checkpoints: checkpoints,
    team_colors: team_colors,
    players: players,
    bounds: undefined,
    ending_status: null,

    start: undefined,
    get_teams_scores: undefined,
    get_ending_status: undefined,
    end: undefined,
  }

  // Get bounds, can be removed
  let lats = []; let lngs = []; let radiuses = [];
  for (let checkpoint of Object.values(checkpoints)) {
    lats.push(checkpoint.latlng[0]);
    lngs.push(checkpoint.latlng[1]);
    radiuses.push(checkpoint.radius);
  }

  let checkpoint_count = max(radiuses.length, 1);
  let average_radius = radiuses.reduce((a, b) => (a + b / checkpoint_count), 0);
  let offset = int(average_radius * 2.9);

  let top_left = L.GeometryUtil.destination(L.latLng([max(...lats), min(...lngs)]), 315, offset);
  let bottom_right = L.GeometryUtil.destination(L.latLng([min(...lats), max(...lngs)]), 135, offset);

  game.bounds = L.latLngBounds(top_left, bottom_right);


  game.start = function(time = undefined) {
    if (!!!time) {
      time = Date.now();
    }

    let team_names = Object.keys(this.team_colors);
    let players = Object.values(this.players);
    // TODO: Ignore self-defined teams first. Do custom team assignment after.
    for (let i = 0; i < players.length; i++) {
      players[i].role = newTeamProgressRole(this, team_names[i % team_names.length]);
    }

    
    let checkpoints = Object.values(this.checkpoints);
    for (let checkpoint of checkpoints) {
      checkpoint.progress = newTeamProgress(this.team_colors);
    }

    this.start_time = Date.now();
    this.status = "IN_PROGRESS";
  }

  game.get_teams_scores = function() {
    let checkpoints = game.checkpoints;
    let team_scores = deepcopy(Object.values(checkpoints)[0].progress.teams);

    for (let team of Object.values(team_scores)) {
      team.score = 0;
      team.captures = 0;
    }
    
    for (let checkpoint of Object.values(checkpoints)) {
      for (let team of Object.values(checkpoint.progress.teams)) {
        team_scores[team.team].score += team.score;
      }
      if (!!checkpoint.captured_by) {
        team_scores[checkpoint.captured_by.team].captures += 1;
      }
    }

    return team_scores;
  }


  game.get_ending_status = function(time = undefined) {
    if (!!!time) {
      time = Date.now();
    }

    let ending_status = {
      time: time,
      has_ended: false,
      end_condition: undefined,
      winning_team: undefined,
    };

    // Determinant Helpers
    const MAJORITY_PERCENTAGE = 0.5;
    const MAJORITY_WINNING_COUNT = max(1, ceil(Object.keys(game.checkpoints).length * MAJORITY_PERCENTAGE));

    let teams_scores = game.get_teams_scores();
    let max_score = Object.values(teams_scores)[0].score;
    for (let team of Object.values(teams_scores)) {
      max_score = max(max_score, team.score);
    }
    let max_captures = 0;
    for (let team of Object.values(teams_scores)) {
      max_captures = max(max_captures, team.captures);
    }

    let max_score_teams = {};
    let max_captures_teams = {};
    for (let team of Object.values(teams_scores)) {
      if (team.score == max_score) {
        max_score_teams[team.team] = team;
      }
      if (team.captures == max_captures) {
        max_captures_teams[team.team] = team;
      }
    }

    let score_winning_team = (Object.keys(max_score_teams).length == 1) ? 
    Object.values(max_score_teams)[0] : null;
    let single_max_captures_team = (Object.keys(max_captures_teams).length == 1) ? 
    Object.values(max_captures_teams)[0] : null;
    let capture_winning_team = ((!!single_max_captures_team) && 
    (single_max_captures_team.captures >= MAJORITY_WINNING_COUNT)) ?
    single_max_captures_team : null;



    // End Condition "TIMEOUT"
    if (time > game.start_time + game.duration * 60000) {
      ending_status = {
        has_ended: true,
        end_condition: "TIMEOUT",
        winning_team: score_winning_team,
      }
    }

    // END Condition "CHECKPOINT MAJORITY"
    else if (!!capture_winning_team) {
      ending_status = {
        has_ended: true,
        end_condition: "CHECKPOINT_MAJORITY",
        winning_team: capture_winning_team,
      }
    }

    else {
      pass();
    }

    return ending_status;
  }

  game.end = function(ending_status) {
    if (ending_status.has_ended) {
      this.ending_status = ending_status;
    }
  }

  return game;
}

// Screens
function newGameInitScreen(player) {
  let game_init = {
    name: "GameInit",
    globals: {
      checkpoints: [],
      host: player,
    },
    listeners: {
      checkpoint_click: undefined,
      on_game_create: undefined,
    },
    attachers: {
      checkpoint_click: {
        target_lmap: null,
        attachTo: undefined,
        remove: undefined,
      },
      on_game_create: {
        target_div: null,
        attachTo: undefined,
        remove: undefined,
      }
    },
    renderers: {
      checkpoints: {
        target_lmap: null,
        renderTo: undefined,
        unrender: undefined,
      },
      instructions: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      }
    },
    renders: {
      target_div: null,
      target_lmap: null,
      loadTo: undefined,
      unload: undefined,
    }
  }

  // Checkpoint Handlers
  game_init.renderers.checkpoints.renderTo = function(lmap) {
    this.target_lmap = lmap;
    for (let checkpoint of game_init.globals.checkpoints) {
      checkpoint.renders.renderTo(lmap);
      checkpoint.renders.rerender(checkpoint);
    }
  }

  game_init.renderers.checkpoints.unrender = function() {
    this.target_lmap = null;
    for (let checkpoint of game_init.globals.checkpoints) {
      checkpoint.renders.unrender();
    }
  }

  game_init.listeners.checkpoint_click = function(mouseEvent) {
    let latlng = mouseEvent.latlng;
    let latlng_array = [latlng.lat, latlng.lng];
    let removing_checkpoint = false;
    let result_checkpoints = [];

    let target_lmap = game_init.renderers.checkpoints.target_lmap;
    if (!!target_lmap) {
      game_init.renderers.checkpoints.unrender();
    }

    for (let checkpoint of game_init.globals.checkpoints) {
      if (latlng.distanceTo(L.latLng(checkpoint.latlng)) <= checkpoint.radius) {
        removing_checkpoint = true;
      }
      else {
        result_checkpoints.push(checkpoint);
      }
    }
  
    if (!removing_checkpoint) {
      result_checkpoints.push(
        newCheckpoint("?", latlng_array),
      );
    }
  
    for (let i = 0; i < result_checkpoints.length; i++) {
      result_checkpoints[i].name = ALPHABET[i % ALPHABET.length];
    }
  
    game_init.globals.checkpoints = result_checkpoints;

    if (!!target_lmap) {
      game_init.renderers.checkpoints.renderTo(target_lmap);
    }
  }

  game_init.attachers.checkpoint_click.target_lmap = null;
  game_init.attachers.checkpoint_click.attachTo = function(lmap) {
    this.target_lmap = lmap;
    lmap.on("click", game_init.listeners.checkpoint_click);
  }
  game_init.attachers.checkpoint_click.remove = function() {
    this.target_lmap.off("click", game_init.listeners.checkpoint_click);
    this.target_lmap = null;
  }

  // Instructions Handler
  game_init.renderers.instructions.message = createNode(`
  <div class="column is-three-quarters">
    <div class="box is-size-7" id="instructions-message">
      Click to add Checkpoints, click again to remove.<br>
      When finished, click "Create".<br>
      Long Press "Create" to cancel.
    </div>
  </div>
  `);

  game_init.renderers.instructions.createButton = createNode(`
  <div class="column is-one-quarter">
    <button class="button is-primary">Create</button>
  </div>
  `);

  game_init.renderers.instructions.container = createNode(`
  <div class="columns is-mobile is-vcentered">
  </div>
  `);

  game_init.renderers.instructions.container.appendChild(
    game_init.renderers.instructions.message);
  
  game_init.renderers.instructions.container.appendChild(
    game_init.renderers.instructions.createButton);
  
  game_init.renderers.instructions.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.container);
  }

  game_init.renderers.instructions.remove = function() {
    this.target_div = null;
    this.container.remove();
  }
  
  game_init.listeners.on_game_create = function(MouseEvent) {    
    let gid = randomString(5, "123456789");

    let checkpoints = {};
    for (let checkpoint of game_init.globals.checkpoints) {
      checkpoints[checkpoint.name] = checkpoint;
    }

    let team_colors = {
      "red": bulma_color("red"),
      "blue": bulma_color("blue"),
    }

    let players = {};
    players[game_init.globals.host.name] = game_init.globals.host;

    let game = newTeamProgressPendingGame(gid, 1, checkpoints, team_colors, players);

    game_init.globals.host.role = newTeamProgressRole(game, Object.keys(team_colors)[0], true);

    // Handler Change
    HANDLER.push({
      action: "CREATE_GAME",
      args: {game: game},
    });
  }

  game_init.attachers.on_game_create.addTo = function(node) {
    this.target_div = node;
    node.addEventListener("click", game_init.listeners.on_game_create);
  }

  game_init.attachers.on_game_create.remove = function() {
    this.target_div.removeEventListener("click", game_init.listeners.on_game_create);
    this.target_div = null;
  }

  game_init.renders.loadTo = function(node, lmap) {
    this.target_div = node;
    this.target_lmap = lmap;
    game_init.renderers.checkpoints.renderTo(lmap);
    game_init.attachers.checkpoint_click.attachTo(lmap);
    game_init.renderers.instructions.addTo(node);
    game_init.attachers.on_game_create.addTo(game_init.renderers.instructions.createButton);
  }

  game_init.renders.unload = function() {
    game_init.attachers.on_game_create.remove();
    game_init.renderers.instructions.remove();
    this.target_div = null;

    game_init.attachers.checkpoint_click.remove();
    game_init.renderers.checkpoints.unrender();
    this.target_lmap = null;
  }

  return game_init;
}

// Pending Game Room
function newPendingGameScreen(pending_game_object) {
  let pending_game = {
    name: "PendingGame",
    globals: {
      game: pending_game_object,
    },
    listeners: {
      on_game_start: undefined,
      // Todo: Non-host player on-click team change Listener
    },
    attachers: {
      on_game_start: {
        target_div: null,
        attachTo: undefined,
        remove: undefined,
      },
      // Todo: Non-host player on-click team change Listener
    },
    renderers: {
      checkpoints: {
        target_lmap: null,
        renderTo: undefined,
        unrender: undefined,
      },
      bounds: {
        target_lmap: null,
        renderTo: undefined,
        unrender: undefined,
      },
      game_info: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },
      players: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },
      start_button: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      }
    },
    renders: {
      target_div: null,
      target_lmap: null,
      loadTo: undefined,
      unload: undefined,
    }
  }

  // Aliases Caching
  let game = pending_game.globals.game;
  let players = game.players;
  let checkpoints = game.checkpoints;

  // Checkpoints
  pending_game.renderers.checkpoints.renderTo = function(lmap) {
    this.target_lmap = lmap;
    for (let checkpoint of Object.values(checkpoints)) {
      checkpoint.renders.renderTo(lmap);
    }
  }

  pending_game.renderers.checkpoints.unrender = function() {
    for (let checkpoint of Object.values(checkpoints)) {
      checkpoint.renders.unrender();
    }
  }

  // Bounds
  pending_game.renderers.bounds.rectangle = L.rectangle(game.bounds, {
    color: "#646E7D",
    fillOpacity: 0.1,
  });

  pending_game.renderers.bounds.renderTo = function(lmap) {
    this.target_lmap = lmap;
    this.rectangle.addTo(lmap);
  }

  pending_game.renderers.bounds.unrender = function() {
    this.rectangle.remove();
    this.target_lmap = null;
  }

  // Game Info
  pending_game.renderers.game_info.textbox = createNode(`
  <div class="box is-size-7 p-1 m-1" id="game_info_container">
    Game ID: <span class="is-family-monospace">${game.gid}</span> / 
    Mode: Team Progress / 
    Duration: ${game.duration}m /
    Teams: <span class="is-family-monospace">${Object.keys(game.team_colors).length}</span>
  </div>`);

  pending_game.renderers.game_info.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.textbox);
  }

  pending_game.renderers.game_info.remove = function() {
    this.textbox.remove();
    this.target_div = null;
  }

  // Players List
  pending_game.renderers.players.container = createNode(`<div class="container is-flex" id="players_container"></div>`);
  for (let player of Object.values(players)) {
    let is_host = (!!player?.role?.is_host);
    let flex_container = createNode(`<div class="is-flex m-1"></div>`);
    let box_render = (is_host ? newPlayerBoxRender(player, bulma_color("yellow")) : newPlayerBoxRender(player));
    box_render.addTo(flex_container);
    pending_game.renderers.players.container.appendChild(flex_container);
  }

  pending_game.renderers.players.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.container);
  }

  pending_game.renderers.players.remove = function() {
    this.container.remove();
    this.target_div = null;
  }

  // Start Button
  pending_game.renderers.start_button.button = 
  createNode(`<button class="button is-primary is-size-7" id="start_button">Start</button>`);

  pending_game.renderers.start_button.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.button);
  }

  pending_game.renderers.start_button.remove = function() {
    this.button.remove();
    this.target_div = null;
  }

  // On Game Start Listeners
  pending_game.listeners.on_game_start = function(mouseEvent) {
    HANDLER.push({
      action: "HOST_START_GAME",
      args: {
        game: pending_game.globals.game,
      },
    });
  }

  pending_game.attachers.on_game_start.attachTo = function(node) {
    this.target_div = node;
    node.addEventListener("click", pending_game.listeners.on_game_start);
  }

  pending_game.attachers.on_game_start.remove = function() {
    this.target_div.removeEventListener("click", pending_game.listeners.on_game_start);
    this.target_div = null;
  }

  // Renders
  pending_game.renders.loadTo = function(node, lmap) {
    this.target_div = node;
    pending_game.renderers.game_info.addTo(node);
    pending_game.renderers.start_button.addTo(node);
    pending_game.attachers.on_game_start.attachTo(pending_game.renderers.start_button.button);
    pending_game.renderers.players.addTo(node);

    this.target_lmap = lmap;
    pending_game.renderers.checkpoints.renderTo(lmap);
    pending_game.renderers.bounds.renderTo(lmap);

    lmap.panTo(pending_game.globals.game.bounds.getCenter());
  }  

  pending_game.renders.unload = function() {
    pending_game.renderers.game_info.remove();
    pending_game.attachers.on_game_start.remove();
    pending_game.renderers.start_button.remove();
    pending_game.renderers.players.remove();
    this.target_div = null;

    pending_game.renderers.checkpoints.unrender();
    pending_game.renderers.bounds.unrender();
    this.target_lmap = null;
  }

  return pending_game;
}

// Game Screen
function newTeamProgressGameScreen(teamProgressGame, player) {
  let game_screen = {
    name: "TeamProgressGame",
    globals: {
      game: teamProgressGame,
      player: player,
      active_checkpoint: null,
    },
    listeners: {
      on_clock_tick: undefined,
      on_checkpoint_visit: undefined,
      on_task_request: undefined,
      on_task_complete: undefined,
      on_task_cancel: undefined,
      on_window_message: undefined,
      game_end_listener: undefined,
      on_game_end: undefined,
      on_game_exit: undefined,
    },

    attachers: {
      on_clock_tick: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },

      on_checkpoint_visit: undefined, // Need to Attach on Geolocation Update

      on_task_request: {
        target_div: null,
        addToTarget: undefined,
        remove: undefined,
      },

      on_task_complete: null, // Called by HANDLER by GAME_CHECKPOINT_TASK_COMPLETED

      on_task_cancel: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },

      on_window_message: {
        is_attached: false,
        attach: undefined,
        detach: undefined,
      },

      on_game_end_detection: {  // Called by HANDLER by GAME_CHECKPOINT_TASK_COMPLETED
        is_attached: false,
        interval: null,
        attach: undefined,
        detach: undefined,
      },

      on_game_exit: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },

    },
    renderers: {
      bounds: {
        target_lmap: null,
        renderTo: undefined,
        unrender: undefined,
      },

      checkpoints: {
        target_lmap: null,
        renderTo: undefined,
        unrender: undefined,
        rerender: undefined,
      },

      game_info: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },

      checkpoint_dialog: {
        renders: null,
        target_div: null,
        addTo: undefined,
        remove: undefined,
        rerender: undefined,
      },

      bottom_container: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },

      task: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      },

      end_game_summary: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      }
    },

    renders: {
      target_div: null,
      target_lmap: null,
      loadTo: undefined,
      unload: undefined,
    },

    debug: {
      visit: undefined,
      task_ok: undefined,
    },
  };

  // Bounds Renders
  game_screen.renderers.bounds.rectangle = L.rectangle(game_screen.globals.game.bounds, {
    color: "#646E7D",
    fillOpacity: 0.1,
  });

  game_screen.renderers.bounds.renderTo = function(lmap) {
    this.target_lmap = lmap;
    this.rectangle.addTo(lmap);
  }

  game_screen.renderers.bounds.unrender = function() {
    this.rectangle.remove();
    this.target_lmap = null;
  }

  // Checkpoint and Progress Renders
  game_screen.renderers.checkpoints.renderTo = function(lmap) {
    this.target_lmap = lmap;
    let checkpoints = game_screen.globals.game.checkpoints;
    for (let checkpoint of Object.values(checkpoints)) {
      checkpoint.renders.renderTo(lmap);
      checkpoint.progress.renders.attachTo(checkpoint.renders.circle);
      checkpoint.progress.renders.rerender(checkpoint.progress); // Bug Hotfix: Update data before loading
    }
  }

  game_screen.renderers.checkpoints.unrender = function() {
    let checkpoints = game_screen.globals.game.checkpoints;
    for (let checkpoint of Object.values(checkpoints)) {
      checkpoint.progress.renders.unrender();
      checkpoint.renders.unrender();
    }
    this.target_lmap = null;
  }

  // Game Info Clock Ticks
  game_screen.listeners.on_clock_tick = function(node) {
    let end_time = game_screen.globals.game.start_time + (game_screen.globals.game.duration * 60000);
    let time_remaining = int((end_time - Date.now()) / 1000);
    let clock_string = "";

    if (time_remaining <= 0) {
      clock_string = "STOP";
    }

    else if (time_remaining <= 100) {
      clock_string = `${time_remaining}s`;
    }
    else {
      clock_string = `${int(time_remaining / 60)}m ${int(time_remaining % 60)}s`;
    }

    node.innerHTML = clock_string;
  }

  game_screen.attachers.on_clock_tick.addTo = function(node) {
    this.target_div = node;
    let on_clock_tick_lambda = () => {game_screen.listeners.on_clock_tick(this.target_div)};
    this.interval = setInterval(on_clock_tick_lambda, 1000);
  }

  game_screen.attachers.on_clock_tick.remove = function() {
    clearInterval(this.interval);
    this.target_div.innerHTML = "";
    this.target_div = null;
  }

  // Game Info renders
  game_screen.renderers.game_info.container = createNode(`<div class="box my-0"></div>`);

  game_screen.renderers.game_info.teams_scores_boxes = {
    newScoreBoxesRender: undefined,
    renders: undefined,
  }

  game_screen.renderers.game_info.teams_scores_boxes.newTeamsScoreBoxesRender = function(teams) {
    let renders = {
      team_max_score: Object.values(teams)[0].score,
      team_score_boxes: [],
      target_div: null,
      addTo: undefined,
      remove: undefined,
      rerender: undefined,
    };

    // Get Maximum Score for Lighted Boxes
    for (let team of Object.values(teams)) {
      renders.team_max_score = max(renders.team_max_score, team.score);
    }

    for (let team of Object.values(teams)) {
      let box_color = (team.score == renders.team_max_score) ? `has-background-${team.color}` : `has-background-${team.color}-dark`
      let box = createNode(`
      <div class="column">
      <div class="box ${box_color} has-text-centered has-text-light">${team.score}</div>
      </div>`);
      renders.team_score_boxes.push(box);
    }

    renders.addTo = function(node) {
      this.target_div = node;
      for (let box of this.team_score_boxes) {
        node.appendChild(box);
      }
    }

    renders.remove = function() {
      for (let box of this.team_score_boxes) {
        box.remove();
      }
      this.target_div = null;
    }

    renders.rerender = function(teams) {
      let target_div = this.target_div;
      this.remove();

      let new_render = game_screen.renderers.game_info.teams_scores_boxes.newTeamsScoreBoxesRender(teams);
      this.team_max_score = new_render.team_max_score;
      this.team_score_boxes = new_render.team_score_boxes;

      this.addTo(target_div);
    }

    return renders;
  }

  let teams_scores = game_screen.globals.game.get_teams_scores();
  game_screen.renderers.game_info.teams_scores_container = createNode(`<div class="columns is-mobile"></div>`);
  game_screen.renderers.game_info.teams_scores_boxes.renders = game_screen.renderers.game_info.teams_scores_boxes.newTeamsScoreBoxesRender(teams_scores);
  game_screen.renderers.game_info.teams_scores_boxes.renders.addTo(game_screen.renderers.game_info.teams_scores_container);
  game_screen.renderers.game_info.container.appendChild(game_screen.renderers.game_info.teams_scores_container);

  game_screen.renderers.game_info.clock_team_container = createNode(`<div class="columns is-mobile"></div>`);
  game_screen.renderers.game_info.clock = createNode(`<div class="column has-text-centered is-vcentered is-family-monospace">--:--</div>`);
  game_screen.renderers.game_info.clock_team_container.appendChild(game_screen.renderers.game_info.clock);

  let player_team = game_screen.globals.player.role.team;
  let player_team_color = game_screen.globals.game.team_colors[player_team];
  game_screen.renderers.game_info.team_name = 
  createNode(`<div class="column has-background-${player_team_color} has-text-centered has-text-light">Team ${player_team}</div>`)
  game_screen.renderers.game_info.clock_team_container.appendChild(game_screen.renderers.game_info.team_name);

  game_screen.renderers.game_info.container.appendChild(game_screen.renderers.game_info.clock_team_container);


  game_screen.renderers.game_info.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.container);
  }

  game_screen.renderers.game_info.remove = function() {
    this.container.remove();
    this.target_div = null;
  }

  // Checkpoint Visit
  game_screen.renderers.checkpoint_dialog.newCheckpointDialogRender = function(checkpoint = null, revisit = false, team = null) {
    let renders = {
      message_container: createNode(`<div class="message"></div>`),
      message_header:  createNode(`<div class="message-header">Checkpoint Dialog</div>`),
      message_body: createNode(`<div class="message-body"></div>`),
      team_bars_container: createNode(`<div class="columns is-mobile my-0"></div>`),
      status_string: undefined,
      task_request_button: undefined,
      target_div: null,
      addTo: undefined,
      remove: undefined,
    }

    if (!!checkpoint) {
      renders.message_header.innerHTML = `Checkpoint ${checkpoint.name}`;
    }
    renders.message_container.appendChild(renders.message_header);

    if (!!checkpoint?.progress) {
      for (let team of Object.values(checkpoint.progress.teams)) {
        let team_bar = createNode(`
        <div class="column">
          <progress class="progress is-${team.color}" 
          value="${team.score}" max="${checkpoint.progress.capture_score}">
          </progress>
        </div>`);
        renders.team_bars_container.appendChild(team_bar);
      }
      if (!!!checkpoint.progress.captured_by) {
        renders.message_body.appendChild(renders.team_bars_container);
      }
    }


    if (!!!checkpoint) {
      renders.status_string = createNode(`<p>Visit a checkpoint to capture.</p>`);
    }
    else if (!!checkpoint.progress.captured_by) {
      renders.status_string = createNode(`
      <p>Secured by Team 
        <i class="fas fa-lock"></i>
        <span class="has-text-light has-background-${checkpoint.progress.captured_by.color}>
          ${checkpoint.progress.captured_by.team}
        </span>
      </p>`);
    }
    else if (revisit) {
      renders.status_string = createNode(`
      <p class="is-size-7">
        <i class="fas fa-user-lock is-size-6"></i><br>
        Consecutive Visit - Go to another checkpoint to unlock.
      </p>
      `);
    }
    else if (!!team) {
      let score_now = checkpoint.progress.teams[team].score;
      let remaining_score = checkpoint.progress.capture_score - score_now;
      renders.status_string = createNode(`
      <p>${score_now}, ${remaining_score} to capture.</p>
      `);
    }
    else {
      renders.status_string = createNode(`
      <p>Available for capture.</p>`);
    }
    renders.message_body.appendChild(renders.status_string); 
    
    if (!!checkpoint?.progress?.captured_by || (!revisit && !!team)) {
      renders.task_request_button = createNode(`
      <button class="button is-primary">
        Request Task
      </button>`);
    }
    else {
      renders.task_request_button = createNode(`
      <button class="button is-light" disabled>
        Unavailable
      </button>
      `);
    }
    renders.message_body.appendChild(renders.task_request_button);

    renders.message_container.appendChild(renders.message_body);

    renders.addTo = function(node) {
      this.target_div = node;
      node.appendChild(renders.message_container);
    }

    renders.remove = function() {
      this.message_container.remove();
      this.target_div = null;
    }

    return renders;
  }

  game_screen.renderers.checkpoint_dialog.renders = game_screen.renderers.checkpoint_dialog.newCheckpointDialogRender();

  game_screen.renderers.checkpoint_dialog.addTo = function(node) {
    this.target_div = node;
    game_screen.renderers.checkpoint_dialog.renders.addTo(node);
  }

  game_screen.renderers.checkpoint_dialog.remove = function() {
    game_screen.renderers.checkpoint_dialog.renders.remove();
    this.target_div = null;
  }

  game_screen.renderers.checkpoint_dialog.rerender = function(checkpoint = null) {
    let target_div = this.target_div;
    this.remove();
    
    let player = game_screen.globals.player;
    let is_revisiting = (checkpoint?.name == player.role?.last_captured?.name);
    let player_team = player.role.team;
    
    this.renders = this.newCheckpointDialogRender(checkpoint, is_revisiting, player_team);
    this.addTo(target_div);
  }

  // On Checkpoint Visit Listeners
  game_screen.listeners.on_checkpoint_visit = function(checkpoint) {
    game_screen.globals.active_checkpoint = checkpoint;
    game_screen.renderers.checkpoint_dialog.rerender(checkpoint);

    // Attach Task Request Listeners
    if (!game_screen.renderers.checkpoint_dialog.renders.task_request_button.disabled) {
      game_screen.attachers.on_task_request.addToTarget(game_screen.renderers.checkpoint_dialog.renders.task_request_button);
    }
  }

  // Bottom Container
  game_screen.renderers.bottom_container.container = createNode(`<div class="container is-flex is-align-items-center pos_dc"></div>`);
  game_screen.renderers.bottom_container.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.container);
  }
  game_screen.renderers.bottom_container.remove = function() {
    this.container.remove();
    this.target_div = null;
  }

  // Task Dialog Render
  game_screen.renderers.task.modal = createNode(`<div class="modal is-active"></div>`);
  game_screen.renderers.task.modal_background = createNode(`<div class="modal-background"></div>`);
  game_screen.renderers.task.modal_content = createNode(`<div class="modal-content box"></div>`);
  game_screen.renderers.task.task_iframe = createNode(`<iframe frameborder="0"></iframe>`);
  game_screen.renderers.task.modal_close = createNode(`<button class="modal-close is-small ui-pass"></button>`);

  game_screen.renderers.task.modal.appendChild(game_screen.renderers.task.modal_background);
  game_screen.renderers.task.modal.appendChild(game_screen.renderers.task.modal_content);
  game_screen.renderers.task.modal.appendChild(game_screen.renderers.task.modal_close);
  game_screen.renderers.task.modal_content.appendChild(game_screen.renderers.task.task_iframe);


  game_screen.renderers.task.load_task = function(task_url) {
    game_screen.renderers.task.task_iframe.src = task_url;
    game_screen.renderers.task.task_iframe.contentWindow.postMessage("TASK_INIT", "*");
  }

  game_screen.renderers.task.addTo = function(node) {
    this.target_div = node;
    node.appendChild(this.modal);
    game_screen.attachers.on_task_cancel.addTo(this.modal_background);
    this.task_iframe.contentWindow.postMessage("TASK_LOAD", "*");
  }

  game_screen.renderers.task.remove = function() {
    this?.task_iframe?.contentWindow?.postMessage("TASK_CANCEL", "*");
    this.modal.remove();
    this.target_div = null;
  }

  // Task Listeners
  game_screen.listeners.on_task_request = function(node, task_index = null) {
    const TASK_URLS = [
      "./riddles/R1_REPEAT.html", 
      "./riddles/R2_FOLLOW.html",];

    task_index = (!!task_index) ? task_index : int(Math.random() * TASK_URLS.length);
    game_screen.renderers.task.addTo(node);
    game_screen.renderers.task.load_task(TASK_URLS[task_index]);
  }

  game_screen.attachers.on_task_request.addToTarget = function(attaching_node) {
    this.target_div = attaching_node;
    target_node = game_screen.renders.target_div;
    this.task_request_lambda = () => {game_screen.listeners.on_task_request(target_node)};
    attaching_node.addEventListener("click", this.task_request_lambda);
  }

  game_screen.attachers.on_task_request.remove = function() {
    this.target_div.removeEventListener("click", this.task_request_lambda);
    this.target_div = null;
  }

  game_screen.listeners.on_task_cancel = function() {
    game_screen.renderers.task.remove();
  }

  game_screen.attachers.on_task_cancel.addTo = function(node) {
    this.target_div = node;
    node.addEventListener("click", game_screen.listeners.on_task_cancel);
  }

  game_screen.attachers.on_task_cancel.remove = function() {
    this.target_div.removeEventListener("click", game_screen.listeners.on_task_cancel);
  }

  game_screen.listeners.on_task_complete = function() {
    game_screen.renderers.task.remove();

    let action_object = {
      action: "GAME_CHECKPOINT_TASK_COMPLETED",
      args: {
        gid: game_screen.globals.game.gid,
        time: Date.now(),
        player_name: game_screen.globals.player.name,
        checkpoint_name: game_screen.globals.active_checkpoint.name,
      },
    };

    HANDLER.push(action_object);
  }

  // Window Message Wrapper for Task Completion
  game_screen.listeners.on_window_message = function(messageEvent) {
    let message = messageEvent.data;
    if (message == "TASK_OK") {
      game_screen.listeners.on_task_complete();
    }
  };

  game_screen.attachers.on_window_message.attach = function() {
    this.is_attached = true;
    window.addEventListener("message", game_screen.listeners.on_window_message);
  }

  game_screen.attachers.on_window_message.detach = function() {
    window.removeEventListener("message", game_screen.listeners.on_window_message);
    this.is_attached = false;
  }

  game_screen.listeners.game_end_listener = function() {
    let ending_status = game_screen.globals.game.get_ending_status();
    if (ending_status.has_ended) {
      HANDLER.push({
        action: "GAME_ENDED",
        args: {
          gid: game_screen.globals.game.gid,
          ending_status: ending_status,
        }
      });
    }
  }

  game_screen.attachers.on_game_end_detection.attach = function() {
    this.is_attached = true;
    this.interval = setInterval(game_screen.listeners.game_end_listener, 2500);
  }

  game_screen.attachers.on_game_end_detection.detach = function() {
    clearInterval(this.interval);
    this.is_attached = false;
  }

  // Game End Renderers
  game_screen.renderers.end_game_summary = {
    newEndGameMessageRender: undefined,

    target_div: null,
    renders: {
      target_div: null,
      addTo: function(node) {
        this.target_div = node;
      },
      remove: pass,
    },
    addTo: undefined,
    remove: undefined,
  }

  game_screen.renderers.end_game_summary.newEndGameMessageRender = function(game, role) {
    let renders = {
      message_container: createNode(`<div class="message pos_cc" style="width: 80%;"></div>`),
      message_header: undefined,
      message_body: createNode(`<div class="message-body has-text-centered"></div>`),
      exit_button: createNode(`<button class="button is-dark">Back to Main</button>`),
      target_div: null,
      addTo: undefined,
      remove: undefined,
    };
    
    let player_has_won = (game.ending_status?.winning_team?.team == role.team);
    let no_winning_team = (!!!game.ending_status?.winning_team);
    let header_color = undefined;
    let header_text = undefined;

    // Message Header
    if (no_winning_team) {
      header_color = bulma_color("gray", false);
      header_text = "Undeterminant Game";
    }

    else if (player_has_won) {
      header_color = bulma_color("yellow", false);
      header_text = `<span class="icon fas fa-crown"></span>Victory!`;
    }

    else {
      header_color = bulma_color("red");
      header_text = `<span class="icon fas fa-heart-broken"></span>Defeat...`;
    }

    renders.message_header = 
    createNode(`<div class="message-header has-background-${header_color}">${header_text}</div>`);

    let team_scores = game.get_teams_scores();
    let contribution_percentage = int(role.score / max(1, team_scores[role.team].score * 100)); // Prevent DIV_0
    let calories_burnt = role.distance_travelled * 0.06213727366; // Average 100 calories per mile

    renders.message_text = 
    `Game ended by ${game.ending_status.end_condition}.<br>
    You contributed ${contribution_percentage}% to the team's total output.<br>
    During the game, you travelled ${role.distance_travelled}m,<br>
    Corresponding to ~${calories_burnt}cal burnt.<br>
    Well done!<br>`;
    renders.message_body.innerHTML = renders.message_text;

    renders.message_body.appendChild(renders.exit_button);

    renders.message_container.appendChild(renders.message_header);
    renders.message_container.appendChild(renders.message_body);


    // Rendering Handlers
    renders.addTo = function(node) {
      this.target_div = node;
      node.appendChild(this.message_container);
    }

    renders.remove = function() {
      this.message_container.remove();
      this.target_div = null;
    }

    return renders;
  }

  game_screen.renderers.end_game_summary.addTo = function(node) {
    this.target_div = node;
    this.renders.addTo(node);
  }

  game_screen.renderers.end_game_summary.remove = function() {
    if (!!this.renders) {
      this.renders.remove();
    }
  }

  game_screen.renderers.end_game_summary.rerender = function(game, role) {
    let target_div = this.renders.target_div;
    this.remove();
    this.renders = this.newEndGameMessageRender(game, role);
    this.addTo(target_div);
  }

  game_screen.listeners.on_game_end = function() {
    game_screen.attachers.on_game_end_detection.detach();
    game_screen.listeners.on_task_cancel();
    game_screen.renderers.checkpoint_dialog.remove();

    // End screen
    game_screen.renderers.end_game_summary.addTo(game_screen.renders.target_div);
    game_screen.renderers.end_game_summary.rerender(game_screen.globals.game, game_screen.globals.player.role);

    game_screen.attachers.on_game_exit.remove();
    game_screen.attachers.on_game_exit.addTo(game_screen.renderers.end_game_summary.renders.exit_button);
  }

  // On Game Exit
  game_screen.listeners.on_game_exit = function(mouseEvent) {
    let exit_action = {
      action: "GAME_EXIT",
      args: {
        player_name: game_screen.globals.player.name,
        // Should include more information, but for time-sake, ignore them now.
        // Depends on additional functionality.
      },
    };

    HANDLER.push(exit_action);

    game_screen.attachers.on_game_exit.remove();
    game_screen.renderers.end_game_summary.remove();
  }

  game_screen.attachers.on_game_exit.addTo = function(node) {
    this.target_div = node;
    node.addEventListener("click", game_screen.listeners.on_game_exit);
  }

  game_screen.attachers.on_game_exit.remove = function() {
    if (!!this.target_div) {
      this.target_div.removeEventListener("click", game_screen.listeners.on_game_exit);
      this.target_div = null;
    }
  }

  // Final Renders
  game_screen.renders.loadTo = function(node, lmap) {
    this.target_div = node;
    game_screen.renderers.game_info.addTo(game_screen.renderers.bottom_container.container);
    game_screen.renderers.checkpoint_dialog.addTo(game_screen.renderers.bottom_container.container);
    game_screen.renderers.bottom_container.addTo(node);

    game_screen.attachers.on_clock_tick.addTo(game_screen.renderers.game_info.clock);
    game_screen.attachers.on_window_message.attach();
    game_screen.attachers.on_game_end_detection.attach();

    this.target_lmap = lmap;
    game_screen.renderers.bounds.renderTo(lmap);
    game_screen.renderers.checkpoints.renderTo(lmap);
  }

  game_screen.renders.unload = function() {
    game_screen.renderers.game_info.remove();
    game_screen.renderers.checkpoint_dialog.remove();
    game_screen.renderers.bottom_container.remove();

    game_screen.attachers.on_clock_tick.remove();
    game_screen.attachers.on_window_message.detach();
    game_screen.attachers.on_game_end_detection.detach();
    this.target_div = null;

    game_screen.renderers.bounds.unrender();
    game_screen.renderers.checkpoints.unrender();
    this.target_lmap = null;
  }

  // For Testing Use Only. Remove in Production.
  game_screen.debug.visit = function(checkpoint_name) {
    game_screen.listeners.on_checkpoint_visit(game_screen.globals.game.checkpoints[checkpoint_name]);
  }

  game_screen.debug.task_ok = function() {
    game_screen.listeners.on_task_complete();
  }

  return game_screen;
}

// Starting Screen
function newStartMenuScreen(player) {
  let menu_screen = {
    name: "StartMenu",
    globals: {
      player: player,
    },

    renderers: {
      user_dropdown: {
        target_div: undefined,
        addTo: undefined,
        remove: undefined,
      },

      game_dropdown: {
        target_div: undefined,
        addTo: undefined,
        remove: undefined,
      }
    },

    listeners: {
      on_user_dropdown_toggle: undefined,
      on_game_dropdown_toggle: undefined,
      on_game_init: undefined,
    },

    attachers: {
      on_user_dropdown_toggle: {
        target_div: null,
        trigger_lambda: null,
        addTo: undefined,
        remove: undefined,
      },

      on_game_dropdown_toggle: {
        target_div: null,
        trigger_lambda: null,
        addTo: undefined,
        remove: undefined,
      },

      on_game_init: {
        target_div: null,
        addTo: undefined,
        remove: undefined,
      }
    },

    renders: {
      target_div: null,
      target_lmap: null,
      loadTo: undefined,
      unload: undefined,
    },
  };

  // Dropdown
  let u_dd = menu_screen.renderers.user_dropdown;
  u_dd.container = createNode(`<div class="dropdown is-up pos_dl"></div>`);
  
  // User Card
  u_dd.trigger = createNode(`<div class="dropdown-trigger"></div>`);
  u_dd.card = createNode(`<div class="button box m-2 p-1 is-flex"></div>`);
  u_dd.name = 
  createNode(
  `<div class="is-info has-text-right has-text-weight-medium">
  ${menu_screen.globals.player.name}
  </div>"`);
  u_dd.avatar = 
  createNode(
  `<figure class="image is-64x64 is-rounded">
  <img src="./avatars/th-c${menu_screen.globals.player.avatar_id}.png">
  </figure>`);

  u_dd.card.appendChild(u_dd.avatar);
  u_dd.card.appendChild(u_dd.name);  
  u_dd.trigger.appendChild(u_dd.card);

  // Dropdown Menu
  u_dd.menu = createNode(`<div class="dropdown-menu mx-1"></div>`);
  u_dd.content = createNode(`<div class="dropdown-content has-text-right"></div>`);
  u_dd.divider = createNode(`<hr class="dropdown-divider">`);
  u_dd.history_trigger = createNode(
    `<a class="dropdown-item"><i class="fas fa-book"></i> History</a>`);
  u_dd.friends_trigger = createNode(
    `<a class="dropdown-item"><i class="fas fa-user-friends"></i> Friends</a>`);
  u_dd.logout_trigger = createNode(
    `<a class="dropdown-item"><i class="fas fa-sign-out-alt"></i> Sign Out</a>`);
  
  u_dd.content.appendChild(u_dd.history_trigger);
  u_dd.content.appendChild(u_dd.friends_trigger);
  u_dd.content.appendChild(u_dd.divider);
  u_dd.content.appendChild(u_dd.logout_trigger);
  u_dd.menu.appendChild(u_dd.content);

  // Dropdown Assembly
  u_dd.container.appendChild(u_dd.trigger);
  u_dd.container.appendChild(u_dd.menu);
  
  // Dropdown Renders
  u_dd.addTo = function(node) {
    this.target_div = node;
    node.appendChild(u_dd.container);
  }

  u_dd.remove = function() {
    u_dd.container.remove();
    this.target_div = null;
  }

  // Dropdown Listeners
  menu_screen.listeners.on_user_dropdown_toggle = function(menu_node) {
    menu_node.classList.toggle("is-active");
  }

  menu_screen.attachers.on_user_dropdown_toggle.addTo = function(node) {
    this.target_div = node;
    this.trigger_lambda = () => {
      menu_screen.listeners.on_user_dropdown_toggle(u_dd.container);};
    node.addEventListener("click", this.trigger_lambda);
  }

  menu_screen.attachers.on_user_dropdown_toggle.remove = function() {
    this.target_div.removeEventListener("click", this.trigger_lambda);
    this.target_div = null;
  }


  // Game Start Dropdown
  let g_dd = menu_screen.renderers.game_dropdown;
  g_dd.container = createNode(`<div class="dropdown m-2 is-up is-right pos_dr"></div>`);

  // Trigger
  g_dd.trigger = createNode(`<div class="dropdown-trigger"></div>`);
  g_dd.circle = createNode(`
  <div class="button p-4 is-rounded is-primary">
    <i class="fas fa-running"></i>
  </div>`);

  g_dd.trigger.appendChild(g_dd.circle);

  // Game Start Dropdown
  g_dd.menu = createNode(`<div class="dropdown-menu has-text-right"></div>`);
  g_dd.join_game_trigger = createNode(
    `<a class="dropdown-item is-ghost px-0 inline-center">
      <span class="is-size-6 has-text-weight-medium has-text-dark">Join</span>
      <i class="button p-4 is-rounded fas fa-sign-in-alt"></i>
    </a>`);
  g_dd.create_game_trigger = createNode(
    `<a class="dropdown-item is-ghost px-0 inline-center">
    <span class="is-size-6 has-text-weight-medium has-text-dark">Create</span>
      <i class="button p-4 is-rounded fas fa-plus"></i>
    </a>`);
  
  g_dd.menu.appendChild(g_dd.join_game_trigger);
  g_dd.menu.appendChild(g_dd.create_game_trigger);
  
  // Game Dropdown Assembly
  g_dd.container.appendChild(g_dd.trigger);
  g_dd.container.appendChild(g_dd.menu);

  // Dropdown Renders
  g_dd.addTo = function(node) {
    this.target_div = node;
    node.appendChild(g_dd.container);
  }

  g_dd.remove = function() {
    g_dd.container.remove();
    this.target_div = null;
  }

  // Game Dropdown Listeners
  menu_screen.listeners.on_game_dropdown_toggle = function(game_node) {
    game_node.classList.toggle("is-active");
  }

  menu_screen.attachers.on_game_dropdown_toggle.addTo = function(node) {
    this.target_div = node;
    this.trigger_lambda = () => {menu_screen.listeners.on_game_dropdown_toggle(g_dd.container)};
    node.addEventListener("click", this.trigger_lambda);
  }

  menu_screen.attachers.on_game_dropdown_toggle.remove = function() {
    this.target_div.removeEventListener("click", this.trigger_lambda);
    this.target_div = null;
  }


  // On Game Create Listeners
  menu_screen.listeners.on_game_init = function() {
    let create_action = {
      action: "INIT_GAME",
      args: {
        player: menu_screen.globals.player,
      }
    };

    HANDLER.push(create_action);
  }

  menu_screen.attachers.on_game_init.addTo = function(node) {
    this.target_div = node;
    node.addEventListener("click", menu_screen.listeners.on_game_init);
  }

  menu_screen.attachers.on_game_init.remove = function() {
    this.target_div.removeEventListener("click", menu_screen.listeners.on_game_init);
    this.target_div = null;
  }


  // Final Renders
  menu_screen.renders.loadTo = function(node, lmap) {
    this.target_div = node;
    menu_screen.renderers.user_dropdown.addTo(node);
    menu_screen.renderers.game_dropdown.addTo(node);

    menu_screen.attachers.on_user_dropdown_toggle.addTo(menu_screen.renderers.user_dropdown.trigger);

    menu_screen.attachers.on_game_dropdown_toggle.addTo(menu_screen.renderers.game_dropdown.trigger);
    menu_screen.attachers.on_game_init.addTo(menu_screen.renderers.game_dropdown.create_game_trigger);

    this.target_lmap = lmap;
  }

  menu_screen.renders.unload = function() {
    menu_screen.attachers.on_user_dropdown_toggle.remove();
    menu_screen.attachers.on_game_dropdown_toggle.remove();

    menu_screen.renderers.user_dropdown.remove();
    menu_screen.renderers.game_dropdown.remove();
    this.target_div = null;

    this.target_lmap = null;
  }

  return menu_screen;
}

// Signal Handler
let HANDLER = {
  globals: {
    player: newPlayer("Player A", HONG_KONG, 10),
    game: null,

    app: document.getElementById("app"),
    ui_overlay: document.getElementById("ui-overlay"),
    lmap: undefined,
  },
  activeScreen: null,
  push: function(action_object) {}, // Push Command
  pushScreen: function(screen_object) {}, // Push Screen
  send: function(action_object) {},
}

HANDLER.push = function(action_object) {
  console.log("HANDLER: Received Action", action_object);
  let action = action_object.action;
  let args = action_object.args;
  let screen = this?.activeScreen;
  let screen_name = this?.activeScreen?.name;
  let screen_renders = this?.activeScreen?.renders;

  // Handlers
  if (action == "INIT_GAME") {
    HANDLER.pushScreen(newGameInitScreen(args.player));
  }

  else if (action == "CREATE_GAME") {
    let game = args.game;
    HANDLER.game = game;
    HANDLER.pushScreen(newPendingGameScreen(game));
  }

  else if (action == "HOST_START_GAME") {
    let game = args.game;
    let player = HANDLER.globals.player;
    game.start();
    HANDLER.pushScreen(newTeamProgressGameScreen(game, player));
  }

  else if (action == "GAME_CHECKPOINT_TASK_COMPLETED") {
    if ((screen_name == "TeamProgressGame") && (args.gid == screen.globals.game.gid)) {
      let player = screen.globals.game.players[args.player_name];
      let checkpoint = screen.globals.game.checkpoints[args.checkpoint_name];
      const POINTS_AWARDED = +1;
  
      player.role.score += POINTS_AWARDED;
      player.role.last_captured = checkpoint;
  
      checkpoint.progress.delta_score(player.role.team, POINTS_AWARDED);
      checkpoint.progress.update_status();
  
      screen.renderers.checkpoint_dialog.rerender(screen.globals.active_checkpoint);
      let teams_scores = screen.globals.game.get_teams_scores();
      screen.renderers.game_info.teams_scores_boxes.renders.rerender(teams_scores);

      screen.listeners.game_end_listener();
    }
  }

  else if (action == "GAME_ENDED") {
    if ((screen_name == "TeamProgressGame") && (args.gid == screen.globals.game.gid)) {
      screen.globals.game.end(args.ending_status);
      screen.listeners.on_game_end();
    }
  }

  else if (action == "GAME_EXIT") {
    let player = HANDLER.globals.player;
    HANDLER.pushScreen(newStartMenuScreen(player));
  }

  else {
    console.log("HANDLER: Missing Action Handler", action_object);
  }
}

HANDLER.pushScreen = function(screen_object, div = null, lmap = null) {
  console.log("HANDLER: Pushing Screen", screen_object);

  let activeScreenName = this?.activeScreen?.name;
  let activeScreenRender = this?.activeScreen?.renders;
  let target_div = activeScreenRender?.target_div || div;
  let target_lmap = activeScreenRender?.target_lmap || lmap;

  if (!!activeScreenRender?.unload) {
    activeScreenRender.unload();
  }

  if (!!target_div && !!target_lmap) {
    this.activeScreen = screen_object;
    this.activeScreen.renders.loadTo(target_div, target_lmap);
    this.activeScreen = screen_object;
    this.target_div = target_div;
    this.target_lmap = target_lmap;
    return true;
  }

  return false;
}

// Map
HANDLER.globals.lmap = L.map(MAP_DIV, {
  center: HONG_KONG,
  zoom: 13,
  minZoom: 13,
  tap: false,
});

HANDLER.globals.OSM_M = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

HANDLER.globals.OSM_M.addTo(HANDLER.globals.lmap);

// Main
player = HANDLER.globals.player;
app = HANDLER.globals.app;
ui_overlay = HANDLER.globals.ui_overlay;
lmap = HANDLER.globals.lmap;

ginit = newStartMenuScreen(player);
HANDLER.pushScreen(ginit, ui_overlay, lmap);

function s() {
  return HANDLER.activeScreen;
}